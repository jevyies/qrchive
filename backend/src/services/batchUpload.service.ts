import crypto from 'crypto';
import { redis } from '../config/redis';

export interface BatchSessionData {
  batchId: string;
  eventId: number;
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  percent: number;
  isFinished: boolean;
  status: string;
  uploadedBy?: string;
  deviceName?: string;
  deviceSerial?: string;
  createdAt: string;
  finishedAt?: string;
}

export class BatchUploadService {
  private static getKey(batchId: string): string {
    return `batch:${batchId}`;
  }

  /**
   * Initializes a new batch upload session in Redis
   */
  static async initBatch(params: {
    eventId: number;
    totalFiles: number;
    uploadedBy?: string;
    deviceName?: string;
    deviceSerial?: string;
  }): Promise<BatchSessionData> {
    const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const key = this.getKey(batchId);
    const now = new Date().toISOString();

    const data: Record<string, string> = {
      batchId,
      eventId: String(params.eventId),
      total: String(params.totalFiles),
      completed: '0',
      failed: '0',
      inProgress: '0',
      status: 'active',
      uploadedBy: params.uploadedBy || 'Guest',
      deviceName: params.deviceName || '',
      deviceSerial: params.deviceSerial || '',
      createdAt: now,
    };

    await redis.hset(key, data);
    // Expire batch state after 48 hours to prevent memory leaks
    await redis.expire(key, 48 * 3600);

    // Link batch to event
    await redis.sadd(`event:${params.eventId}:batches`, batchId);
    await redis.expire(`event:${params.eventId}:batches`, 48 * 3600);

    return {
      batchId,
      eventId: params.eventId,
      total: params.totalFiles,
      completed: 0,
      failed: 0,
      inProgress: 0,
      percent: 0,
      isFinished: false,
      status: 'active',
      uploadedBy: params.uploadedBy,
      deviceName: params.deviceName,
      deviceSerial: params.deviceSerial,
      createdAt: now,
    };
  }

  /**
   * Marks that a file in the batch has started uploading
   */
  static async recordFileStart(batchId: string): Promise<void> {
    const key = this.getKey(batchId);
    await redis.hincrby(key, 'inProgress', 1);
  }

  /**
   * Records a successfully completed photo in the batch
   */
  static async recordFileCompleted(
    batchId: string,
    photoId?: number | string
  ): Promise<BatchSessionData | null> {
    const key = this.getKey(batchId);
    const exists = await redis.exists(key);
    if (!exists) return null;

    if (photoId) {
      const added = await redis.sadd(`${key}:photos`, String(photoId));
      await redis.expire(`${key}:photos`, 48 * 3600);
      if (added === 1) {
        await redis.hincrby(key, 'completed', 1);
      }
    } else {
      await redis.hincrby(key, 'completed', 1);
    }

    const currentInProgress = Number((await redis.hget(key, 'inProgress')) || 0);
    if (currentInProgress > 0) {
      await redis.hincrby(key, 'inProgress', -1);
    }

    const progress = await this.getBatchProgress(batchId);
    if (progress && progress.isFinished && progress.status !== 'completed') {
      await redis.hset(key, {
        status: 'completed',
        finishedAt: new Date().toISOString(),
      });
      progress.status = 'completed';
    }

    return progress;
  }

  /**
   * Records a failed photo upload in the batch
   */
  static async recordFileFailed(
    batchId: string,
    errorMsg?: string
  ): Promise<BatchSessionData | null> {
    const key = this.getKey(batchId);
    const exists = await redis.exists(key);
    if (!exists) return null;

    await redis.hincrby(key, 'failed', 1);
    await redis.hincrby(key, 'inProgress', -1);

    if (errorMsg) {
      await redis.rpush(`${key}:errors`, errorMsg);
      await redis.expire(`${key}:errors`, 48 * 3600);
    }

    return this.getBatchProgress(batchId);
  }

  /**
   * Retrieves real-time batch upload progress
   */
  static async getBatchProgress(batchId: string): Promise<BatchSessionData | null> {
    const key = this.getKey(batchId);
    const raw = await redis.hgetall(key);
    if (!raw || !raw.batchId) {
      return null;
    }

    const total = Number(raw.total) || 1;
    const completed = Math.max(0, Number(raw.completed) || 0);
    const failed = Math.max(0, Number(raw.failed) || 0);
    const inProgress = Math.max(0, Number(raw.inProgress) || 0);
    const percent = Math.min(100, Math.round(((completed + failed) / total) * 100));
    const isFinished = completed + failed >= total;

    return {
      batchId: raw.batchId,
      eventId: Number(raw.eventId),
      total,
      completed,
      failed,
      inProgress,
      percent,
      isFinished,
      status: raw.status || (isFinished ? 'completed' : 'active'),
      uploadedBy: raw.uploadedBy,
      deviceName: raw.deviceName,
      deviceSerial: raw.deviceSerial,
      createdAt: raw.createdAt,
      finishedAt: raw.finishedAt,
    };
  }
}
