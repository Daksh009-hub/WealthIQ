import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/index.js';
import {
  runFlashSaleScenario,
  runAbandonedReservationsScenario,
  runDuplicateWebhooksScenario,
  runStoreFailureScenario
} from '../src/services/chaos.js';
import { checkInvariants } from '../src/services/invariants.js';

test('S1 Flash Sale Concurrency — 50 simultaneous buyers on stock 10', { timeout: 90000 }, async () => {
  const report = await runFlashSaleScenario({ autoReset: true });

  assert.equal(report.passed, true, 'Flash sale scenario must pass');
  assert.equal(report.actual.succeeded, 10, 'Exactly 10 buyers must successfully reserve stock');
  assert.equal(report.actual.outOfStock, 40, 'Exactly 40 buyers must be rejected with OUT_OF_STOCK');
  assert.equal(report.actual.errors, 0, 'Zero unexpected errors');
  assert.equal(report.actual.reserved, 10, 'Reserved stock must equal 10');
  assert.equal(report.actual.onHand, 10, 'On hand stock must remain 10');
  assert.equal(report.actual.invariantsGreen, true, 'All mathematical invariants must be green');
});

test('S2 Abandoned Reservations — TTL sweeper releases stock exactly once', { timeout: 90000 }, async () => {
  const res = await runAbandonedReservationsScenario({ autoReset: true });
  assert.equal(res.passed, true, 'S2 scenario must pass');
  assert.equal(res.actual.midReserved, 5, 'Initially 5 units must be reserved');
  assert.equal(res.actual.finalReserved, 0, 'After TTL, reserved must be restored to 0');
  assert.equal(res.actual.onHand, 10, 'On hand stock must remain 10');
  assert.equal(res.actual.invariantsGreen, true, 'All invariants must remain green');
});

test('S3 Duplicate Webhooks — idempotency prevents double charge', { timeout: 90000 }, async () => {
  const res = await runDuplicateWebhooksScenario({ autoReset: true });
  assert.equal(res.passed, true, 'S3 scenario must pass');
  assert.equal(res.actual.chargesRecorded, 1, 'Exactly 1 CHARGE ledger entry recorded');
  assert.equal(res.actual.duplicateEventsLogged, 5, 'All duplicate webhooks logged on timeline');
  assert.equal(res.actual.invariantsGreen, true, 'Money and order invariants must remain green');
});

test('S4 Store Failure Mid-Order — partial cancellation and refund with preservation', { timeout: 90000 }, async () => {
  const res = await runStoreFailureScenario({ autoReset: true });
  assert.equal(res.passed, true, 'S4 scenario must pass');
  assert.equal(res.actual.storeAFulfilment, 'DISPATCHED', 'Store A dispatched item must be preserved');
  assert.equal(res.actual.storeBFulfilment, 'ACCEPTED', 'Store B continuing item preserved');
  assert.equal(res.actual.storeCFulfilment, 'CANCELLED', 'Store C failed part cancelled');
  assert.equal(res.actual.storeCPayment, 'REFUNDED', 'Store C part refunded');
  assert.equal(res.actual.invariantsGreen, true, 'Invariants must be 100% green');
});

test('I1-I6 Invariant Verification — mathematical proof of money and stock conservation', { timeout: 30000 }, async () => {
  const report = await checkInvariants();
  assert.equal(report.ok, true, 'All invariants must be green');
  for (const inv of report.invariants) {
    assert.equal(inv.ok, true, `Invariant ${inv.id} (${inv.name}) must be green`);
  }
});

after(async () => {
  await pool.end();
});
