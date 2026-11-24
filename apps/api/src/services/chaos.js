import crypto from 'node:crypto';
import { createOrder, getOrderById, acceptSubOrder, dispatchSubOrder, handleStoreFailure } from './orders.js';
import { checkInvariants } from './invariants.js';
import { seedDatabase } from '../db/seed.js';
import { query } from '../db/index.js';
import { processWebhookEvent } from './webhooks.js';
import { sweepExpiredReservations } from './sweeper.js';

export async function runFlashSaleScenario({ autoReset = true } = {}) {
  if (autoReset) {
    await seedDatabase();
  }

  // Flash sale target: sku-flash at store-a has initial_stock = 10
  const BUYERS_COUNT = 50;
  const buyerPromises = [];
  const startTime = Date.now();

  for (let i = 1; i <= BUYERS_COUNT; i++) {
    const p = createOrder({
      items: [{ storeId: 'store-a', sku: 'sku-flash', qty: 1 }],
      customerName: `Buyer #${i.toString().padStart(2, '0')}`,
      idempotencyKey: `flash-sale-buyer-${i}-${startTime}`,
      ttlSeconds: 120
    }).then(order => {
      return { success: true, orderId: order.id, buyer: `Buyer #${i}` };
    }).catch(err => {
      return {
        success: false,
        code: err.code || 'ERROR',
        status: err.status || 500,
        message: err.message,
        buyer: `Buyer #${i}`
      };
    });

    buyerPromises.push(p);
  }

  const results = await Promise.all(buyerPromises);

  const succeeded = results.filter(r => r.success);
  const outOfStock = results.filter(r => !r.success && (r.code === 'OUT_OF_STOCK' || r.status === 409));
  const errors = results.filter(r => !r.success && r.code !== 'OUT_OF_STOCK' && r.status !== 409);

  const invRes = await query(
    `SELECT * FROM inventory WHERE store_id = 'store-a' AND sku = 'sku-flash'`
  );
  const currentInv = invRes.rows[0];
  const invariantReport = await checkInvariants();

  const passed =
    succeeded.length === 10 &&
    outOfStock.length === 40 &&
    errors.length === 0 &&
    currentInv.reserved === 10 &&
    currentInv.on_hand === 10 &&
    invariantReport.ok;

  return {
    scenarioId: 'S1',
    name: 'Flash Sale Concurrency (50 Buyers vs 10 Stock)',
    description: '50 concurrent buyers attempt to reserve 1 unit of scarce sku-flash (stock 10). Tests atomic reservation under race conditions.',
    durationMs: Date.now() - startTime,
    passed,
    expected: {
      succeeded: 10,
      outOfStock: 40,
      errors: 0,
      reserved: 10,
      onHand: 10,
      invariantsGreen: true
    },
    actual: {
      succeeded: succeeded.length,
      outOfStock: outOfStock.length,
      errors: errors.length,
      reserved: currentInv.reserved,
      onHand: currentInv.on_hand,
      invariantsGreen: invariantReport.ok
    },
    invariants: invariantReport.invariants,
    samples: {
      successOrders: succeeded.slice(0, 3).map(s => s.orderId),
      rejectionsSample: outOfStock.slice(0, 3).map(r => r.message)
    }
  };
}

export async function runAbandonedReservationsScenario({ autoReset = true } = {}) {
  if (autoReset) {
    await seedDatabase();
  }

  const startTime = Date.now();
  console.log('[scenario-s2] Creating 5 abandoned reservations with 3s TTL...');

  const orders = [];
  for (let i = 1; i <= 5; i++) {
    const order = await createOrder({
      items: [{ storeId: 'store-a', sku: 'sku-flash', qty: 1 }],
      customerName: `Abandoned Cart #${i}`,
      ttlSeconds: 3 // Short TTL
    });
    orders.push(order);
  }

  // Verify stock reserved
  const midRes = await query(`SELECT reserved FROM inventory WHERE store_id = 'store-a' AND sku = 'sku-flash'`);
  const midReserved = midRes.rows[0].reserved;

  // Wait 4 seconds for TTL expiration
  await new Promise(r => setTimeout(r, 4000));

  // Run sweeper to release expired reservations
  const releasedCount = await sweepExpiredReservations();
  console.log(`[scenario-s2] Sweeper released ${releasedCount} expired reservation items`);

  // Verify final inventory
  const finalRes = await query(`SELECT on_hand, reserved FROM inventory WHERE store_id = 'store-a' AND sku = 'sku-flash'`);
  const finalInv = finalRes.rows[0];

  const invariantReport = await checkInvariants();

  const passed =
    midReserved === 5 &&
    finalInv.reserved === 0 &&
    finalInv.on_hand === 10 &&
    invariantReport.ok;

  return {
    scenarioId: 'S2',
    name: 'Abandoned Reservations (TTL Expiry & Sweeper)',
    description: '5 reservations created with 3s TTL. No payment is made. Sweeper detects expiry, marks items EXPIRED, cancels orders, and fully restores reserved stock.',
    durationMs: Date.now() - startTime,
    passed,
    expected: {
      midReserved: 5,
      finalReserved: 0,
      onHand: 10,
      invariantsGreen: true
    },
    actual: {
      midReserved,
      finalReserved: finalInv.reserved,
      onHand: finalInv.on_hand,
      releasedCount,
      invariantsGreen: invariantReport.ok
    },
    invariants: invariantReport.invariants
  };
}

