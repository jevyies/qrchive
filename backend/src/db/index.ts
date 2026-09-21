import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://jevyies:weddingdrive123@localhost:5432/weddingdrivedb';

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

export * from './schema';
