# PRD — Nexhack 2.0 · PS04 (FinTech) · "Bussin": Reliable Multi-Store Payments & Order Fulfilment

> **Project name:** Bussin. **Tagline:** "Orders so reliable, it's bussin." Suggested repo name: `bussin-multistore-payments`. Use "Bussin" in the README heading, the web app title/navbar and the demo. The failure-injection screen is branded **"Vibe Check"** (Chaos Lab), and the live invariant panel is its scoreboard.

> **Audience:** Antigravity agent. **Human owner:** Utkarsh Johar.
> **Hard constraint:** the whole prototype must be built in **6 hours**. **First judging round happens at T+60 min** and something real must be demonstrable then.

---

## 0. READ FIRST — Agent Operating Rules

1. **Do not write any code until Phase 0 is complete** (Section 1).
2. After Phase 0, work **autonomously**. Do not stop to ask questions unless blocked by something only the human can provide (credentials, a failed push you cannot fix).
3. Keep a file `PROGRESS.md` at repo root. Append a timestamped line at every milestone (`date` output). Record the **start time** in Phase 0 and compute elapsed time from it. Follow the time budget in Section 12 strictly. If a phase is running over, **cut scope using the P0/P1/P2 labels**, never skip the invariant checker or the chaos lab.
4. Prefer the simplest thing that preserves correctness. Correctness of **money and stock** beats UI polish, always.
5. Never fabricate results. Demo numbers must come from real runs against the real database.
6. Never put secrets in the repo. Use `.env` (git-ignored) and commit `.env.example` only.

---

## 1. Phase 0 — Mandatory Setup Interview (before any code)

Send the human **one single message** with all questions below, then wait for answers.

**Git / GitHub**
1. GitHub repository URL (HTTPS or SSH) to push to.
2. GitHub username / ID of the owner.
3. Repo visibility requirement (public/private) and any naming/collaborator rule from the organisers (e.g. add organiser accounts as collaborators).
4. How is git authenticated on this machine? (`gh auth login` already done / SSH key / personal access token). **If a token is needed, tell the human to store it via the credential manager or `gh auth login`; never ask them to paste it into a file or the chat.**
5. `git config user.name` and `user.email` to use for commits (use the existing config if already set).
6. Default branch name (assume `main`).

**Environment**
7. Is Docker Desktop available? If not: is PostgreSQL 15+ installed locally? If neither: ask for a free Neon/Supabase connection string.
8. Node.js version installed (need 20+).

**After answers:**
- Run `date` and write the start time to `PROGRESS.md`.
- `git init` (if needed), set the remote, run `git ls-remote <remote>` to verify access. If it fails, stop and tell the human exactly what to fix. **Do not continue pretending pushes work.**
- Create the first commit (`chore: initial project scaffold with PRD and README`) containing: `PRD.md`, `README.md` (title "Bussin" + tagline + one-paragraph description + "work in progress"), `.gitignore` (node_modules, .env, dist, *.log), `PROGRESS.md`. Push it.
- Start the autosave safety net (Section 2.3) in a **separate background terminal**.

---

## 2. Git & Commit Policy (so the work qualifies for the hackathon)

Organisers can only verify honest, continuous work. The history is the evidence.

### 2.1 Rules
- Work directly on `main` (solo, 6 hours; no branch overhead).
- **Commit after every completed logical unit** (a table, an endpoint, a screen, a test) **and at least every 15 minutes of active work** if the tree is dirty.
- **Push after every commit** (or at most every 2 commits). Verify with `git status -sb` that local is not ahead of origin after pushing.
- Use **Conventional Commits**: `feat(api): atomic stock reservation`, `fix(webhook): dedupe by event id`, `test(invariants): money conservation`, `docs: update demo script`, `chore: ...`.
- Each commit must be small and meaningful, with a one-line body when the "why" is not obvious.
- **Never** force-push, rewrite history, squash away history, or backdate commits (no `--date`, no `GIT_COMMITTER_DATE`). Real timestamps are the point.
- Never commit `.env`, secrets, `node_modules`, build output.
- If a push fails: retry once; if still failing, keep committing locally, tell the human immediately, and retry at every next commit.

### 2.2 Milestone tags (annotated)
- `round1-demo` at ~T+55 min
- `core-complete` at ~T+3h30
- `v1.0-final` at the very end

### 2.3 Autosave safety net (cross-platform; user may be on Windows)
Create `scripts/autosave.mjs` and run it in a background terminal: `node scripts/autosave.mjs 20`.

