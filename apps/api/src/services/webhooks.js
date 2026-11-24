import crypto from 'node:crypto';
import { getClient, query } from '../db/index.js';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'bussin_super_secret_hmac_key_2026';

export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || !rawBody) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

export async function processWebhookEvent(payload, rawSignature = null) {
  const { eventId, type, paymentId, orderId, refundId, subOrderId, amountPaise } = payload;
  if (!eventId || !type) {
    const err = new Error('Invalid webhook payload: missing eventId or type');
    err.status = 400;
    throw err;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Idempotent insertion into webhook_events
    const eventInsertRes = await client.query(
      `INSERT INTO webhook_events (event_id, type, provider_payment_id, payload, outcome, duplicate_count)
       VALUES ($1, $2, $3, $4, 'RECEIVED', 0)
       ON CONFLICT (event_id) DO UPDATE
       SET duplicate_count = webhook_events.duplicate_count + 1
       RETURNING duplicate_count, outcome`,
      [eventId, type, paymentId, JSON.stringify(payload)]
    );

    const isDuplicate = eventInsertRes.rows[0].duplicate_count > 0;
    if (isDuplicate) {
      // Duplicate webhook received: record timeline note and return 200 without re-executing
      console.log(`[webhook] Duplicate webhook ${eventId} ignored (duplicate count: ${eventInsertRes.rows[0].duplicate_count})`);

      // Find order_id associated with this payment
      const pRes = await client.query('SELECT order_id FROM payments WHERE provider_payment_id = $1', [paymentId]);
      const resolvedOrderId = orderId || (pRes.rowCount > 0 ? pRes.rows[0].order_id : null);

      if (resolvedOrderId) {
        await client.query(
          `INSERT INTO order_events
           (order_id, actor, event_type, message, details)
           VALUES ($1, 'payment-sim', 'WEBHOOK_DUPLICATE_IGNORED',
                   $2, $3)`,
          [
            resolvedOrderId,
            `Duplicate webhook ${type} (${eventId}) ignored — state already applied`,
            JSON.stringify({ eventId, type, duplicateCount: eventInsertRes.rows[0].duplicate_count })
          ]
        );
      }

      await client.query('COMMIT');
      return { status: 'ignored', reason: 'DUPLICATE_WEBHOOK', eventId };
    }

    // 2. Handle PAYMENT.CAPTURED
    if (type === 'payment.captured') {
      // Find payment record
      let targetOrderId = orderId;
      if (!targetOrderId) {
        const pRes = await client.query('SELECT order_id FROM payments WHERE provider_payment_id = $1', [paymentId]);
        if (pRes.rowCount > 0) targetOrderId = pRes.rows[0].order_id;
      }

      if (!targetOrderId) {
        await client.query('UPDATE webhook_events SET outcome = $1 WHERE event_id = $2', ['UNMATCHED_ORDER', eventId]);
        await client.query('COMMIT');
        return { status: 'unmatched', eventId };
      }

      // Lock order FOR UPDATE
      const orderLockRes = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [targetOrderId]
      );
      if (orderLockRes.rowCount === 0) {
        await client.query('COMMIT');
        return { status: 'not_found' };
      }

      const order = orderLockRes.rows[0];

      // Check if order already PAID (Stale/Duplicate webhook with different eventId)
      if (order.status === 'PAID') {
        console.log(`[webhook] Order ${targetOrderId} already PAID. Recording stale/duplicate webhook.`);
        await client.query(
          `INSERT INTO order_events
           (order_id, actor, event_type, message, details)
           VALUES ($1, 'payment-sim', 'WEBHOOK_STALE_IGNORED',
                   'Duplicate capture event ' || $2 || ' ignored — order already PAID', $3)`,
          [targetOrderId, eventId, JSON.stringify(payload)]
        );
        await client.query('UPDATE webhook_events SET outcome = $1 WHERE event_id = $2', ['STALE_IGNORED', eventId]);
        await client.query('COMMIT');
        return { status: 'ignored', reason: 'ALREADY_PAID', eventId };
      }

      // Check for Late Payment (Order already CANCELLED)
      if (order.status === 'CANCELLED') {
        console.log(`[webhook] Late payment for CANCELLED order ${targetOrderId}. Attempting re-reservation.`);

        // Fetch sub-order items to check if re-reservation is possible
        const itemsRes = await client.query(`
          SELECT i.id, i.sku, i.qty, s.store_id, s.id as sub_order_id
          FROM sub_order_items i
          JOIN sub_orders s ON i.sub_order_id = s.id
          WHERE s.order_id = $1
        `, [targetOrderId]);

        let canReReserve = true;
        for (const item of itemsRes.rows) {
          const checkRes = await client.query(
            `UPDATE inventory
             SET reserved = reserved + $1
             WHERE store_id = $2 AND sku = $3 AND (on_hand - reserved) >= $1
             RETURNING *`,
            [item.qty, item.store_id, item.sku]
          );
          if (checkRes.rowCount === 0) {
            canReReserve = false;
            break;
          }
        }

        if (canReReserve) {
          // Re-reservation succeeded! Reinstate order to PAID
          await client.query(
            `INSERT INTO ledger_entries (order_id, sub_order_id, type, amount_paise, provider_ref)
             VALUES ($1, NULL, 'CHARGE', $2, $3)
             ON CONFLICT (order_id) WHERE type='CHARGE' DO NOTHING`,
            [targetOrderId, order.total_paise, paymentId]
          );

          await client.query(
            `UPDATE sub_order_items SET reservation_status = 'COMMITTED'
             WHERE sub_order_id IN (SELECT id FROM sub_orders WHERE order_id = $1)`,
            [targetOrderId]
          );

          await client.query(
            `UPDATE sub_orders SET payment_state = 'PAID', fulfilment_state = 'PENDING'
             WHERE order_id = $1`,
            [targetOrderId]
          );

          await client.query(
            `UPDATE orders SET status = 'PAID' WHERE id = $1`,
            [targetOrderId]
          );

          await client.query(
            `INSERT INTO order_events
             (order_id, actor, event_type, from_state, to_state, message, details)
             VALUES ($1, 'system', 'LATE_PAYMENT_RE_RESERVED', 'CANCELLED', 'PAID',
                     'Late payment captured: stock re-reserved successfully', $2)`,
            [targetOrderId, JSON.stringify(payload)]
          );
        } else {
          // Re-reservation failed! Record CHARGE and immediately create REFUND requests (net money = 0)
          console.log(`[webhook] Late payment re-reservation failed for ${targetOrderId}. Creating auto-refund.`);
          await client.query(
            `INSERT INTO ledger_entries (order_id, sub_order_id, type, amount_paise, provider_ref)
             VALUES ($1, NULL, 'CHARGE', $2, $3)
             ON CONFLICT (order_id) WHERE type='CHARGE' DO NOTHING`,
            [targetOrderId, order.total_paise, paymentId]
          );

          // Get all sub-orders to create refunds
          const subOrdersRes = await client.query('SELECT id, total_paise FROM sub_orders WHERE order_id = $1', [targetOrderId]);
          for (const sub of subOrdersRes.rows) {
            const refundReqId = crypto.randomUUID();
            await client.query(
              `INSERT INTO refund_requests
               (id, sub_order_id, amount_paise, status, reason, idempotency_key)
               VALUES ($1, $2, $3, 'REQUESTED', 'Late payment out of stock auto-refund', $4)
               ON CONFLICT (sub_order_id) DO NOTHING`,
              [refundReqId, sub.id, sub.total_paise, `refund:${sub.id}`]
            );

            await client.query(
              `UPDATE sub_orders SET payment_state = 'REFUND_PENDING' WHERE id = $1`,
              [sub.id]
            );
          }

          await client.query(
            `INSERT INTO order_events
             (order_id, actor, event_type, from_state, to_state, message, details)
             VALUES ($1, 'system', 'LATE_PAYMENT_AUTO_REFUND_INITIATED', 'CANCELLED', 'CANCELLED',
                     'Late payment received after stock expired. Charge recorded and auto-refund initiated.', $2)`,
            [targetOrderId, JSON.stringify(payload)]
          );
        }

        await client.query('UPDATE webhook_events SET outcome = $1 WHERE event_id = $2', ['PROCESSED_LATE_PAYMENT', eventId]);
        await client.query('COMMIT');
        return { status: 'processed', latePayment: true, eventId };
      }

      // Normal path: Order is PENDING_PAYMENT
      // 1. Insert ledger CHARGE (unique index one_charge_per_order enforces single charge per order)
      await client.query(
        `INSERT INTO ledger_entries (order_id, sub_order_id, type, amount_paise, provider_ref)
         VALUES ($1, NULL, 'CHARGE', $2, $3)
         ON CONFLICT (order_id) WHERE type='CHARGE' DO NOTHING`,
        [targetOrderId, order.total_paise, paymentId]
      );

      // 2. Mark payments captured
      await client.query(
        `UPDATE payments SET status = 'CAPTURED' WHERE order_id = $1`,
        [targetOrderId]
      );

      // 3. Mark sub-orders PAID
      await client.query(
        `UPDATE sub_orders SET payment_state = 'PAID' WHERE order_id = $1`,
        [targetOrderId]
      );

      // 4. Mark reservations COMMITTED
      await client.query(
        `UPDATE sub_order_items
         SET reservation_status = 'COMMITTED'
         WHERE sub_order_id IN (SELECT id FROM sub_orders WHERE order_id = $1)
           AND reservation_status = 'ACTIVE'`,
        [targetOrderId]
      );

      // 5. Mark master order PAID
      await client.query(
        `UPDATE orders SET status = 'PAID' WHERE id = $1`,
        [targetOrderId]
      );

      // 6. Record timeline event
      await client.query(
        `INSERT INTO order_events
         (order_id, actor, event_type, from_state, to_state, message, details)
         VALUES ($1, 'payment-sim', 'PAYMENT_CAPTURED', 'PENDING_PAYMENT', 'PAID',
                 'Payment captured via webhook (provider ref: ' || $2 || ')', $3)`,
        [targetOrderId, paymentId, JSON.stringify(payload)]
      );

      await client.query('UPDATE webhook_events SET outcome = $1 WHERE event_id = $2', ['PROCESSED', eventId]);
      await client.query('COMMIT');
      return { status: 'processed', orderId: targetOrderId, eventId };
    }

    // 3. Handle REFUND.PROCESSED
    if (type === 'refund.processed') {
      const targetSubOrderId = subOrderId;
      if (!targetSubOrderId) {
        await client.query('COMMIT');
        return { status: 'missing_sub_order' };
      }

      const subLockRes = await client.query(
        'SELECT s.*, o.id as master_order_id FROM sub_orders s JOIN orders o ON s.order_id = o.id WHERE s.id = $1 FOR UPDATE',
        [targetSubOrderId]
      );
      if (subLockRes.rowCount === 0) {
        await client.query('COMMIT');
        return { status: 'sub_order_not_found' };
      }

      const subOrder = subLockRes.rows[0];

      // Insert ledger REFUND entry (unique partial index one_refund_per_sub_order enforces single refund)
      await client.query(
        `INSERT INTO ledger_entries (order_id, sub_order_id, type, amount_paise, provider_ref)
         VALUES ($1, $2, 'REFUND', $3, $4)
         ON CONFLICT (sub_order_id) WHERE type='REFUND' DO NOTHING`,
        [subOrder.order_id, targetSubOrderId, amountPaise || subOrder.total_paise, refundId]
      );

      // Confirm refund request
      await client.query(
        `UPDATE refund_requests
         SET status = 'CONFIRMED', confirmed_at = NOW(), provider_refund_id = $1
         WHERE sub_order_id = $2`,
        [refundId, targetSubOrderId]
      );

      // Update sub-order payment state to REFUNDED
      await client.query(
        `UPDATE sub_orders SET payment_state = 'REFUNDED' WHERE id = $1`,
        [targetSubOrderId]
      );

      // Timeline event
      await client.query(
        `INSERT INTO order_events
         (order_id, sub_order_id, actor, event_type, from_state, to_state, message, details)
         VALUES ($1, $2, 'payment-sim', 'REFUND_PROCESSED', 'REFUND_PENDING', 'REFUNDED',
                 'Refund of ₹' || ($3 / 100)::text || ' processed for store ' || $4, $5)`,
        [subOrder.order_id, targetSubOrderId, amountPaise || subOrder.total_paise, subOrder.store_id, JSON.stringify(payload)]
      );

      await client.query('UPDATE webhook_events SET outcome = $1 WHERE event_id = $2', ['PROCESSED', eventId]);
      await client.query('COMMIT');
      return { status: 'processed', subOrderId: targetSubOrderId, eventId };
    }

    await client.query('COMMIT');
    return { status: 'unhandled_type', type, eventId };
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[webhook] Webhook processing transaction failed:', err);
    throw err;
  } finally {
    client.release();
  }
}
