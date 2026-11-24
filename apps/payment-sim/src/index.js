import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.SIMULATOR_PORT || 4100;
const API_URL = process.env.API_URL || 'http://localhost:4000';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'bussin_super_secret_hmac_key_2026';

// In-memory state (acts as independent mock payment provider)
const payments = new Map();
const paymentsByIdempotency = new Map();
const refunds = new Map();
const refundsByIdempotency = new Map();
const sentEvents = [];

let chaosConfig = {
  delayMsMin: 200,
  delayMsMax: 500,
  duplicateCount: 1,
  dropProbability: 0,
  reorderProbability: 0
};

function signPayload(bodyStr) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(bodyStr).digest('hex');
}

async function sendWebhook(event, delayMs = 0) {
  setTimeout(async () => {
    // Drop chaos
    if (Math.random() < chaosConfig.dropProbability) {
      console.log(`[payment-sim] Chaos: DROPPED event ${event.eventId} (${event.type})`);
      return;
    }

    const bodyStr = JSON.stringify(event);
    const signature = signPayload(bodyStr);

    const duplicates = event.overrideDuplicateCount || chaosConfig.duplicateCount || 1;

    for (let i = 0; i < duplicates; i++) {
      const dispatchDelay = i === 0 ? 0 : 150 * i;
      setTimeout(async () => {
        try {
          console.log(`[payment-sim] Sending webhook ${event.type} (evt: ${event.eventId}, duplicate #${i + 1}/${duplicates})`);
          const res = await fetch(`${API_URL}/api/webhooks/payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-signature': signature
            },
            body: bodyStr
          });
          const data = await res.json().catch(() => ({}));
          console.log(`[payment-sim] Webhook response ${res.status}:`, data);
        } catch (err) {
          console.error(`[payment-sim] Failed to send webhook to API:`, err.message);
        }
      }, dispatchDelay);
    }
  }, delayMs);
}

// POST /payments — initiate payment
app.post('/payments', (req, res) => {
  const { orderId, amountPaise, idempotencyKey } = req.body;
  if (!orderId || !amountPaise) {
    return res.status(400).json({ error: 'Missing orderId or amountPaise' });
  }

  // Idempotency check
  if (idempotencyKey && paymentsByIdempotency.has(idempotencyKey)) {
    return res.json(paymentsByIdempotency.get(idempotencyKey));
  }

  const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
  const payment = {
    paymentId,
    orderId,
    amountPaise,
    status: 'CAPTURED', // Captured by bank, webhook pending
    createdAt: new Date().toISOString()
  };

  payments.set(paymentId, payment);
  if (idempotencyKey) paymentsByIdempotency.set(idempotencyKey, payment);

  // Prepare webhook event
  const eventId = 'evt_' + crypto.randomBytes(8).toString('hex');
  const event = {
    eventId,
    type: 'payment.captured',
    paymentId,
    orderId,
    amountPaise,
    occurredAt: new Date().toISOString()
  };
  sentEvents.push(event);

  const delay = Math.floor(
    Math.random() * (chaosConfig.delayMsMax - chaosConfig.delayMsMin + 1) + chaosConfig.delayMsMin
  );
  sendWebhook(event, delay);

  res.status(201).json({
    paymentId,
    status: 'PENDING',
    orderId,
    amountPaise
  });
});

// POST /refunds — initiate refund
app.post('/refunds', (req, res) => {
  const { paymentId, subOrderId, amountPaise, idempotencyKey } = req.body;
  if (!paymentId || !amountPaise) {
    return res.status(400).json({ error: 'Missing paymentId or amountPaise' });
  }

  if (idempotencyKey && refundsByIdempotency.has(idempotencyKey)) {
    return res.json(refundsByIdempotency.get(idempotencyKey));
  }

  const refundId = 'ref_' + crypto.randomBytes(8).toString('hex');
  const refund = {
    refundId,
    paymentId,
    subOrderId,
    amountPaise,
    status: 'PROCESSED',
    createdAt: new Date().toISOString()
  };

  refunds.set(refundId, refund);
  if (idempotencyKey) refundsByIdempotency.set(idempotencyKey, refund);

  // Prepare refund webhook event
  const eventId = 'evt_' + crypto.randomBytes(8).toString('hex');
  const event = {
    eventId,
    type: 'refund.processed',
    paymentId,
    refundId,
    subOrderId,
    amountPaise,
    occurredAt: new Date().toISOString()
  };
  sentEvents.push(event);

  sendWebhook(event, 200);

  res.status(201).json({
    refundId,
    status: 'PROCESSED',
    amountPaise
  });
});

// GET /payments/:id — query payment status (for reconciler)
app.get('/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
});

// GET /refunds/:id — query refund status (for reconciler)
app.get('/refunds/:id', (req, res) => {
  const refund = refunds.get(req.params.id);
  if (!refund) return res.status(404).json({ error: 'Refund not found' });
  res.json(refund);
});

// GET /chaos & PUT /chaos
app.get('/chaos', (req, res) => res.json(chaosConfig));
app.put('/chaos', (req, res) => {
  chaosConfig = { ...chaosConfig, ...req.body };
  res.json(chaosConfig);
});

// POST /webhooks/replay/:eventId — replay an event
app.post('/webhooks/replay/:eventId', (req, res) => {
  const event = sentEvents.find(e => e.eventId === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  sendWebhook(event, 0);
  res.json({ message: 'Event replay scheduled', event });
});

// Reset simulator memory (for tests)
app.post('/reset', (req, res) => {
  payments.clear();
  paymentsByIdempotency.clear();
  refunds.clear();
  refundsByIdempotency.clear();
  sentEvents.length = 0;
  res.json({ message: 'Payment simulator reset' });
});

app.listen(PORT, () => {
  console.log(`[payment-sim] Payment Simulator running on port ${PORT}`);
});
