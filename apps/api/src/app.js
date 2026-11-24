import express from 'express';
import cors from 'cors';
import { query } from './db/index.js';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  acceptSubOrder,
  dispatchSubOrder,
  deliverSubOrder,
  cancelSubOrder,
  cancelOrder,
  handleStoreFailure
} from './services/orders.js';
import { checkInvariants } from './services/invariants.js';
import { seedDatabase } from './db/seed.js';
import {
  runFlashSaleScenario,
  runAbandonedReservationsScenario,
  runDuplicateWebhooksScenario,
  runStoreFailureScenario
} from './services/chaos.js';
import { initiatePayment } from './services/payments.js';
import { processWebhookEvent, verifyWebhookSignature } from './services/webhooks.js';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:4100';

export const app = express();

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Role header middleware
app.use((req, res, next) => {
  req.role = req.headers['x-role'] || 'customer';
  next();
});

// GET /api/stores — list stores and statuses
app.get('/api/stores', async (req, res) => {
  try {
    const result = await query('SELECT * FROM stores ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stores/:id/status — toggle store status (AVAILABLE / DOWN)
app.post('/api/stores/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['AVAILABLE', 'DOWN'].includes(status)) {
    return res.status(400).json({ error: 'Status must be AVAILABLE or DOWN' });
  }

  try {
    if (status === 'DOWN') {
      await handleStoreFailure(id);
    } else {
      await query('UPDATE stores SET status = $1, updated_at = NOW() WHERE id = $2', ['AVAILABLE', id]);
    }
    const result = await query('SELECT * FROM stores WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory — live inventory across stores
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await query(`
      SELECT i.*,
             p.name AS product_name,
             s.name AS store_name,
             s.status AS store_status,
             (i.on_hand - i.reserved) AS available
      FROM inventory i
      JOIN products p ON i.sku = p.sku
      JOIN stores s ON i.store_id = s.id
      ORDER BY i.store_id, i.sku
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders — atomic multi-store reservation checkout
app.post('/api/orders', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
  const { items, customerName, ttlSeconds } = req.body;

  try {
    const order = await createOrder({
      items,
      customerName,
      idempotencyKey,
      ttlSeconds
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.code || 'ORDER_CREATION_FAILED',
      message: err.message,
      details: err.details
    });
  }
});

// GET /api/orders — list recent orders
app.get('/api/orders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const orders = await getAllOrders(limit);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id — order detail with sub-orders and timeline
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/pay — initiate payment via simulator
app.post('/api/orders/:id/pay', async (req, res) => {
  try {
    const payment = await initiatePayment(req.params.id);
    res.status(200).json(payment);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/orders/:id/cancel — cancel master order before dispatch
app.post('/api/orders/:id/cancel', async (req, res) => {
  try {
    const order = await cancelOrder(req.params.id, req.role, req.body?.reason);
    res.json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/sub-orders/:id/cancel — cancel individual store sub-order
app.post('/api/sub-orders/:id/cancel', async (req, res) => {
  try {
    const order = await cancelSubOrder(req.params.id, req.role, req.body?.reason);
    res.json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/sub-orders/:id/accept
app.post('/api/sub-orders/:id/accept', async (req, res) => {
  try {
    const order = await acceptSubOrder(req.params.id, req.role);
    res.json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/sub-orders/:id/dispatch
app.post('/api/sub-orders/:id/dispatch', async (req, res) => {
  try {
    const order = await dispatchSubOrder(req.params.id, req.role);
    res.json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/sub-orders/:id/deliver
app.post('/api/sub-orders/:id/deliver', async (req, res) => {
  try {
    const order = await deliverSubOrder(req.params.id, req.role);
    res.json(order);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/webhooks/payments — HMAC-verified asynchronous payment webhook handler
app.post('/api/webhooks/payments', async (req, res) => {
  const signature = req.headers['x-signature'];
  // Verify HMAC signature
  if (!verifyWebhookSignature(req.rawBody, signature)) {
    console.warn('[webhook] Rejected invalid HMAC signature:', signature);
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  try {
    const result = await processWebhookEvent(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('[webhook] Processing error:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/staff/attention — needs attention queue
app.get('/api/staff/attention', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, o.customer_name, r.id as refund_request_id, r.status as refund_status, r.reason as refund_reason
      FROM sub_orders s
      JOIN orders o ON s.order_id = o.id
      LEFT JOIN refund_requests r ON s.id = r.sub_order_id
      WHERE s.needs_attention = true OR r.status = 'REQUESTED'
      ORDER BY s.order_id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/refunds/:subOrderId/retry — retry failed or requested refund
app.post('/api/staff/refunds/:subOrderId/retry', async (req, res) => {
  const { subOrderId } = req.params;
  try {
    const subRes = await query(`
      SELECT s.*, r.amount_paise, p.provider_payment_id
      FROM sub_orders s
      JOIN refund_requests r ON s.id = r.sub_order_id
      LEFT JOIN payments p ON s.order_id = p.order_id
      WHERE s.id = $1
    `, [subOrderId]);

    if (subRes.rowCount === 0) return res.status(404).json({ error: 'Refund request not found' });
    const sub = subRes.rows[0];

    const simRes = await fetch(`${SIMULATOR_URL}/refunds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: sub.provider_payment_id,
        subOrderId,
        amountPaise: sub.amount_paise,
        idempotencyKey: `retry_refund_${subOrderId}_${Date.now()}`
      })
    });
    const simData = await simRes.json();
    res.json(simData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invariants — evaluate all business, money, and inventory invariants
app.get('/api/invariants', async (req, res) => {
  try {
    const report = await checkInvariants();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/reset — re-seed database to initial state
app.post('/api/admin/reset', async (req, res) => {
  try {
    await seedDatabase();
    // Also reset payment simulator
    await fetch(`${SIMULATOR_URL}/reset`, { method: 'POST' }).catch(() => {});
    const invariants = await checkInvariants();
    res.json({ message: 'Database reset and seeded successfully', invariants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chaos config proxy (GET & PUT)
app.get('/api/chaos/config', async (req, res) => {
  try {
    const simRes = await fetch(`${SIMULATOR_URL}/chaos`);
    res.json(await simRes.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/chaos/config', async (req, res) => {
  try {
    const simRes = await fetch(`${SIMULATOR_URL}/chaos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    res.json(await simRes.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chaos/scenarios/:name — run failure injection scenarios
app.post('/api/chaos/scenarios/:name', async (req, res) => {
  const { name } = req.params;
  const autoReset = req.body?.autoReset ?? false;
  try {
    if (name === 'flash-sale' || name === 'S1') {
      const report = await runFlashSaleScenario({ autoReset });
      return res.json(report);
    }
    if (name === 'abandoned' || name === 'S2') {
      const report = await runAbandonedReservationsScenario({ autoReset });
      return res.json(report);
    }
    if (name === 'duplicate-webhooks' || name === 'S3') {
      const report = await runDuplicateWebhooksScenario({ autoReset });
      return res.json(report);
    }
    if (name === 'store-failure' || name === 'S4') {
      const report = await runStoreFailureScenario({ autoReset });
      return res.json(report);
    }
    res.status(404).json({ error: `Unknown scenario: ${name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bussin-api', time: new Date().toISOString() });
});
