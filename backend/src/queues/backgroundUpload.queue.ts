import { Queue, Worker, Job } from 'bullmq';
import { bullMqConnectionOptions } from '../config/redis';
import { db, eventPhotos } from '../db';
import { eq, and, or } from 'drizzle-orm';
import { R2Service, R2_ROOT_FOLDER } from '../services/r2.service';
import { wsManager } from '../services/websocket.service';

export const BACKGROUND_UPLOAD_QUEUE_NAME = 'background-upload-processing';

export interface BackgroundUploadJobItem {
  type: string;
  dataUrl?: string;
  url?: string;
  fileName?: string;
  cropData?: any;
}

export interface BackgroundUploadJobData {
  jobId: string;
  eventId: number;
  eventToken?: string;
  items: BackgroundUploadJobItem[];
  requestedAt: string;
}

export interface BackgroundUploadJobResult {
  jobId: string;
  eventId: number;
  savedResults: any[];
  totalProcessed: number;
  success: boolean;
  message: string;
}

export interface BackgroundUploadStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: {
    current: number;
    total: number;
    percent: number;
    currentType?: string;
  };
  result?: BackgroundUploadJobResult;
  error?: string;
}

// 1. BullMQ Queue Instance
export const backgroundUploadQueue = new Queue<BackgroundUploadJobData, BackgroundUploadJobResult, string>(
  BACKGROUND_UPLOAD_QUEUE_NAME,
  {
    connection: bullMqConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 500, // Keep last 500 completed jobs in Redis
      },
      removeOnFail: {
        count: 500,
      },
    },
  }
);