```js
// scripts/autosave.mjs — checkpoint commit + push every N minutes if the tree is dirty.
// Honest timestamps, never force-pushes. Meaningful commits by the agent remain the primary history.
import { execSync } from 'node:child_process';

const mins = Number(process.argv[2] || 20);
const sh = (cmd) => execSync(cmd, { stdio: 'pipe' }).toString().trim();

function tick() {
  try {
    if (!sh('git status --porcelain')) return console.log('[autosave] clean, nothing to do');
    sh('git add -A');
    const stat = sh('git diff --cached --shortstat');
    const t = new Date().toTimeString().slice(0, 5);
    sh(`git commit -m "chore(autosave): checkpoint ${t}" -m "${stat}"`);
    sh('git push origin HEAD');
    console.log(`[autosave] pushed checkpoint at ${t}`);
  } catch (e) {
    console.error('[autosave] skipped this cycle:', e.message.split('\n')[0]);
  }
}
console.log(`[autosave] running every ${mins} min`);
setInterval(tick, mins * 60 * 1000);
```

### 2.4 Final checklist (T+5h45)
- `git status` clean, `git log --oneline` shows a steady history across the whole 6 hours.
- `git push`, then confirm `git log origin/main -1` equals local `HEAD`.
- README runs from a clean clone (`docker compose up -d && npm i && npm run seed && npm run dev`).
- Tag `v1.0-final` and push tags.

---

## 3. Problem (from the official statement)

**PS04 — FinTech: Reliable Multi-Store Payments and Order Fulfilment.**
One purchase may be fulfilled by several stores, each with its own stock and delivery status. Payments, cancellations and refunds can arrive late or more than once, and a store may become unavailable after accepting part of the order. Build a multi-store order and payment system that keeps **inventory, fulfilment and financial states consistent** under **concurrent purchases, duplicate events and partial failures**.

### Required capabilities (judging checklist)
| # | Requirement | Where in this PRD |
|---|---|---|
| R1 | Reserve without overselling; release abandoned reservations | §6.1, §6.2 |
| R2 | Split order across stores; clear per-part states (payment, dispatch, cancellation, refund) | §5, §6.3 |
| R3 | Simulated payment service with delayed/duplicate notifications; each financial op recorded so repeats never repeat a charge/refund | §6.4, §6.5 |
| R4 | Recover when a store becomes unavailable midway; no overselling, no double refund, no erasing completed fulfilment | §6.6 |
| R5 | Staff timeline of what happened, what succeeded, what needs attention | §6.7 |
| R6 | Demo: simultaneous purchases for limited stock, repeated payment notification, one store fails during a split order; show correct final inventory and payment/refund outcomes | §8 |

---

## 4. Market Context & Positioning (verified from public docs)

| Existing solution | What it does | Gap relative to PS04 |
|---|---|---|
| **Razorpay Route** | Splits payments to multiple linked accounts, reverses transfers and handles refunds with automated reversals. | A payment rail: it knows nothing about inventory or per-store fulfilment. In India it also has RBI-driven eligibility criteria (turnover, payer-payee transparency), so it is not freely usable by small teams. |
| **Stripe Connect (separate charges & transfers)** | One charge, multiple transfers to connected accounts. | Refunding a charge does **not** reverse associated transfers; the platform must coordinate reversals itself and is liable for chargebacks. No inventory or fulfilment awareness. |
| **Medusa v2** | Inventory module with reservations, multi-location stock and order splitting. | General commerce framework; marketplace/split behaviour needs custom workflows (per its own recipes). |
| **Mercur (on Medusa)** | Marketplace layer with a split-order payment module tracking authorized/captured/refunded per seller. | A full platform, not a focused reliability layer with a failure-injection harness. |

*(WooCommerce Dokan/WCFM and Magento MSI are in the same category but were **not** verified; do not make claims about them.)*

**Positioning (be honest in the pitch):** we do not replace Stripe/Razorpay/Medusa. We are the **coordination layer** that ties stock, fulfilment and money together under one set of provable invariants, and we ship:
1. a **chaos simulator** that injects failures live,
2. a continuously evaluated **invariant checker** (green/red proof),
3. a **staff timeline + needs-attention queue** that explains every outcome.

---

## 5. Tech Stack (final)

