import crypto from 'node:crypto';
import { getClient, query } from '../db/index.js';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:4100';

export async function initiatePayment(orderId) {
  const orderRes = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (orderRes.rowCount === 0) {
    const err = new Error('Order not found');
    err.status = 404;
    throw err;
  }

  const order = orderRes.rows[0];
  if (order.status !== 'PENDING_PAYMENT') {
    const err = new Error(`Cannot pay order in status ${order.status}`);
    err.status = 409;
    throw err;
  }

  // Check if a payment is already pending or captured
  const existingPay = await query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
  if (existingPay.rowCount > 0 && existingPay.rows[0].status === 'CAPTURED') {
    const err = new Error('Order is already paid');
    err.status = 409;
    throw err;
  }

  // Call payment simulator
  let simData;
  try {
    const res = await fetch(`${SIMULATOR_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amountPaise: order.total_paise,
        idempotencyKey: `pay_order_${orderId}`
      })
    });
    simData = await res.json();
    if (!res.ok) {
      throw new Error(simData.error || 'Payment gateway error');
    }
  } catch (err) {
    console.error('[payments] Gateway call failed:', err.message);
    const error = new Error('Payment gateway unavailable: ' + err.message);
    error.status = 502;
    throw error;
  }

  // Insert or update payment record
  const paymentRecordId = crypto.randomUUID();
  await query(
    `INSERT INTO payments (id, order_id, provider_payment_id, amount_paise, status, created_at)
     VALUES ($1, $2, $3, $4, 'PENDING', NOW())
     ON CONFLICT (provider_payment_id) DO UPDATE SET status = 'PENDING'
     RETURNING *`,
    [paymentRecordId, orderId, simData.paymentId, order.total_paise]
  );

  await query(
    `INSERT INTO order_events
     (order_id, actor, event_type, from_state, to_state, message, details)
     VALUES ($1, 'payment-sim', 'PAYMENT_INITIATED', 'PENDING_PAYMENT', 'PENDING_PAYMENT',
             'Payment initiated with provider ref ' || $2, $3)`,
    [orderId, simData.paymentId, JSON.stringify(simData)]
  );

  return {
    orderId,
    paymentId: simData.paymentId,
    amountPaise: order.total_paise,
    status: 'PENDING'
  };
}
