-- 001_init.sql — Bussin Core Schema

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('AVAILABLE','DOWN')) DEFAULT 'AVAILABLE',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  store_id TEXT REFERENCES stores(id),
  sku TEXT REFERENCES products(sku),
  price_paise INT NOT NULL,
  initial_stock INT NOT NULL,
  on_hand INT NOT NULL,
  reserved INT NOT NULL DEFAULT 0,
  PRIMARY KEY(store_id, sku),
  CHECK (reserved >= 0 AND on_hand >= 0 AND reserved <= on_hand)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  customer_name TEXT,
  total_paise INT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sub_orders (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  store_id TEXT REFERENCES stores(id),
  subtotal_paise INT,
  shipping_paise INT,
  total_paise INT,
  payment_state TEXT,
  fulfilment_state TEXT,
  needs_attention BOOLEAN DEFAULT FALSE,
  attention_reason TEXT,
  version INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sub_order_items (
  id UUID PRIMARY KEY,
  sub_order_id UUID REFERENCES sub_orders(id) ON DELETE CASCADE,
  sku TEXT REFERENCES products(sku),
  qty INT CHECK (qty > 0),
  unit_price_paise INT,
  reservation_status TEXT,
  reservation_expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  provider_payment_id TEXT UNIQUE,
  amount_paise INT,
  status TEXT CHECK (status IN ('PENDING','CAPTURED','FAILED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  type TEXT,
  provider_payment_id TEXT,
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  outcome TEXT,
  duplicate_count INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID,
  sub_order_id UUID NULL,
  type TEXT CHECK (type IN ('CHARGE','REFUND')),
  amount_paise INT CHECK (amount_paise > 0),
  provider_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS one_charge_per_order ON ledger_entries(order_id) WHERE type='CHARGE';
CREATE UNIQUE INDEX IF NOT EXISTS one_refund_per_sub_order ON ledger_entries(sub_order_id) WHERE type='REFUND';

CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY,
  sub_order_id UUID UNIQUE REFERENCES sub_orders(id),
  amount_paise INT,
  status TEXT CHECK (status IN ('REQUESTED','CONFIRMED','FAILED')),
  reason TEXT,
  idempotency_key TEXT UNIQUE,
  provider_refund_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  order_id UUID,
  sub_order_id UUID NULL,
  actor TEXT,
  event_type TEXT,
  from_state TEXT,
  to_state TEXT,
  message TEXT,
  details JSONB
);