- **Frontend:** React 18 + Vite (JavaScript/JSX), Tailwind CSS (fall back to plain CSS if setup takes > 5 min). Polling every 1 s is fine (no websockets needed).
- **API:** Node 20, Express, `pg` (plain SQL), `zod` for validation. ES modules.
- **Payment simulator:** a **separate** Express service (own process, own in-memory + small state), acts like a real gateway: idempotency keys, HMAC-signed webhooks, chaos modes.
- **Database:** **PostgreSQL 15+** (chosen because CHECK constraints, row locks and unique/partial indexes enforce money/stock invariants in the DB itself).
- **Migrations:** plain `.sql` files in `apps/api/db/migrations`, applied by a tiny runner on `npm run migrate`.
- **Tests:** Node's built-in `node:test` against the running API (no heavy deps).
- **Infra:** `docker-compose.yml` for Postgres (fallback: local Postgres or Neon/Supabase URL from Phase 0).
- **Monorepo (npm workspaces):**
```
/apps/api          Express API (port 4000)
/apps/payment-sim  Payment simulator (port 4100)
/apps/web          React app (port 5173)
/scripts           seed, concurrency test, autosave
/docs              architecture notes (optional mermaid diagram)
```

### Global design rules
- **Money = integer paise.** Never floats.
- **The database is the source of truth.** No correctness-critical in-memory state in the API (restart-safe).
- **Concurrency:** use conditional `UPDATE ... WHERE available >= qty` and `SELECT ... FOR UPDATE`. Always lock rows in a **deterministic order** (sort by `store_id, sku`) to avoid deadlocks. Default isolation `READ COMMITTED` is sufficient.
- **Idempotency everywhere:** unique constraints are the last line of defence, not application `if` checks.
- Auth is out of scope: a simple role switcher in the UI (Customer / Store / Staff) and a `x-role` header are enough.

---

## 6. Functional Spec

### 6.1 Inventory & Reservation (R1)
- Each `(store, sku)` has `on_hand`, `reserved`, `price_paise`, `initial_stock`. Available = `on_hand - reserved`.
- DB constraints: `CHECK (reserved >= 0 AND on_hand >= 0 AND reserved <= on_hand)`.
- **Reserve** inside ONE transaction for the whole cart (so multi-store carts are atomic):
  ```sql
  UPDATE inventory SET reserved = reserved + $qty
  WHERE store_id=$s AND sku=$k AND on_hand - reserved >= $qty
  RETURNING *;   -- 0 rows => OUT_OF_STOCK => rollback whole cart => HTTP 409
  ```
- Reservation lives on `sub_order_items` (`reservation_status`: `ACTIVE`, `COMMITTED`, `FULFILLED`, `RELEASED`, `EXPIRED`; `reservation_expires_at`).
- Default TTL `RESERVATION_TTL_SECONDS=120` (configurable; chaos scenarios may use 10 s).
- Reject checkout if a store is `DOWN`.

### 6.2 Abandoned reservation release (R1)
- Sweeper runs every 2 s: in one transaction, `SELECT ... FOR UPDATE SKIP LOCKED` on `ACTIVE` reservations past expiry; flip to `EXPIRED` and decrement `inventory.reserved` — **the status flip is the guard, so release happens exactly once**. Cancel the order if all its reservations expired; log timeline events.

### 6.3 Order split & states (R2)
- `POST /api/orders` creates one `orders` row and one `sub_orders` row per store. Totals: `sub_order.total = items + flat shipping per store (4000 paise)`; `order.total = Σ sub_order.total`.
- **Two state columns per sub-order** (clear per-part states):
  - `payment_state`: `UNPAID → PAID → REFUND_PENDING → REFUNDED`
  - `fulfilment_state`: `PENDING → ACCEPTED → DISPATCHED → DELIVERED`, or `CANCELLED`
  - plus `needs_attention` (bool) + `attention_reason`, and `version` (optimistic check on transitions).
- Order status is derived: `PENDING_PAYMENT`, `PAID`, `PARTIALLY_CANCELLED`, `CANCELLED`, `COMPLETED`.
- Illegal transitions are rejected (409) and logged.
- `POST /api/orders` supports an `Idempotency-Key` header (unique column) so client retries never create duplicate orders.
- Customer cancellation: allowed per sub-order or whole order **before dispatch**; paid parts trigger a refund (§6.5).
- Dispatch (store action): in one transaction `on_hand -= qty`, `reserved -= qty`, reservation → `FULFILLED`, guarded by `payment_state='PAID'` and `fulfilment_state='ACCEPTED'`.

