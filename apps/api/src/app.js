import express from 'express';
import cors from 'cors';
import { query } from './db/index.js';
import { createOrder, getAllOrders, getOrderById } from './services/orders.js';
import { checkInvariants } from './services/invariants.js';
import { seedDatabase } from './db/seed.js';
import { runFlashSaleScenario } from './services/chaos.js';

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
    const result = await query(
      'UPDATE stores SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Store not found' });
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
    const invariants = await checkInvariants();
    res.json({ message: 'Database reset and seeded successfully', invariants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chaos/scenarios/:name — run failure injection scenarios
app.post('/api/chaos/scenarios/:name', async (req, res) => {
  const { name } = req.params;
  try {
    if (name === 'flash-sale' || name === 'S1') {
      const report = await runFlashSaleScenario({ autoReset: req.body?.autoReset ?? false });
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
