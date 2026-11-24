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