### 6.4 Payment simulator & webhooks (R3)
**Simulator service (separate process):**
- `POST /payments {orderId, amountPaise, idempotencyKey}` → `{paymentId, status:"PENDING"}`; same key returns the same payment.
- `POST /refunds {paymentId, amountPaise, idempotencyKey}` → same idempotent behaviour.
- `GET /payments/:id`, `GET /refunds/:id` (used by the reconciler).
- After a delay it sends webhooks to the API: `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`. Payload: `{eventId, type, paymentId, refundId?, amountPaise, occurredAt}`, signed with HMAC-SHA256 in header `x-signature`.
- **Chaos config** (`PUT /chaos`): `delayMsMin/Max`, `duplicateCount`, `reorderProbability`, `dropProbability`. `POST /webhooks/replay/:eventId` re-sends a past event on demand.

**API webhook handler `POST /api/webhooks/payments`** (verify HMAC on the raw body first), all inside one transaction:
1. `INSERT INTO webhook_events(event_id, ...) ON CONFLICT DO NOTHING`. If it conflicted → increment `duplicate_count`, add timeline note "duplicate webhook ignored", return 200.
2. Lock the `payments` row `FOR UPDATE`. Apply only **legal** transitions; a different `eventId` for an already-applied state (e.g. second `captured`, or `failed` after `captured`) is recorded as `STALE`/`DUPLICATE`, never applied.
3. `payment.captured` on a valid pending order: insert ledger `CHARGE` (unique per order), mark sub-orders `PAID`, reservations `COMMITTED`, order `PAID`.
4. **Late payment** (order already `CANCELLED`/reservations `EXPIRED`): try to re-reserve in the same transaction; success → proceed as above with a timeline note; failure → record the `CHARGE` and **immediately create full refunds** for all sub-orders, order stays `CANCELLED` (net money = 0).
5. **Reconciler** (every 5 s): payments `PENDING` older than 10 s → `GET` the simulator and apply the result through the same code path (handles dropped webhooks). Refund requests `REQUESTED` older than 10 s → query/retry (idempotent key).

### 6.5 Refunds (R3, R4)
- A refund is created in the **same transaction** as the cancellation decision: `refund_requests` row (unique per sub-order) + `sub_orders.payment_state='REFUND_PENDING'`. The call to the simulator happens after commit and is retried by the reconciler (outbox-style, idempotency key = `refund:{sub_order_id}`).
- `refund.processed` webhook (deduped) → `refund_requests=CONFIRMED`, ledger `REFUND` inserted (partial unique index guarantees **one refund per sub-order**), `payment_state='REFUNDED'`.
- `refund.failed` → `needs_attention=true` with reason; staff can press **Retry refund** (idempotent).
- Refund amount = the sub-order's `total_paise` (items + its own shipping). One refund per sub-order; item-level partial refunds are out of scope.

### 6.6 Store failure recovery (R4) — policy: **cancel + refund only that store's part**
When a store is set `DOWN` (chaos button or store console), in one transaction:
- For its sub-orders in `PENDING` or `ACCEPTED`:
  - if `payment_state='PAID'` → `fulfilment_state='CANCELLED'`, release reservations (`reserved -= qty`), create refund request for that sub-order only.
  - if `UNPAID` → cancel the **whole** order and release every reservation (a late payment will be auto-refunded per §6.4.4).
- Sub-orders already `DISPATCHED` / `DELIVERED` are **never touched**; timeline notes "completed fulfilment preserved".
- Other stores' sub-orders continue normally.
- When the store comes back `AVAILABLE`, nothing is auto-reinstated (cancelled stays cancelled); a timeline note is added.

### 6.7 Staff timeline & attention queue (R5)
- `order_events` is **append-only**: `ts, order_id, sub_order_id, actor (customer|store|system|payment-sim|staff|chaos), event_type, from_state, to_state, message, details jsonb`. Every state change, webhook (applied/duplicate/stale), refund, reservation release writes one event **in the same transaction** as the change.
- Staff UI: order list → order detail with one card per sub-order (both state chips, store, amounts) and a vertical timeline. A **Needs Attention** queue lists flagged sub-orders with the reason and the next action (e.g. Retry refund).
- Plain-language messages, e.g. "Duplicate `payment.captured` (evt_9f2) ignored — charge already recorded".

