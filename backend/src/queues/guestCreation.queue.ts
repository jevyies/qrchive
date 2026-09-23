import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { bullMqConnectionOptions } from '../config/redis';
import { db, snapGuests, SnapGuest } from '../db';

export const GUEST_CREATION_QUEUE_NAME = 'snap-guest-creation';

export interface CreateSnapGuestJobData {
  eventId: number;
  name: string;
  deviceSerial?: string | null;
  deviceName?: string | null;
}

export interface CreateSnapGuestResult {
  id: number;
  guest_code: string;
  name: string;
  eventId: number;
  deviceSerial?: string | null;
  deviceName?: string | null;
}

/**
 * Generate 8-character hex guest code: crypto.randomBytes(4).toString('hex')
 */
export function generateGuestCode(): string {
  return crypto.randomBytes(4).toString('hex');
}

/**
 * Direct DB insertion fallback if Redis queue is offline or timed out
 */
export async function directCreateSnapGuest(
  data: CreateSnapGuestJobData
): Promise<CreateSnapGuestResult> {
  const { eventId, name, deviceSerial, deviceName } = data;
  const cleanName = (name || 'Guest').trim() || 'Guest';

  // Ensure unique guest code
  let guestCode = generateGuestCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.query.snapGuests.findFirst({
      where: eq(snapGuests.guestCode, guestCode),
    });
    if (!existing) break;
    guestCode = generateGuestCode();
    attempts++;
  }

  const [inserted] = await db
    .insert(snapGuests)
    .values({
      eventId,
      name: cleanName,
      guestCode,
      deviceSerial: deviceSerial || null,
      deviceName: deviceName || null,
    })
    .returning();

  return {
    id: inserted.id,
    guest_code: inserted.guestCode || guestCode,
    name: inserted.name,
    eventId: inserted.eventId,
    deviceSerial: inserted.deviceSerial,
    deviceName: inserted.deviceName,
  };
}

// 1. BullMQ Queue Instance
export const guestCreationQueue = new Queue<CreateSnapGuestJobData, CreateSnapGuestResult, string>(
  GUEST_CREATION_QUEUE_NAME,
  {
    connection: bullMqConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: {
        count: 500,
      },
      removeOnFail: {
        count: 500,
      },
    },
  }
);

// 2. BullMQ QueueEvents Instance for synchronous completion awaiting
export const guestCreationQueueEvents = new QueueEvents(GUEST_CREATION_QUEUE_NAME, {
  connection: bullMqConnectionOptions,
});

// 3. BullMQ Worker Instance
export const guestCreationWorker = new Worker<
  CreateSnapGuestJobData,
  CreateSnapGuestResult,
  string
>(
  GUEST_CREATION_QUEUE_NAME,
  async (job: Job<CreateSnapGuestJobData>) => {
    return await directCreateSnapGuest(job.data);
  },
  {
    connection: bullMqConnectionOptions,
    concurrency: 5,
  }
);

guestCreationWorker.on('completed', (job, returnvalue) => {
  console.log(`[guestCreationWorker] Snap guest created (Job ${job.id}): guest_code=${returnvalue?.guest_code}`);
});

guestCreationWorker.on('failed', (job, err) => {
  console.error(`[guestCreationWorker] Job ${job?.id} failed:`, err.message);
});

/**
 * Enqueue snap guest creation in Redis with synchronous wait and DB fallback
 */
export async function enqueueCreateSnapGuest(
  data: CreateSnapGuestJobData,
  timeoutMs = 6000
): Promise<CreateSnapGuestResult> {
  try {
    const job = await guestCreationQueue.add('create-snap-guest', data, {
      removeOnComplete: true,
      removeOnFail: true,
    });

    const result = await job.waitUntilFinished(guestCreationQueueEvents, timeoutMs);
    return result as CreateSnapGuestResult;
  } catch (err: any) {
    console.warn('[guestCreationQueue] Redis queue wait failed, falling back to direct DB:', err.message);
    return await directCreateSnapGuest(data);
  }
}
