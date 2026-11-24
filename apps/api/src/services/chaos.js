import { createOrder } from './orders.js';
import { checkInvariants } from './invariants.js';
import { seedDatabase } from '../db/seed.js';
import { query } from '../db/index.js';

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

  // Execute all 50 concurrent buyers simultaneously
  const results = await Promise.all(buyerPromises);

  const succeeded = results.filter(r => r.success);
  const outOfStock = results.filter(r => !r.success && (r.code === 'OUT_OF_STOCK' || r.status === 409));
  const errors = results.filter(r => !r.success && r.code !== 'OUT_OF_STOCK' && r.status !== 409);

  // Read current inventory for sku-flash
  const invRes = await query(
    `SELECT * FROM inventory WHERE store_id = 'store-a' AND sku = 'sku-flash'`
  );
  const currentInv = invRes.rows[0];

  // Evaluate all invariants
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
