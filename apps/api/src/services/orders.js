import crypto from 'node:crypto';
import { getClient, query } from '../db/index.js';

const DEFAULT_TTL_SECONDS = parseInt(process.env.RESERVATION_TTL_SECONDS || '120', 10);

export async function createOrder({
  items,
  customerName = 'Guest Customer',
  idempotencyKey = null,
  ttlSeconds = DEFAULT_TTL_SECONDS
}) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error('Order must contain at least one item');
    err.status = 400;
    throw err;
  }

  // Validate item quantities and formats
  for (const item of items) {
    if (!item.storeId || !item.sku || !item.qty || item.qty <= 0) {
      const err = new Error(`Invalid item: ${JSON.stringify(item)}`);
      err.status = 400;
      throw err;
    }
  }

  // Deterministic order to prevent database deadlocks across concurrent carts
  const sortedItems = [...items].sort((a, b) => {
    if (a.storeId !== b.storeId) return a.storeId.localeCompare(b.storeId);
    return a.sku.localeCompare(b.sku);
  });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Idempotency check
    if (idempotencyKey) {
      const existingOrder = await client.query(
        'SELECT * FROM orders WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      if (existingOrder.rowCount > 0) {
        await client.query('COMMIT');
        return await getOrderById(existingOrder.rows[0].id);
      }
    }

    // Check store availability
    const uniqueStoreIds = [...new Set(sortedItems.map(i => i.storeId))];
    const storeStatusRes = await client.query(
      'SELECT id, status FROM stores WHERE id = ANY($1)',
      [uniqueStoreIds]
    );
    for (const store of storeStatusRes.rows) {
      if (store.status === 'DOWN') {
        const err = new Error(`Store ${store.id} is currently unavailable`);
        err.status = 409;
        err.code = 'STORE_DOWN';
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // Atomic reservation per item using conditional UPDATE
    const reservedItems = [];
    for (const item of sortedItems) {
      const res = await client.query(
        `UPDATE inventory
         SET reserved = reserved + $1
         WHERE store_id = $2 AND sku = $3 AND (on_hand - reserved) >= $1
         RETURNING price_paise, on_hand, reserved`,
        [item.qty, item.storeId, item.sku]
      );

      if (res.rowCount === 0) {
        // Out of stock -> entire cart must roll back atomically
        const err = new Error(`OUT_OF_STOCK: Insufficient available units for ${item.sku} at ${item.storeId}`);
        err.status = 409;
        err.code = 'OUT_OF_STOCK';
        err.details = { storeId: item.storeId, sku: item.sku, requestedQty: item.qty };
        await client.query('ROLLBACK');
        throw err;
      }

      reservedItems.push({
        ...item,
        unitPricePaise: res.rows[0].price_paise
      });
    }

    // Group reserved items by store for sub-orders
    const itemsByStore = {};
    for (const item of reservedItems) {
      if (!itemsByStore[item.storeId]) itemsByStore[item.storeId] = [];
      itemsByStore[item.storeId].push(item);
    }

    const orderId = crypto.randomUUID();
    let orderTotalPaise = 0;
    const subOrderRecords = [];

    const shippingPerStorePaise = 4000; // Flat ₹40 per store

    for (const [storeId, storeItems] of Object.entries(itemsByStore)) {
      const subOrderId = crypto.randomUUID();
      const subtotalPaise = storeItems.reduce((acc, i) => acc + (i.unitPricePaise * i.qty), 0);
      const totalPaise = subtotalPaise + shippingPerStorePaise;
      orderTotalPaise += totalPaise;

      subOrderRecords.push({
        subOrderId,
        storeId,
        subtotalPaise,
        shippingPaise: shippingPerStorePaise,
        totalPaise,
        items: storeItems
      });
    }

    // Insert master order
    await client.query(
      `INSERT INTO orders (id, idempotency_key, customer_name, total_paise, status, created_at)
       VALUES ($1, $2, $3, $4, 'PENDING_PAYMENT', NOW())`,
      [orderId, idempotencyKey, customerName, orderTotalPaise]
    );

    // Insert sub-orders and sub-order items
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    for (const sub of subOrderRecords) {
      await client.query(
        `INSERT INTO sub_orders
         (id, order_id, store_id, subtotal_paise, shipping_paise, total_paise, payment_state, fulfilment_state, needs_attention, version)
         VALUES ($1, $2, $3, $4, $5, $6, 'UNPAID', 'PENDING', false, 0)`,
        [sub.subOrderId, orderId, sub.storeId, sub.subtotalPaise, sub.shippingPaise, sub.totalPaise]
      );

      for (const item of sub.items) {
        const itemId = crypto.randomUUID();
        await client.query(
          `INSERT INTO sub_order_items
           (id, sub_order_id, sku, qty, unit_price_paise, reservation_status, reservation_expires_at)
           VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6)`,
          [itemId, sub.subOrderId, item.sku, item.qty, item.unitPricePaise, expiresAt]
        );
      }
    }

    // Insert timeline event
    await client.query(
      `INSERT INTO order_events
       (order_id, actor, event_type, from_state, to_state, message, details)
       VALUES ($1, 'customer', 'ORDER_CREATED', NULL, 'PENDING_PAYMENT', $2, $3)`,
      [
        orderId,
        `Order created across ${subOrderRecords.length} store(s) with active reservations (TTL ${ttlSeconds}s)`,
        JSON.stringify({
          stores: Object.keys(itemsByStore),
          itemsCount: reservedItems.length,
          totalPaise: orderTotalPaise,
          expiresAt
        })
      ]
    );

    await client.query('COMMIT');

    return await getOrderById(orderId);
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function getOrderById(orderId) {
  const orderRes = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (orderRes.rowCount === 0) return null;

  const order = orderRes.rows[0];

  const subOrdersRes = await query(
    `SELECT s.*, st.name as store_name
     FROM sub_orders s
     LEFT JOIN stores st ON s.store_id = st.id
     WHERE s.order_id = $1
     ORDER BY s.store_id`,
    [orderId]
  );

  const subOrders = subOrdersRes.rows;
  const subOrderIds = subOrders.map(s => s.id);

  let items = [];
  if (subOrderIds.length > 0) {
    const itemsRes = await query(
      `SELECT i.*, p.name as product_name
       FROM sub_order_items i
       LEFT JOIN products p ON i.sku = p.sku
       WHERE i.sub_order_id = ANY($1)
       ORDER BY i.sku`,
      [subOrderIds]
    );
    items = itemsRes.rows;
  }

  for (const sub of subOrders) {
    sub.items = items.filter(i => i.sub_order_id === sub.id);
  }

  const eventsRes = await query(
    `SELECT * FROM order_events WHERE order_id = $1 ORDER BY ts ASC, id ASC`,
    [orderId]
  );

  return {
    ...order,
    subOrders,
    timeline: eventsRes.rows
  };
}

export async function getAllOrders(limit = 50) {
  const res = await query(
    `SELECT o.*,
            COUNT(s.id)::int as sub_orders_count,
            ARRAY_AGG(DISTINCT s.store_id) as store_ids
     FROM orders o
     LEFT JOIN sub_orders s ON o.id = s.order_id
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function acceptSubOrder(subOrderId, actor = 'store') {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT * FROM sub_orders WHERE id = $1 FOR UPDATE', [subOrderId]);
    if (res.rowCount === 0) throw Object.assign(new Error('Sub-order not found'), { status: 404 });
    const sub = res.rows[0];

    if (sub.fulfilment_state !== 'PENDING') {
      throw Object.assign(new Error(`Cannot accept sub-order in fulfilment state ${sub.fulfilment_state}`), { status: 409 });
    }

    await client.query(
      `UPDATE sub_orders SET fulfilment_state = 'ACCEPTED', version = version + 1 WHERE id = $1`,
      [subOrderId]
    );

    await client.query(
      `INSERT INTO order_events (order_id, sub_order_id, actor, event_type, from_state, to_state, message)
       VALUES ($1, $2, $3, 'SUB_ORDER_ACCEPTED', 'PENDING', 'ACCEPTED', 'Sub-order accepted by store ' || $4)`,
      [sub.order_id, subOrderId, actor, sub.store_id]
    );

    await client.query('COMMIT');
    return await getOrderById(sub.order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function dispatchSubOrder(subOrderId, actor = 'store') {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT * FROM sub_orders WHERE id = $1 FOR UPDATE', [subOrderId]);
    if (res.rowCount === 0) throw Object.assign(new Error('Sub-order not found'), { status: 404 });
    const sub = res.rows[0];

    if (sub.payment_state !== 'PAID') {
      throw Object.assign(new Error(`Cannot dispatch unpaid sub-order (current payment state: ${sub.payment_state})`), { status: 409 });
    }
    if (sub.fulfilment_state !== 'ACCEPTED') {
      throw Object.assign(new Error(`Cannot dispatch sub-order not yet accepted (current fulfilment state: ${sub.fulfilment_state})`), { status: 409 });
    }

    // In one transaction: on_hand -= qty, reserved -= qty, reservation_status = 'FULFILLED'
    const itemsRes = await client.query('SELECT * FROM sub_order_items WHERE sub_order_id = $1', [subOrderId]);
    for (const item of itemsRes.rows) {
      await client.query(
        `UPDATE inventory
         SET on_hand = on_hand - $1, reserved = reserved - $1
         WHERE store_id = $2 AND sku = $3`,
        [item.qty, sub.store_id, item.sku]
      );

      await client.query(
        `UPDATE sub_order_items SET reservation_status = 'FULFILLED' WHERE id = $1`,
        [item.id]
      );
    }

    await client.query(
      `UPDATE sub_orders SET fulfilment_state = 'DISPATCHED', version = version + 1 WHERE id = $1`,
      [subOrderId]
    );

    await client.query(
      `INSERT INTO order_events (order_id, sub_order_id, actor, event_type, from_state, to_state, message)
       VALUES ($1, $2, $3, 'SUB_ORDER_DISPATCHED', 'ACCEPTED', 'DISPATCHED', 'Sub-order dispatched. Inventory fulfilled.')`,
      [sub.order_id, subOrderId, actor]
    );

    await client.query('COMMIT');
    return await getOrderById(sub.order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deliverSubOrder(subOrderId, actor = 'store') {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT * FROM sub_orders WHERE id = $1 FOR UPDATE', [subOrderId]);
    if (res.rowCount === 0) throw Object.assign(new Error('Sub-order not found'), { status: 404 });
    const sub = res.rows[0];

    if (sub.fulfilment_state !== 'DISPATCHED') {
      throw Object.assign(new Error(`Cannot deliver sub-order in state ${sub.fulfilment_state}`), { status: 409 });
    }

    await client.query(
      `UPDATE sub_orders SET fulfilment_state = 'DELIVERED', version = version + 1 WHERE id = $1`,
      [subOrderId]
    );

    await client.query(
      `INSERT INTO order_events (order_id, sub_order_id, actor, event_type, from_state, to_state, message)
       VALUES ($1, $2, $3, 'SUB_ORDER_DELIVERED', 'DISPATCHED', 'DELIVERED', 'Sub-order delivered to customer.')`,
      [sub.order_id, subOrderId, actor]
    );

    // Check if entire master order is now completed
    const allSubs = await client.query('SELECT fulfilment_state FROM sub_orders WHERE order_id = $1', [sub.order_id]);
    const allDone = allSubs.rows.every(s => ['DELIVERED', 'CANCELLED'].includes(s.fulfilment_state));
    if (allDone) {
      await client.query(`UPDATE orders SET status = 'COMPLETED' WHERE id = $1`, [sub.order_id]);
    }

    await client.query('COMMIT');
    return await getOrderById(sub.order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelSubOrder(subOrderId, actor = 'customer', reason = 'Customer requested cancellation') {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT * FROM sub_orders WHERE id = $1 FOR UPDATE', [subOrderId]);
    if (res.rowCount === 0) throw Object.assign(new Error('Sub-order not found'), { status: 404 });
    const sub = res.rows[0];

    if (['DISPATCHED', 'DELIVERED', 'CANCELLED'].includes(sub.fulfilment_state)) {
      throw Object.assign(new Error(`Cannot cancel sub-order in state ${sub.fulfilment_state}`), { status: 409 });
    }

    // Release unfulfilled reservations
    const itemsRes = await client.query(
      `SELECT * FROM sub_order_items WHERE sub_order_id = $1 AND reservation_status IN ('ACTIVE', 'COMMITTED')`,
      [subOrderId]
    );

    for (const item of itemsRes.rows) {
      await client.query(
        `UPDATE inventory SET reserved = reserved - $1 WHERE store_id = $2 AND sku = $3`,
        [item.qty, sub.store_id, item.sku]
      );
      await client.query(
        `UPDATE sub_order_items SET reservation_status = 'RELEASED' WHERE id = $1`,
        [item.id]
      );
    }

    let nextPaymentState = sub.payment_state;
    // If paid, create refund request
    if (sub.payment_state === 'PAID') {
      nextPaymentState = 'REFUND_PENDING';
      const refundId = crypto.randomUUID();
      await client.query(
        `INSERT INTO refund_requests (id, sub_order_id, amount_paise, status, reason, idempotency_key)
         VALUES ($1, $2, $3, 'REQUESTED', $4, $5)
         ON CONFLICT (sub_order_id) DO NOTHING`,
        [refundId, subOrderId, sub.total_paise, reason, `refund:${subOrderId}`]
      );
    }

    await client.query(
      `UPDATE sub_orders
       SET fulfilment_state = 'CANCELLED', payment_state = $1, version = version + 1
       WHERE id = $2`,
      [nextPaymentState, subOrderId]
    );

    await client.query(
      `INSERT INTO order_events (order_id, sub_order_id, actor, event_type, from_state, to_state, message, details)
       VALUES ($1, $2, $3, 'SUB_ORDER_CANCELLED', $4, 'CANCELLED', $5, $6)`,
      [
        sub.order_id,
        subOrderId,
        actor,
        sub.fulfilment_state,
        `Sub-order for ${sub.store_id} cancelled. ${sub.payment_state === 'PAID' ? 'Refund initiated.' : 'Reservations released.'}`,
        JSON.stringify({ reason })
      ]
    );

    // Update master order status
    const allSubs = await client.query('SELECT fulfilment_state FROM sub_orders WHERE order_id = $1', [sub.order_id]);
    const anyActive = allSubs.rows.some(s => ['PENDING', 'ACCEPTED', 'DISPATCHED', 'DELIVERED'].includes(s.fulfilment_state));
    if (!anyActive) {
      await client.query(`UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, [sub.order_id]);
    } else {
      await client.query(`UPDATE orders SET status = 'PARTIALLY_CANCELLED' WHERE id = $1`, [sub.order_id]);
    }

    await client.query('COMMIT');
    return await getOrderById(sub.order_id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelOrder(orderId, actor = 'customer', reason = 'Customer cancelled entire order') {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (orderRes.rowCount === 0) throw Object.assign(new Error('Order not found'), { status: 404 });
    const order = orderRes.rows[0];

    const subOrdersRes = await client.query('SELECT id, fulfilment_state FROM sub_orders WHERE order_id = $1', [orderId]);
    for (const sub of subOrdersRes.rows) {
      if (!['DISPATCHED', 'DELIVERED', 'CANCELLED'].includes(sub.fulfilment_state)) {
        await cancelSubOrder(sub.id, actor, reason);
      }
    }

    await client.query('COMMIT');
    return await getOrderById(orderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function handleStoreFailure(storeId) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Update store status to DOWN
    await client.query(`UPDATE stores SET status = 'DOWN', updated_at = NOW() WHERE id = $1`, [storeId]);

    // Fetch active sub-orders for this store in PENDING or ACCEPTED
    const subsRes = await client.query(
      `SELECT s.*, o.status as order_status
       FROM sub_orders s
       JOIN orders o ON s.order_id = o.id
       WHERE s.store_id = $1 AND s.fulfilment_state IN ('PENDING', 'ACCEPTED')
       FOR UPDATE OF s`,
      [storeId]
    );

    console.log(`[store-failure] Store ${storeId} went DOWN. Processing ${subsRes.rowCount} active sub-orders.`);

    for (const sub of subsRes.rows) {
      if (sub.payment_state === 'PAID') {
        // PAID sub-order: cancel and refund ONLY that store's part! Completed/other store sub-orders continue normally!
        // Release reservations for this store
        const items = await client.query(
          `SELECT * FROM sub_order_items WHERE sub_order_id = $1 AND reservation_status IN ('ACTIVE', 'COMMITTED')`,
          [sub.id]
        );
        for (const item of items.rows) {
          await client.query(
            `UPDATE inventory SET reserved = reserved - $1 WHERE store_id = $2 AND sku = $3`,
            [item.qty, storeId, item.sku]
          );
          await client.query(
            `UPDATE sub_order_items SET reservation_status = 'RELEASED' WHERE id = $1`,
            [item.id]
          );
        }

        // Create refund request for this sub-order
        const refundReqId = crypto.randomUUID();
        await client.query(
          `INSERT INTO refund_requests (id, sub_order_id, amount_paise, status, reason, idempotency_key)
           VALUES ($1, $2, $3, 'REQUESTED', 'Store outage automatic partial refund', $4)
           ON CONFLICT (sub_order_id) DO NOTHING`,
          [refundReqId, sub.id, sub.total_paise, `refund:${sub.id}`]
        );

        await client.query(
          `UPDATE sub_orders
           SET fulfilment_state = 'CANCELLED', payment_state = 'REFUND_PENDING', version = version + 1
           WHERE id = $1`,
          [sub.id]
        );

        await client.query(
          `INSERT INTO order_events
           (order_id, sub_order_id, actor, event_type, from_state, to_state, message, details)
           VALUES ($1, $2, 'chaos', 'STORE_OUTAGE_PARTIAL_CANCEL', $3, 'CANCELLED',
                   'Store ' || $4 || ' went offline. Sub-order cancelled and refund initiated. Completed fulfilment on other stores preserved.', $5)`,
          [sub.order_id, sub.id, sub.fulfilment_state, storeId, JSON.stringify({ storeId })]
        );
      } else {
        // UNPAID sub-order: cancel the whole order and release every reservation
        const allItems = await client.query(
          `SELECT i.*, s.store_id
           FROM sub_order_items i
           JOIN sub_orders s ON i.sub_order_id = s.id
           WHERE s.order_id = $1 AND i.reservation_status = 'ACTIVE'`,
          [sub.order_id]
        );
        for (const item of allItems.rows) {
          await client.query(
            `UPDATE inventory SET reserved = reserved - $1 WHERE store_id = $2 AND sku = $3`,
            [item.qty, item.store_id, item.sku]
          );
          await client.query(
            `UPDATE sub_order_items SET reservation_status = 'RELEASED' WHERE id = $1`,
            [item.id]
          );
        }

        await client.query(`UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, [sub.order_id]);
        await client.query(`UPDATE sub_orders SET fulfilment_state = 'CANCELLED' WHERE order_id = $1`, [sub.order_id]);

        await client.query(
          `INSERT INTO order_events
           (order_id, actor, event_type, from_state, to_state, message)
           VALUES ($1, 'chaos', 'ORDER_CANCELLED_STORE_OUTAGE', 'PENDING_PAYMENT', 'CANCELLED',
                   'Unpaid order cancelled due to store ' || $2 || ' outage')`,
          [sub.order_id, storeId]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

