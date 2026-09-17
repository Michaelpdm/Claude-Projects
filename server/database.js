const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      size TEXT,
      color TEXT,
      price REAL NOT NULL DEFAULT 0,
      cost REAL DEFAULT 0,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      sale_price REAL NOT NULL,
      customer_name TEXT,
      payment_method TEXT DEFAULT 'cash',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      items TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS debits (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date_due DATE,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      phone_number TEXT NOT NULL,
      direction TEXT NOT NULL,
      message_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('owner_available', 'true'),
      ('store_name', 'My Clothing Store'),
      ('store_phone', ''),
      ('away_message', '')
    ON CONFLICT (key) DO NOTHING
  `);
}

init().catch(err => {
  console.error('DB init error:', err.message);
  process.exit(1);
});

module.exports = pool;
