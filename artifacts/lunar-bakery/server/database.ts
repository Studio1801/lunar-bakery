import { Pool } from 'pg';

let pool: Pool | undefined;
let schemaPromise: Promise<void> | undefined;

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const error = new Error('Order storage is not configured yet.');
    Object.assign(error, { statusCode: 503 });
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
    });
  }
  return pool;
}

export async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const database = getPool();
      await database.query(`
        CREATE TABLE IF NOT EXISTS lunar_staff (
          id UUID PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lunar_sessions (
          token_hash TEXT PRIMARY KEY,
          staff_id UUID NOT NULL REFERENCES lunar_staff(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lunar_orders (
          id UUID PRIMARY KEY,
          order_number TEXT NOT NULL UNIQUE,
          order_type TEXT NOT NULL CHECK (order_type IN ('pastry', 'custom_cake')),
          customer_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          pickup_date DATE NOT NULL,
          pickup_window TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'new'
            CHECK (status IN ('new', 'confirmed', 'ready', 'picked_up', 'cancelled')),
          total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS lunar_order_items (
          id UUID PRIMARY KEY,
          order_id UUID NOT NULL REFERENCES lunar_orders(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 24),
          unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
        );

        CREATE TABLE IF NOT EXISTS lunar_order_events (
          id UUID PRIMARY KEY,
          order_id UUID NOT NULL REFERENCES lunar_orders(id) ON DELETE CASCADE,
          actor_id UUID REFERENCES lunar_staff(id) ON DELETE SET NULL,
          event_type TEXT NOT NULL,
          from_status TEXT,
          to_status TEXT,
          detail TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS lunar_orders_pickup_date_idx
          ON lunar_orders (pickup_date, created_at);
        CREATE INDEX IF NOT EXISTS lunar_sessions_expiry_idx
          ON lunar_sessions (expires_at);
        CREATE INDEX IF NOT EXISTS lunar_order_events_order_idx
          ON lunar_order_events (order_id, created_at);
      `);
    })().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }

  await schemaPromise;
}

export function isDatabaseConfigurationError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      error.statusCode === 503,
  );
}
