import { query } from '../db/index.js';

export async function checkInvariants() {
  const results = [];

  // I1 Stock bounds: 0 <= reserved <= on_hand
  try {
    const res = await query(`
      SELECT store_id, sku, initial_stock, on_hand, reserved
      FROM inventory
      WHERE reserved < 0 OR on_hand < 0 OR reserved > on_hand;
    `);
    const ok = res.rowCount === 0;
    results.push({
      id: 'I1',
      name: 'Stock bounds (0 <= reserved <= on_hand)',
      ok,
      details: ok
        ? 'All inventory rows satisfy 0 <= reserved <= on_hand.'
        : `Violations found in ${res.rowCount} row(s): ${JSON.stringify(res.rows)}`
    });
  } catch (err) {
    results.push({ id: 'I1', name: 'Stock bounds', ok: false, details: err.message });
  }

  // I2 Reservation integrity: reserved equals sum of ACTIVE + COMMITTED reservations
  try {
    const res = await query(`
      WITH item_reservations AS (
        SELECT s.store_id, i.sku, COALESCE(SUM(i.qty), 0)::int AS calculated_reserved
        FROM sub_order_items i
        JOIN sub_orders s ON i.sub_order_id = s.id
        WHERE i.reservation_status IN ('ACTIVE', 'COMMITTED')
        GROUP BY s.store_id, i.sku
      )
      SELECT inv.store_id, inv.sku, inv.reserved AS actual_reserved,
             COALESCE(r.calculated_reserved, 0) AS expected_reserved
      FROM inventory inv
      LEFT JOIN item_reservations r ON inv.store_id = r.store_id AND inv.sku = r.sku
      WHERE inv.reserved != COALESCE(r.calculated_reserved, 0);
    `);
    const ok = res.rowCount === 0;
    results.push({
      id: 'I2',
      name: 'Reservation integrity (reserved = ACTIVE + COMMITTED)',
      ok,
      details: ok
        ? 'Inventory reserved exactly matches sum of active and committed item quantities.'
        : `Discrepancies found: ${JSON.stringify(res.rows)}`
    });
  } catch (err) {
    results.push({ id: 'I2', name: 'Reservation integrity', ok: false, details: err.message });
  }

  // I3 Stock conservation: initial_stock = on_hand + FULFILLED qty and committed + fulfilled <= initial_stock
  try {
    const res = await query(`
      WITH fulfilled_items AS (
        SELECT s.store_id, i.sku, COALESCE(SUM(i.qty), 0)::int AS fulfilled_qty
        FROM sub_order_items i
        JOIN sub_orders s ON i.sub_order_id = s.id
        WHERE i.reservation_status = 'FULFILLED'
        GROUP BY s.store_id, i.sku
      ),
      active_committed AS (
        SELECT s.store_id, i.sku, COALESCE(SUM(i.qty), 0)::int AS comm_qty
        FROM sub_order_items i
        JOIN sub_orders s ON i.sub_order_id = s.id
        WHERE i.reservation_status IN ('ACTIVE', 'COMMITTED')
        GROUP BY s.store_id, i.sku
      )
      SELECT inv.store_id, inv.sku, inv.initial_stock, inv.on_hand,
             COALESCE(f.fulfilled_qty, 0) AS fulfilled_qty,
             COALESCE(c.comm_qty, 0) AS committed_qty
      FROM inventory inv
      LEFT JOIN fulfilled_items f ON inv.store_id = f.store_id AND inv.sku = f.sku
      LEFT JOIN active_committed c ON inv.store_id = c.store_id AND inv.sku = c.sku
      WHERE (inv.initial_stock != inv.on_hand + COALESCE(f.fulfilled_qty, 0))
         OR (COALESCE(c.comm_qty, 0) + COALESCE(f.fulfilled_qty, 0) > inv.initial_stock);
    `);
    const ok = res.rowCount === 0;
    results.push({
      id: 'I3',
      name: 'Stock conservation (no phantom units & no oversell)',
      ok,
      details: ok
        ? 'Initial stock matches on_hand + fulfilled, and committed + fulfilled <= initial stock.'
        : `Conservation violated: ${JSON.stringify(res.rows)}`
    });
  } catch (err) {
    results.push({ id: 'I3', name: 'Stock conservation', ok: false, details: err.message });
  }

  // I4 One charge per order, one refund per sub-order
  try {
    const resCharge = await query(`
      SELECT order_id, COUNT(*) AS count
      FROM ledger_entries
      WHERE type = 'CHARGE'
      GROUP BY order_id
      HAVING COUNT(*) > 1;
    `);
    const resRefund = await query(`
      SELECT sub_order_id, COUNT(*) AS count
      FROM ledger_entries
      WHERE type = 'REFUND'
      GROUP BY sub_order_id
      HAVING COUNT(*) > 1;
    `);
    const ok = resCharge.rowCount === 0 && resRefund.rowCount === 0;
    results.push({
      id: 'I4',
      name: 'Single charge per order & single refund per sub-order',
      ok,
      details: ok
        ? 'No duplicate charges per order or duplicate refunds per sub-order exist.'
        : `Violations: ${JSON.stringify({ duplicateCharges: resCharge.rows, duplicateRefunds: resRefund.rows })}`
    });
  } catch (err) {
    results.push({ id: 'I4', name: 'Single charge/refund', ok: false, details: err.message });
  }

  // I5 Money conservation: sum(CHARGE) - sum(REFUND) = sum(PAID sub-orders)
  try {
    const res = await query(`
      WITH charges AS (
        SELECT order_id, COALESCE(SUM(amount_paise), 0)::int AS total_charged
        FROM ledger_entries WHERE type = 'CHARGE' GROUP BY order_id
      ),
      refunds AS (
        SELECT order_id, COALESCE(SUM(amount_paise), 0)::int AS total_refunded
        FROM ledger_entries WHERE type = 'REFUND' GROUP BY order_id
      ),
      paid_suborders AS (
        SELECT order_id, COALESCE(SUM(total_paise), 0)::int AS active_paid_total
        FROM sub_orders WHERE payment_state = 'PAID' GROUP BY order_id
      )
      SELECT o.id AS order_id,
             COALESCE(c.total_charged, 0) AS charged,
             COALESCE(r.total_refunded, 0) AS refunded,
             (COALESCE(c.total_charged, 0) - COALESCE(r.total_refunded, 0)) AS net_collected,
             COALESCE(p.active_paid_total, 0) AS expected_paid_total
      FROM orders o
      LEFT JOIN charges c ON o.id = c.order_id
      LEFT JOIN refunds r ON o.id = r.order_id
      LEFT JOIN paid_suborders p ON o.id = p.order_id
      WHERE (COALESCE(c.total_charged, 0) - COALESCE(r.total_refunded, 0)) != COALESCE(p.active_paid_total, 0)
        AND (COALESCE(c.total_charged, 0) > 0 OR COALESCE(p.active_paid_total, 0) > 0);
    `);
    const ok = res.rowCount === 0;
    results.push({
      id: 'I5',
      name: 'Money conservation (net charges = sum of active paid sub-orders)',
      ok,
      details: ok
        ? 'Net money collected equals the sum of sub-orders that remain paid and not refunded.'
        : `Money conservation violated: ${JSON.stringify(res.rows)}`
    });
  } catch (err) {
    results.push({ id: 'I5', name: 'Money conservation', ok: false, details: err.message });
  }

  // I6 No orphan state: no PAID sub-order without CHARGE; no REFUNDED without REFUND
  try {
    const res = await query(`
      SELECT s.id, s.order_id, s.payment_state, 'MISSING_CHARGE' as error
      FROM sub_orders s
      WHERE s.payment_state = 'PAID'
        AND NOT EXISTS (
          SELECT 1 FROM ledger_entries l WHERE l.order_id = s.order_id AND l.type = 'CHARGE'
        )
      UNION ALL
      SELECT s.id, s.order_id, s.payment_state, 'MISSING_REFUND' as error
      FROM sub_orders s
      WHERE s.payment_state = 'REFUNDED'
        AND NOT EXISTS (
          SELECT 1 FROM ledger_entries l WHERE l.sub_order_id = s.id AND l.type = 'REFUND'
        );
    `);
    const ok = res.rowCount === 0;
    results.push({
      id: 'I6',
      name: 'No orphan states (PAID requires CHARGE, REFUNDED requires REFUND)',
      ok,
      details: ok
        ? 'All sub-order payment states have corresponding ledger entries.'
        : `Orphan states found: ${JSON.stringify(res.rows)}`
    });
  } catch (err) {
    results.push({ id: 'I6', name: 'No orphan state', ok: false, details: err.message });
  }

  const allOk = results.every(r => r.ok);
  return { ok: allOk, timestamp: new Date().toISOString(), invariants: results };
}
