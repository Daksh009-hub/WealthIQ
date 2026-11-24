import { query } from '../db/index.js';
import { processWebhookEvent } from './webhooks.js';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:4100';

let reconcilerInterval = null;

export async function runReconciliationCycle() {
  try {
    // 1. Reconcile PENDING payments older than 10s (handles dropped webhooks)
    const pendingPayments = await query(`
      SELECT p.*, o.total_paise
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.status = 'PENDING'
        AND p.created_at < NOW() - INTERVAL '10 seconds'
      LIMIT 10
    `);

    for (const pay of pendingPayments.rows) {
      try {
        console.log(`[reconciler] Polling simulator for pending payment ${pay.provider_payment_id}...`);
        const simRes = await fetch(`${SIMULATOR_URL}/payments/${pay.provider_payment_id}`);
        if (simRes.ok) {
          const simPay = await simRes.json();
          if (simPay.status === 'CAPTURED') {
            console.log(`[reconciler] Payment ${pay.provider_payment_id} captured in gateway. Applying through webhook pipeline.`);
            await processWebhookEvent({
              eventId: `recon_${pay.provider_payment_id}_${Date.now()}`,
              type: 'payment.captured',
              paymentId: pay.provider_payment_id,
              orderId: pay.order_id,
              amountPaise: pay.amount_paise,
              occurredAt: new Date().toISOString(),
              source: 'reconciler'
            });
          }
        }
      } catch (err) {
        console.error(`[reconciler] Error checking payment ${pay.provider_payment_id}:`, err.message);
      }
    }

    // 2. Reconcile REQUESTED refunds older than 10s
    const pendingRefunds = await query(`
      SELECT r.*, s.order_id, p.provider_payment_id
      FROM refund_requests r
      JOIN sub_orders s ON r.sub_order_id = s.id
      LEFT JOIN payments p ON s.order_id = p.order_id
      WHERE r.status = 'REQUESTED'
        AND r.created_at < NOW() - INTERVAL '10 seconds'
      LIMIT 10
    `);

    for (const ref of pendingRefunds.rows) {
      try {
        console.log(`[reconciler] Retrying refund request for sub_order ${ref.sub_order_id}...`);
        const res = await fetch(`${SIMULATOR_URL}/refunds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: ref.provider_payment_id,
            subOrderId: ref.sub_order_id,
            amountPaise: ref.amount_paise,
            idempotencyKey: ref.idempotency_key
          })
        });
        if (res.ok) {
          const refData = await res.json();
          await processWebhookEvent({
            eventId: `recon_ref_${refData.refundId}_${Date.now()}`,
            type: 'refund.processed',
            paymentId: ref.provider_payment_id,
            refundId: refData.refundId,
            subOrderId: ref.sub_order_id,
            amountPaise: ref.amount_paise,
            occurredAt: new Date().toISOString(),
            source: 'reconciler'
          });
        }
      } catch (err) {
        console.error(`[reconciler] Error retrying refund for sub_order ${ref.sub_order_id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[reconciler] Cycle error:', err.message);
  }
}

export function startReconciler(intervalMs = 5000) {
  if (reconcilerInterval) return;
  console.log(`[reconciler] Starting financial reconciler every ${intervalMs}ms`);
  reconcilerInterval = setInterval(runReconciliationCycle, intervalMs);
}

export function stopReconciler() {
  if (reconcilerInterval) {
    clearInterval(reconcilerInterval);
    reconcilerInterval = null;
  }
}