### 6.8 Invariant checker (the differentiator)
`GET /api/invariants` runs SQL checks and returns `{name, ok, details}` for each:
- **I1 Stock bounds:** `0 <= reserved <= on_hand` for every row.
- **I2 Reservation integrity:** `reserved` equals the sum of qty of `ACTIVE` + `COMMITTED` reservations per `(store, sku)`.
- **I3 Stock conservation:** `initial_stock = on_hand + Σ FULFILLED qty` (no phantom or lost units) and committed+fulfilled ≤ `initial_stock` (no oversell).
- **I4 One charge per order, one refund per sub-order** (also enforced by unique indexes).
- **I5 Money conservation:** per order, `Σ CHARGE − Σ REFUND` equals the total of sub-orders that remain `PAID`/not refunded; refunds never exceed what the sub-order paid.
- **I6 No orphan state:** no `PAID` sub-order without a `CHARGE`; no `REFUNDED` without a `REFUND` ledger entry.
The UI shows these as a live panel (green ✓ / red ✗ with details).

---

## 7. Data Model (starting point — adjust if needed, keep constraints)

```sql
stores(id text pk, name text, status text check (status in ('AVAILABLE','DOWN')) default 'AVAILABLE', updated_at timestamptz);
products(sku text pk, name text);
inventory(store_id text references stores, sku text references products, price_paise int not null,
          initial_stock int not null, on_hand int not null, reserved int not null default 0,
          primary key(store_id, sku),
          check (reserved >= 0 and on_hand >= 0 and reserved <= on_hand));

orders(id uuid pk, idempotency_key text unique, customer_name text, total_paise int, status text,
       created_at timestamptz default now());
sub_orders(id uuid pk, order_id uuid references orders, store_id text references stores,
           subtotal_paise int, shipping_paise int, total_paise int,
           payment_state text, fulfilment_state text,
           needs_attention bool default false, attention_reason text, version int default 0);
sub_order_items(id uuid pk, sub_order_id uuid references sub_orders, sku text, qty int check (qty > 0),
                unit_price_paise int, reservation_status text, reservation_expires_at timestamptz);

payments(id uuid pk, order_id uuid references orders, provider_payment_id text unique,
         amount_paise int, status text check (status in ('PENDING','CAPTURED','FAILED')), created_at timestamptz default now());
webhook_events(event_id text pk, type text, provider_payment_id text, payload jsonb,
               received_at timestamptz default now(), outcome text, duplicate_count int default 0);
ledger_entries(id bigserial pk, order_id uuid, sub_order_id uuid null, type text check (type in ('CHARGE','REFUND')),
               amount_paise int check (amount_paise > 0), provider_ref text, created_at timestamptz default now());
create unique index one_charge_per_order on ledger_entries(order_id) where type='CHARGE';
create unique index one_refund_per_sub_order on ledger_entries(sub_order_id) where type='REFUND';
refund_requests(id uuid pk, sub_order_id uuid unique references sub_orders, amount_paise int,
                status text check (status in ('REQUESTED','CONFIRMED','FAILED')), reason text,
                idempotency_key text unique, provider_refund_id text, created_at timestamptz default now(), confirmed_at timestamptz);
order_events(id bigserial pk, ts timestamptz default now(), order_id uuid, sub_order_id uuid null,
             actor text, event_type text, from_state text, to_state text, message text, details jsonb);
```

**Seed:** 3 stores (e.g. `store-a` "Sharma Electronics", `store-b` "Delhi Gadgets", `store-c` "Haryana Mart"), ~6 SKUs spread across them. Include one scarce SKU: `sku-flash` with **stock 10 at store-a**, and enough stock elsewhere for split-order scenarios.

---

## 8. Chaos Lab & Demo Scenarios (R6)

`POST /api/admin/reset` (dev only) re-seeds the DB. Each scenario is `POST /api/chaos/scenarios/:name`, returns `{expected, actual, invariants, passed}`, and the UI shows a PASS/FAIL card.

| ID | Scenario | Expected result |
|---|---|---|
| **S1 (P0)** | **Flash sale:** 50 concurrent buyers (`Promise.all`) each order 1 unit of `sku-flash` (stock 10) | Exactly 10 orders succeed, 40 get `OUT_OF_STOCK`; `reserved ≤ on_hand`; invariants green |
| **S2 (P0)** | **Abandoned reservations:** 5 reservations with 10 s TTL, nobody pays | After expiry stock fully restored, released exactly once |
| **S3 (P0)** | **Duplicate webhooks:** pay one order; simulator sends `payment.captured` ×5 (some delayed) | Exactly 1 `CHARGE`; 4 duplicates logged in timeline |
| **S4 (P1)** | **Store failure mid-order:** 3-store order, paid; store A already `DISPATCHED`, store B `ACCEPTED`, store C goes `DOWN` | C's part cancelled + refunded once; A untouched; B continues; invariants green |
| **S5 (P2)** | **Late payment after expiry:** capture arrives after TTL | Re-reserved if stock exists, else auto-refunded; net money 0 |
| **S6 (P2)** | **Lost webhook:** simulator drops `payment.captured` | Reconciler detects and applies it; no duplicate charge |

