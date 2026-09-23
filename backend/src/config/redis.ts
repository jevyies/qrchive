import Redis, { RedisOptions } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const host = process.env.REDIS_HOST || 'localhost';
const port = Number(process.env.REDIS_PORT) || 6379;
const password = process.env.REDIS_PASSWORD || undefined;

export const bullMqConnectionOptions = {
  host,
  port,
  password,
};

export const redisConnectionOptions: RedisOptions = {
  host,
  port,
  password,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
};

// Singleton Redis Client Instance
export const redis = redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => Math.min(times * 200, 2000),
    })
  : new Redis(redisConnectionOptions);

redis.on('connect', () => {
  console.log('✓ Connected to Redis at', host ? `${host}:${port}` : redisUrl);
});

redis.on('error', (err) => {
  console.error('[Redis Client Error]', err.message);
});

/**
 * Health check to verify Redis is responsive
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (err) {
    console.error('[Redis Check Failed]', err);
    return false;
  }
}
