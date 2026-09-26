import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://jevyies:qrchive123@localhost:5432/qrchivedb';

const isProduction = process.env.NODE_ENV === 'production';
// Cloud databases (outside local or Railway internal service mesh) may need SSL
const requiresSsl =
  process.env.DB_SSL === 'true' ||
  (isProduction &&
    !connectionString.includes('localhost') &&
    !connectionString.includes('127.0.0.1') &&
    !connectionString.includes('railway.internal'));

export const client = postgres(connectionString, {
  prepare: false,
  ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export const db = drizzle(client, { schema });

/**
 * Ensures runtime database tables (such as snap_photo_likes, pricing) and columns exist
 */
export async function initDbTables() {
  try {
    await client`
      CREATE TABLE IF NOT EXISTS snap_photo_likes (
        id BIGSERIAL PRIMARY KEY,
        photo_id BIGINT NOT NULL REFERENCES snap_photos(id) ON DELETE CASCADE,
        user_identifier VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT snap_photo_likes_photo_user_uq UNIQUE (photo_id, user_identifier)
      );
    `;
    await client`
      CREATE INDEX IF NOT EXISTS idx_snap_photo_likes_photo ON snap_photo_likes(photo_id);
    `;
    await client`
      CREATE TABLE IF NOT EXISTS pricing (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        max_guest INTEGER,
        price NUMERIC(10, 2),
        "group" VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    await client`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS max_guest INTEGER;
    `;
    await client`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);
    `;

    // Seed default pricing packages if table is currently empty
    const pricingCountResult = await client`
      SELECT COUNT(*)::int as count FROM pricing;
    `;
    if (pricingCountResult[0]?.count === 0) {
      await client`
        INSERT INTO pricing (name, max_guest, price, "group") VALUES
        ('Standard Snap - Up to 100', 100, 500.00, 'standard'),
        ('Standard Snap - Up to 300', 300, 800.00, 'standard'),
        ('Standard Snap - 300+ guests', NULL, 1000.00, 'standard'),
        ('Unlimited Snap - Up to 100', 100, 1000.00, 'unlimited'),
        ('Unlimited Snap - Up to 300', 300, 1500.00, 'unlimited'),
        ('Unlimited Snap - 300+ guests', NULL, 2000.00, 'unlimited');
      `;
    }
  } catch (err: any) {
    console.warn('[DB] runtime table/column init notice:', err.message);
  }
}

export * from './schema';

