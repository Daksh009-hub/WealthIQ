import { pool } from './index.js';
import { fileURLToPath } from 'node:url';

export async function seedDatabase(client = pool) {
  console.log('[seed] Seeding database...');

  // Clear in reverse dependency order
  await client.query(`
    DELETE FROM order_events;
    DELETE FROM refund_requests;
    DELETE FROM ledger_entries;
    DELETE FROM webhook_events;
    DELETE FROM payments;
    DELETE FROM sub_order_items;
    DELETE FROM sub_orders;
    DELETE FROM orders;
    DELETE FROM inventory;
    DELETE FROM products;
    DELETE FROM stores;
  `);

  // Insert Stores
  await client.query(`
    INSERT INTO stores (id, name, status) VALUES
      ('store-a', 'Sharma Electronics', 'AVAILABLE'),
      ('store-b', 'Delhi Gadgets', 'AVAILABLE'),
      ('store-c', 'Haryana Mart', 'AVAILABLE')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'AVAILABLE', updated_at = NOW();
  `);

  // Insert Products
  await client.query(`
    INSERT INTO products (sku, name) VALUES
      ('sku-flash', 'HyperX Flash Headset (Scarce)'),
      ('sku-phone', 'Pixel 9 Pro 256GB'),
      ('sku-cable', 'Anker Braided USB-C Cable (2m)'),
      ('sku-case', 'Spigen Rugged Armor Case'),
      ('sku-charger', '65W GaN Fast Charger'),
      ('sku-mouse', 'Logitech MX Master 3S Mouse')
    ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name;
  `);

  // Insert Inventory (prices in paise)
  // store-a: sku-flash has EXACTLY 10 stock!
  await client.query(`
    INSERT INTO inventory (store_id, sku, price_paise, initial_stock, on_hand, reserved) VALUES
      ('store-a', 'sku-flash', 499900, 10, 10, 0),
      ('store-a', 'sku-phone', 3499900, 20, 20, 0),
      ('store-a', 'sku-cable', 49900, 50, 50, 0),

      ('store-b', 'sku-phone', 3499900, 15, 15, 0),
      ('store-b', 'sku-cable', 49900, 50, 50, 0),
      ('store-b', 'sku-case', 99900, 40, 40, 0),
      ('store-b', 'sku-charger', 199900, 30, 30, 0),

      ('store-c', 'sku-cable', 49900, 50, 50, 0),
      ('store-c', 'sku-charger', 199900, 30, 30, 0),
      ('store-c', 'sku-mouse', 249900, 25, 25, 0)
    ON CONFLICT (store_id, sku) DO UPDATE SET
      price_paise = EXCLUDED.price_paise,
      initial_stock = EXCLUDED.initial_stock,
      on_hand = EXCLUDED.on_hand,
      reserved = 0;
  `);

  console.log('[seed] Seeding completed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[seed] Error seeding database:', err);
      process.exit(1);
    });
}
