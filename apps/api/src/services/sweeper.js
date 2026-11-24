import { getClient } from '../db/index.js';

let sweeperInterval = null;

export async function sweepExpiredReservations() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Lock and fetch ACTIVE reservations that have expired
    const expiredRes = await client.query(`
      SELECT i.id, i.sub_order_id, i.sku, i.qty, s.store_id, s.order_id
      FROM sub_order_items i
      JOIN sub_orders s ON i.sub_order_id = s.id
      WHERE i.reservation_status = 'ACTIVE'
        AND i.reservation_expires_at < NOW()
      FOR UPDATE OF i SKIP LOCKED
    `);

    if (expiredRes.rowCount === 0) {
      await client.query('COMMIT');
      return 0;
    }

    const expiredItems = expiredRes.rows;
    console.log(`[sweeper] Found ${expiredItems.length} expired reservation items to release`);

    // 2. Mark each as EXPIRED and decrement inventory.reserved
    // Status flip is the guard against duplicate decrements
    for (const item of expiredItems) {
      await client.query(
        `UPDATE sub_order_items
         SET reservation_status = 'EXPIRED'
         WHERE id = $1`,
        [item.id]
      );

      await client.query(
        `UPDATE inventory
         SET reserved = reserved - $1
         WHERE store_id = $2 AND sku = $3`,
        [item.qty, item.store_id, item.sku]
      );
    }

    // 3. Check affected orders: if all items are EXPIRED and order is PENDING_PAYMENT, mark order CANCELLED
    const orderIds = [...new Set(expiredItems.map(i => i.order_id))];
    for (const orderId of orderIds) {
      const activeItemsRes = await client.query(
        `SELECT COUNT(*)::int as count
         FROM sub_order_items i
         JOIN sub_orders s ON i.sub_order_id = s.id
         WHERE s.order_id = $1 AND i.reservation_status IN ('ACTIVE', 'COMMITTED')`,
        [orderId]
      );

      if (activeItemsRes.rows[0].count === 0) {
        await client.query(
          `UPDATE orders
           SET status = 'CANCELLED'
           WHERE id = $1 AND status = 'PENDING_PAYMENT'`,
          [orderId]
        );

        await client.query(
          `UPDATE sub_orders
           SET fulfilment_state = 'CANCELLED'
           WHERE order_id = $1 AND fulfilment_state = 'PENDING'`,
          [orderId]
        );

        await client.query(
          `INSERT INTO order_events
           (order_id, actor, event_type, from_state, to_state, message, details)
           VALUES ($1, 'system', 'ORDER_CANCELLED_EXPIRED', 'PENDING_PAYMENT', 'CANCELLED',
                   'All reservations expired without payment. Inventory released.', $2)`,
          [orderId, JSON.stringify({ expiredItemsCount: expiredItems.filter(i => i.order_id === orderId).length })]
        );
      }
    }

    await client.query('COMMIT');
    return expiredItems.length;
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('[sweeper] Error releasing expired reservations:', err);
    return 0;
  } finally {
    client.release();
  }
}

export function startSweeper(intervalMs = 2000) {
  if (sweeperInterval) return;
  console.log(`[sweeper] Starting abandoned reservation sweeper every ${intervalMs}ms`);
  sweeperInterval = setInterval(async () => {
    try {
      await sweepExpiredReservations();
    } catch (err) {
      console.error('[sweeper] Interval error:', err);
    }
  }, intervalMs);
}

export function stopSweeper() {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
    sweeperInterval = null;
  }
}
