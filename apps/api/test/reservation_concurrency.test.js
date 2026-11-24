import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { seedDatabase } from '../src/db/seed.js';
import { runFlashSaleScenario } from '../src/services/chaos.js';
import { checkInvariants } from '../src/services/invariants.js';
import { pool } from '../src/db/index.js';

test('S1 Flash Sale Concurrency — 50 simultaneous buyers on stock 10', { timeout: 90000 }, async () => {
  await seedDatabase();

  const report = await runFlashSaleScenario({ autoReset: false });

  assert.equal(report.passed, true, 'Flash sale scenario must pass');
  assert.equal(report.actual.succeeded, 10, 'Exactly 10 buyers must successfully reserve stock');
  assert.equal(report.actual.outOfStock, 40, 'Exactly 40 buyers must be rejected with OUT_OF_STOCK');
  assert.equal(report.actual.errors, 0, 'Zero unexpected errors');
  assert.equal(report.actual.reserved, 10, 'Reserved stock must equal 10');
  assert.equal(report.actual.onHand, 10, 'On hand stock must remain 10');
  assert.equal(report.actual.invariantsGreen, true, 'All mathematical invariants must be green');

  const invariantReport = await checkInvariants();
  assert.equal(invariantReport.ok, true, 'System-wide invariants must be valid');
});

after(async () => {
  await pool.end();
});