**Chaos Lab UI:** scenario buttons, sliders for simulator chaos (delay / duplicates / reorder / drop), live per-store inventory table, live invariant panel, and result cards. Also a button **"Fail store X"** and **"Replay last webhook"**.

**Demo script (5 min, put in README):** reset → S1 (show 10/50) → S3 (show 5 webhooks, 1 charge) → S4 (split order, store fails, open the order's timeline, show refund only for store C) → show the invariant panel all green.

---

## 9. API Surface (minimum)

```
GET  /api/stores            GET /api/inventory
POST /api/orders            (Idempotency-Key header)
GET  /api/orders            GET /api/orders/:id        (includes sub-orders + timeline)
POST /api/orders/:id/pay    POST /api/orders/:id/cancel      POST /api/sub-orders/:id/cancel
POST /api/sub-orders/:id/accept | dispatch | deliver
POST /api/stores/:id/status {status}
POST /api/webhooks/payments (HMAC-verified)
GET  /api/staff/attention   POST /api/staff/refunds/:subOrderId/retry
GET  /api/invariants        POST /api/admin/reset
POST /api/chaos/scenarios/:name     GET/PUT /api/chaos/config   (proxies to simulator)
```

---

## 10. UI Screens
1. **Shop (Customer):** products grouped by store, cart, checkout → reservation countdown → Pay button.
2. **Staff Console:** orders list, order detail (sub-order cards + timeline), Needs Attention queue, store ops (Accept / Dispatch / Deliver, Store Up/Down).
3. **Chaos Lab:** as in §8. **This is the screen shown to judges in round 1.**

Design: clean, dark-or-light dashboard, clear state chips (colour-coded), no animation work.

---

## 11. Testing (must exist and pass before final tag)
`npm test` runs `node:test` integration tests:
- concurrency: 50 parallel reservations on stock 10 → exactly 10 succeed,
- reservation expiry releases exactly once,
- same `eventId` ×N and different `eventId` same payment ×N → one `CHARGE`,
- store failure → one refund for the failed part only; dispatched part untouched,
- double refund attempt (webhook + staff retry at the same time) → one `REFUND`,
- `GET /api/invariants` all green after each scenario.

---

## 12. Time Budget (6 h total; T+0 = start time recorded in Phase 0)

| Window | Goal | Commits / tags |
|---|---|---|
| **T+0:00–0:15** | Phase 0 interview, repo, scaffold, push, autosave running | initial commit |
| **T+0:15–0:55** | **ROUND-1 SLICE:** Postgres schema + seed, atomic reservation endpoint, inventory table UI, **S1 flash-sale button**, invariant panel (I1–I3) | `round1-demo` tag by ~T+0:55 |
| **T+1:00** | **First judging.** Demo: 50 buyers vs 10 stock, live inventory, invariants green. Be ready to explain the architecture in 2 min | |
| T+1:00–2:30 | Order split + per-sub-order states, payment simulator, signed webhooks, idempotent ledger, TTL sweeper (S2, S3) | feat commits per unit |
| T+2:30–3:30 | Refund flow, store failure recovery (S4), reconciler, customer cancel | `core-complete` tag ~T+3:30 |
| T+3:30–4:30 | Staff console: order detail, timeline, attention queue; full Chaos Lab UI | |
| T+4:30–5:15 | Tests (§11), S5/S6 if time, bug fixing | |
| T+5:15–5:45 | README, demo script, architecture diagram (mermaid), polish | |
| T+5:45–6:00 | Final checklist (§2.4), push, tag `v1.0-final` | |

**Scope-cut order if behind:** S6 → S5 → reorder-chaos → reconciler UI → customer shop polish. **Never cut:** DB constraints, idempotent ledger, invariant checker, S1/S3/S4.

---

## 13. Out of Scope
Real payment gateways, authentication, item-level partial refunds, returns/exchanges, multi-currency, deployment/hosting, mobile UI.

## 14. Definition of Done
- All §3 requirements demonstrably met via §8 scenarios, each producing PASS with green invariants.
- Tests in §11 pass; README lets a stranger run everything from a clean clone.
- GitHub history shows continuous commits across the full 6 hours and matches `PROGRESS.md`.