// 2. BullMQ Worker Instance (Concurrency: 3 workers)
export const backgroundUploadWorker = new Worker<BackgroundUploadJobData, BackgroundUploadJobResult, string>(
  BACKGROUND_UPLOAD_QUEUE_NAME,
  async (job: Job<BackgroundUploadJobData>) => {
    const { jobId, eventId, eventToken, items } = job.data;
    const totalItems = items.length;
    const savedResults: any[] = [];

    job.log(`Starting background upload job ${jobId} for event ${eventId} (${totalItems} items)`);

    for (let i = 0; i < totalItems; i++) {
      const item = items[i];
      if (!item.type) continue;

      const current = i + 1;
      const percent = Math.round((current / totalItems) * 100);
      await job.updateProgress({
        current,
        total: totalItems,
        percent,
        currentType: item.type,
      });

      let finalUrl = item.url || '';
      let storageKey = '';
      let mimeType = 'image/jpeg';
      let fileSize = 0;

      if (item.dataUrl && item.dataUrl.startsWith('data:')) {
        const match = item.dataUrl.match(/^data:([A-Za-z0-9\/\-+.]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          fileSize = buffer.length;

          const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
          const cleanName = (item.fileName || `${item.type}.${ext}`).replace(/[^a-zA-Z0-9.-]/g, '_');
          const uniqueKey = `${R2_ROOT_FOLDER}/events/${eventToken || eventId}/backgrounds/${Date.now()}_${item.type}_${cleanName}`;
          storageKey = uniqueKey;

          finalUrl = await R2Service.putObject(uniqueKey, buffer, mimeType);
        }
      }

      const existing = await db.query.eventPhotos.findFirst({
        where: and(
          eq(eventPhotos.eventId, eventId),
          eq(eventPhotos.type, item.type)
        ),
      });

      if (existing) {
        // If replacing an existing background image with a new R2 object, delete the old object
        if (existing.storageKey && storageKey && existing.storageKey !== storageKey) {
          try {
            await R2Service.deleteObject(existing.storageKey);
          } catch (delErr) {
            console.warn(`[BackgroundQueue] Failed to delete old R2 object: ${existing.storageKey}`, delErr);
          }
        }

        const [updated] = await db
          .update(eventPhotos)
          .set({
            url: finalUrl || existing.url,
            storageKey: storageKey || existing.storageKey,
            fileName: item.fileName || existing.fileName,
            fileSize: fileSize || existing.fileSize,
            mimeType: mimeType || existing.mimeType,
            cropData: item.cropData !== undefined ? item.cropData : existing.cropData,
          })
          .where(eq(eventPhotos.id, existing.id))
          .returning();
        savedResults.push(updated);
      } else {
        const [created] = await db
          .insert(eventPhotos)
          .values({
            eventId,
            url: finalUrl,
            storageKey,
            fileName: item.fileName || `${item.type}.jpg`,
            fileSize,
            mimeType,
            type: item.type,
            cropData: item.cropData || null,
          })
          .returning();
        savedResults.push(created);
      }

      // If saving 'original', clean up any obsolete legacy 'mobile_original' or 'desktop_original' records
      if (item.type === 'original') {
        try {
          const legacyRows = await db.query.eventPhotos.findMany({
            where: and(
              eq(eventPhotos.eventId, eventId),
              or(eq(eventPhotos.type, 'mobile_original'), eq(eventPhotos.type, 'desktop_original'))
            ),
          });
          for (const legacy of legacyRows) {
            if (legacy.storageKey && legacy.storageKey !== storageKey && legacy.storageKey !== existing?.storageKey && legacy.url !== finalUrl) {
              await R2Service.deleteObject(legacy.storageKey).catch(() => {});
            }
            await db.delete(eventPhotos).where(eq(eventPhotos.id, legacy.id));
          }
        } catch (cleanErr) {
          console.warn('[BackgroundQueue] Legacy cleanup error:', cleanErr);
        }
      }
    }

    // Broadcast WebSocket update to event rooms
    try {
      wsManager.broadcastToEvent(eventId, {
        type: 'backgrounds_updated',
        data: {
          eventId,
          backgrounds: savedResults,
        },
      });
      if (eventToken && eventToken !== String(eventId)) {
        wsManager.broadcastToEvent(eventToken, {
          type: 'backgrounds_updated',
          data: {
            eventId,
            backgrounds: savedResults,
          },
        });
      }
    } catch (wsErr) {
      console.warn('[BackgroundQueue] WebSocket broadcast failed:', wsErr);
    }

    return {
      jobId,
      eventId,
      savedResults,
      totalProcessed: savedResults.length,
      success: true,
      message: 'Event background photos saved successfully to R2 storage',
    };
  },
  {
    connection: bullMqConnectionOptions,
    concurrency: 3,
  }
);

backgroundUploadWorker.on('completed', (job) => {
  console.log(`✓ [Queue] Job ${job.id} completed for event ${job.data.eventId} backgrounds`);
});

backgroundUploadWorker.on('failed', (job, err) => {
  console.error(`✗ [Queue] Job ${job?.id} failed:`, err.message);
});

/**
 * Enqueue a background upload job in BullMQ
 */
export async function enqueueBackgroundUploadJob(data: BackgroundUploadJobData) {
  return await backgroundUploadQueue.add('upload-backgrounds', data, {
    jobId: data.jobId,
  });
}

/**
 * Query status of background upload job by jobId
 */
export async function getBackgroundUploadJobStatus(jobId: string): Promise<BackgroundUploadStatusResponse> {
  try {
    const job = await backgroundUploadQueue.getJob(jobId);
    if (!job) {
      return {
        jobId,
        status: 'failed',
        error: 'Job not found or expired',
      };
    }

    const state = await job.getState();
    let status: 'queued' | 'processing' | 'completed' | 'failed' = 'queued';
    if (state === 'active') status = 'processing';
    else if (state === 'completed') status = 'completed';
    else if (state === 'failed') status = 'failed';

    const progress = (job.progress as any) || (state === 'completed' ? { percent: 100, current: 0, total: 0 } : { percent: 0, current: 0, total: 0 });

    return {
      jobId,
      status,
      progress,
      result: job.returnvalue,
      error: job.failedReason,
    };
  } catch (err: any) {
    return {
      jobId,
      status: 'failed',
      error: err.message,
    };
  }
}
