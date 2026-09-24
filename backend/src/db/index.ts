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
 * Ensures runtime database tables (such as snap_photo_likes) exist
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
  } catch (err: any) {
    console.warn('[DB] snap_photo_likes table init notice:', err.message);
  }
}

export * from './schema';

