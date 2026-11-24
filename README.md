# Bussin

> **"Orders so reliable, it's bussin."**

Bussin is a reliable multi-store payments and order fulfilment engine built for Nexhack 2.0 (PS04 FinTech). When a single customer purchase is fulfilled by multiple independent merchant stores, Bussin acts as the coordination and financial ledger layer. It guarantees strict inventory reservations, prevents overselling during high-concurrency flash sales, provides idempotent webhook processing for asynchronous payment gateways, coordinates partial refunds when individual stores fail midway, and continuously evaluates mathematical invariants across inventory and money.

---

## ⚡ Round-1 Demo Guide (T+1:00 Judging Showcase)

The primary judging interface is the **"Vibe Check" (Chaos Lab)**:

1. **Start the services:**
   ```bash
   # Install dependencies
   npm install

   # Setup DB schema and seed 3 stores + 6 SKUs (including scarce sku-flash with stock 10)
   npm run migrate --workspace=apps/api
   npm run seed --workspace=apps/api

   # Start API (port 4000) and Web UI (port 5173)
   npm run dev --workspace=apps/api
   npm run dev --workspace=apps/web
   ```

2. **Open the Chaos Lab:**
   Navigate to [http://localhost:5173](http://localhost:5173).

3. **Demonstrate Scenario S1 (Flash Sale Concurrency):**
   - Click **"⚡ Trigger S1 Flash Sale (50 vs 10)"**
   - 50 concurrent buyers execute simultaneous checkout requests via `Promise.all` competing for 10 units of `sku-flash` at `Sharma Electronics`.
   - **Outcome:** Exactly 10 succeed (HTTP 201), exactly 40 receive `OUT_OF_STOCK` (HTTP 409).
   - **Verification:** All 6 mathematical invariants (I1–I6) remain 100% green with zero phantom units and zero overselling.

4. **Run Integration Tests:**
   ```bash
   npm test --workspace=apps/api
   ```