export async function runDuplicateWebhooksScenario({ autoReset = true } = {}) {
  if (autoReset) {
    await seedDatabase();
  }

  const startTime = Date.now();

  // Create order
  const order = await createOrder({
    items: [
      { storeId: 'store-a', sku: 'sku-phone', qty: 1 },
      { storeId: 'store-b', sku: 'sku-cable', qty: 1 }
    ],
    customerName: 'Duplicate Webhook Buyer',
    ttlSeconds: 120
  });

  const paymentId = 'pay_' + crypto.randomBytes(6).toString('hex');
  const eventId = 'evt_duplicate_test_' + Date.now();

  // Insert pending payment
  await query(
    `INSERT INTO payments (id, order_id, provider_payment_id, amount_paise, status)
     VALUES ($1, $2, $3, $4, 'PENDING')`,
    [crypto.randomUUID(), order.id, paymentId, order.total_paise]
  );

  // Send 5 webhooks with SAME event_id
  const duplicateResponses = [];
  for (let i = 0; i < 5; i++) {
    const res = await processWebhookEvent({
      eventId,
      type: 'payment.captured',
      paymentId,
      orderId: order.id,
      amountPaise: order.total_paise,
      occurredAt: new Date().toISOString()
    });
    duplicateResponses.push(res);
  }

  // Send another webhook with DIFFERENT event_id but SAME payment (stale/duplicate)
  const staleRes = await processWebhookEvent({
    eventId: eventId + '_alt',
    type: 'payment.captured',
    paymentId,
    orderId: order.id,
    amountPaise: order.total_paise,
    occurredAt: new Date().toISOString()
  });
  duplicateResponses.push(staleRes);

  // Check ledger entries for this order
  const ledgerRes = await query(
    `SELECT * FROM ledger_entries WHERE order_id = $1 AND type = 'CHARGE'`,
    [order.id]
  );

  const eventsRes = await query(
    `SELECT event_type, message FROM order_events WHERE order_id = $1`,
    [order.id]
  );

  const duplicateEventsLogged = eventsRes.rows.filter(e =>
    e.event_type === 'WEBHOOK_DUPLICATE_IGNORED' || e.event_type === 'WEBHOOK_STALE_IGNORED'
  );

  const invariantReport = await checkInvariants();

  const passed =
    ledgerRes.rowCount === 1 &&
    duplicateEventsLogged.length === 5 &&
    invariantReport.ok;

  return {
    scenarioId: 'S3',
    name: 'Duplicate Webhooks (Idempotent Ledger)',
    description: 'Sends 5 duplicate webhooks with identical eventId and 1 additional with distinct eventId for an already captured payment. Ensures single CHARGE and all repeats safely ignored with timeline audit logs.',
    durationMs: Date.now() - startTime,
    passed,
    expected: {
      chargesRecorded: 1,
      duplicateEventsLogged: 5,
      invariantsGreen: true
    },
    actual: {
      chargesRecorded: ledgerRes.rowCount,
      duplicateEventsLogged: duplicateEventsLogged.length,
      invariantsGreen: invariantReport.ok
    },
    invariants: invariantReport.invariants,
    details: {
      orderId: order.id,
      paymentId,
      chargeAmount: ledgerRes.rows[0]?.amount_paise
    }
  };
}

