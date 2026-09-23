import { Queue, Worker, Job } from 'bullmq';
import { bullMqConnectionOptions } from '../config/redis';
import { BatchUploadService } from '../services/batchUpload.service';
import { db, snapPhotos } from '../db';
import { eq } from 'drizzle-orm';
import { R2Service } from '../services/r2.service';

export const PHOTO_UPLOAD_QUEUE_NAME = 'photo-upload-processing';

export interface PhotoJobData {
  photoId: number;
  eventId: number;
  batchId?: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
}

// 1. BullMQ Queue Instance
export const photoUploadQueue = new Queue<PhotoJobData, any, string>(
  PHOTO_UPLOAD_QUEUE_NAME,
  {
    connection: bullMqConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000, // Keep last 1000 completed jobs in Redis for metrics
      },
      removeOnFail: {
        count: 500,
      },
    },
  }
);

// 2. BullMQ Worker Instance (Concurrency: 5 background processors)
export const photoUploadWorker = new Worker<PhotoJobData, any, string>(
  PHOTO_UPLOAD_QUEUE_NAME,
  async (job: Job<PhotoJobData>) => {
    const { photoId, eventId, batchId, storageKey } = job.data;
    job.log(`Processing photo ${photoId} for event ${eventId} (Batch: ${batchId || 'None'})`);

    try {
      // 1. Verify photo exists in database
      const photo = await db.query.snapPhotos.findFirst({
        where: eq(snapPhotos.id, photoId),
      });

      if (!photo) {
        throw new Error(`Photo ${photoId} not found in database`);
      }

      // 2. Verify object is accessible in Cloudflare R2
      const url = R2Service.getPublicUrl(storageKey, photoId);
      if (!photo.url || photo.url !== url) {
        await db
          .update(snapPhotos)
          .set({ url, status: 'completed' })
          .where(eq(snapPhotos.id, photoId));
      }

      // 3. If part of a Redis batch, record atomic completion
      if (batchId) {
        await BatchUploadService.recordFileCompleted(batchId, photoId);
      }

      return {
        success: true,
        photoId,
        url,
        batchId,
      };
    } catch (err: any) {
      if (batchId) {
        await BatchUploadService.recordFileFailed(batchId, err.message);
      }
      throw err;
    }
  },
  {
    connection: bullMqConnectionOptions,
    concurrency: 5,
  }
);

photoUploadWorker.on('completed', (job) => {
  console.log(`✓ [Queue] Job ${job.id} completed for photo ${job.data.photoId}`);
});

photoUploadWorker.on('failed', (job, err) => {
  console.error(`✗ [Queue] Job ${job?.id} failed:`, err.message);
});