export async function runStoreFailureScenario({ autoReset = true } = {}) {
  if (autoReset) {
    await seedDatabase();
  }

  const startTime = Date.now();

  // Create a 3-store split order
  const order = await createOrder({
    items: [
      { storeId: 'store-a', sku: 'sku-phone', qty: 1 },
      { storeId: 'store-b', sku: 'sku-case', qty: 1 },
      { storeId: 'store-c', sku: 'sku-mouse', qty: 1 }
    ],
    customerName: 'Split Order Customer',
    ttlSeconds: 120
  });

  const paymentId = 'pay_split_' + crypto.randomBytes(6).toString('hex');
  await query(
    `INSERT INTO payments (id, order_id, provider_payment_id, amount_paise, status)
     VALUES ($1, $2, $3, $4, 'PENDING')`,
    [crypto.randomUUID(), order.id, paymentId, order.total_paise]
  );

  // Capture payment for whole order
  await processWebhookEvent({
    eventId: 'evt_pay_split_' + Date.now(),
    type: 'payment.captured',
    paymentId,
    orderId: order.id,
    amountPaise: order.total_paise,
    occurredAt: new Date().toISOString()
  });

  const updatedOrder = await getOrderById(order.id);
  const subA = updatedOrder.subOrders.find(s => s.store_id === 'store-a');
  const subB = updatedOrder.subOrders.find(s => s.store_id === 'store-b');
  const subC = updatedOrder.subOrders.find(s => s.store_id === 'store-c');

  // Store A accepts and dispatches
  await acceptSubOrder(subA.id);
  await dispatchSubOrder(subA.id);

  // Store B accepts
  await acceptSubOrder(subB.id);

  // Store C fails (goes DOWN midway)
  console.log('[scenario-s4] Injecting failure on Store C...');
  await handleStoreFailure('store-c');

  // Verify sub-order states after store C failure
  const orderAfterFailure = await getOrderById(order.id);
  const subAAfter = orderAfterFailure.subOrders.find(s => s.store_id === 'store-a');
  const subBAfter = orderAfterFailure.subOrders.find(s => s.store_id === 'store-b');
  const subCAfter = orderAfterFailure.subOrders.find(s => s.store_id === 'store-c');

  // Process refund for Store C
  const refundEventId = 'evt_ref_c_' + Date.now();
  await processWebhookEvent({
    eventId: refundEventId,
    type: 'refund.processed',
    paymentId,
    refundId: 'ref_' + crypto.randomBytes(6).toString('hex'),
    subOrderId: subC.id,
    amountPaise: subC.total_paise,
    occurredAt: new Date().toISOString()
  });

  const finalOrder = await getOrderById(order.id);
  const finalSubC = finalOrder.subOrders.find(s => s.store_id === 'store-c');

  // Ledger audit
  const charges = await query(`SELECT * FROM ledger_entries WHERE order_id = $1 AND type = 'CHARGE'`, [order.id]);
  const refunds = await query(`SELECT * FROM ledger_entries WHERE order_id = $1 AND type = 'REFUND'`, [order.id]);

  const invariantReport = await checkInvariants();

  const passed =
    subAAfter.fulfilment_state === 'DISPATCHED' && // A untouched and preserved
    subBAfter.fulfilment_state === 'ACCEPTED' &&   // B continues normally
    subCAfter.fulfilment_state === 'CANCELLED' &&  // C cancelled
    finalSubC.payment_state === 'REFUNDED' &&     // C refunded
    charges.rowCount === 1 &&
    refunds.rowCount === 1 &&
    refunds.rows[0].sub_order_id === subC.id &&
    refunds.rows[0].amount_paise === subC.total_paise &&
    invariantReport.ok;

  return {
    scenarioId: 'S4',
    name: 'Store Failure Mid-Order (Partial Cancellation & Preservation)',
    description: '3-store split order is paid. Store A dispatches, Store B accepts, Store C goes DOWN. Store C part is cancelled and refunded; Store A completed fulfilment is preserved; Store B continues normally. All invariants remain green.',
    durationMs: Date.now() - startTime,
    passed,
    expected: {
      storeAFulfilment: 'DISPATCHED',
      storeBFulfilment: 'ACCEPTED',
      storeCFulfilment: 'CANCELLED',
      storeCPayment: 'REFUNDED',
      refundAmountPaise: subC.total_paise,
      invariantsGreen: true
    },
    actual: {
      storeAFulfilment: subAAfter.fulfilment_state,
      storeBFulfilment: subBAfter.fulfilment_state,
      storeCFulfilment: subCAfter.fulfilment_state,
      storeCPayment: finalSubC.payment_state,
      refundAmountPaise: refunds.rows[0]?.amount_paise,
      invariantsGreen: invariantReport.ok
    },
    invariants: invariantReport.invariants
  };
}
