import { Queue, Worker, Job } from 'bullmq';
import { bullMqConnectionOptions } from '../config/redis';
import { db, snapPhotos, snapGuests, snapChecklist, events } from '../db';
import { eq, and } from 'drizzle-orm';
import { R2Service } from '../services/r2.service';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export const ZIP_ARCHIVE_QUEUE_NAME = 'zip-archive-processing';

// Storage directory for generated ZIP packages
export const ZIP_STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'exports');

// Ensure destination folder exists
try {
  if (!fs.existsSync(ZIP_STORAGE_DIR)) {
    fs.mkdirSync(ZIP_STORAGE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[ZipArchiveQueue] Notice creating ZIP_STORAGE_DIR:', e);
}

export interface ZipArchiveJobData {
  jobId: string;
  eventId: number;
  eventToken?: string;
  eventName?: string;
  requestedAt?: string;
}

export interface ZipArchiveJobResult {
  jobId: string;
  eventId: number;
  fileName: string;
  filePath: string;
  totalFiles: number;
  fileSize: number;
  downloadUrl?: string;
}

export interface ZipJobStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: {
    current: number;
    total: number;
    percent: number;
    currentFile?: string;
  };
  result?: ZipArchiveJobResult;
  error?: string;
}

// In-memory tracker for redundancy / Redis offline fallback
const fallbackJobStore = new Map<string, ZipJobStatusResponse>();

/**
 * Sanitize filename/foldername for cross-platform ZIP safety
 */
function sanitizeName(name: string): string {
  return (name || '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ');
}

/**
 * Core processing logic that generates the ZIP archive from R2/Database
 */
export async function processZipArchive(
  data: ZipArchiveJobData,
  onProgress?: (progress: { current: number; total: number; percent: number; currentFile?: string }) => void
): Promise<ZipArchiveJobResult> {
  const { jobId, eventId } = data;

  fallbackJobStore.set(jobId, {
    jobId,
    status: 'processing',
    progress: { current: 0, total: 0, percent: 0 },
  });

  // 1. Fetch Event Details
  const [event] = await db
    .select({
      id: events.id,
      name: events.name,
      token: events.token,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  const rawEventName = event?.name || data.eventName || `event-${eventId}`;
  const safeBaseName = sanitizeName(rawEventName).replace(/\s+/g, '-').toLowerCase() || `event-${eventId}`;
  const zipFileName = `${safeBaseName}-all-photos.zip`;
  const zipFilePath = path.join(ZIP_STORAGE_DIR, `${jobId}.zip`);

  // 2. Fetch Checklists to organize folders by chapter
  const checklistRows = await db
    .select({
      id: snapChecklist.id,
      name: snapChecklist.name,
    })
    .from(snapChecklist)
    .where(eq(snapChecklist.eventId, eventId));

  const checklistMap = new Map<number, string>();
  for (const c of checklistRows) {
    checklistMap.set(c.id, sanitizeName(c.name));
  }

  // 3. Fetch all completed photos & videos for the event
  const photos = await db
    .select({
      id: snapPhotos.id,
      checklistId: snapPhotos.checklistId,
      storageKey: snapPhotos.storageKey,
      fileName: snapPhotos.fileName,
      mimeType: snapPhotos.mimeType,
      url: snapPhotos.url,
      fileSize: snapPhotos.fileSize,
      createdAt: snapPhotos.createdAt,
      guestName: snapGuests.name,
    })
    .from(snapPhotos)
    .innerJoin(snapGuests, eq(snapPhotos.uploadedBy, snapGuests.id))
    .where(
      and(
        eq(snapGuests.eventId, eventId),
        eq(snapPhotos.status, 'completed')
      )
    )
    .orderBy(snapPhotos.id);

  const total = photos.length;

  return new Promise<ZipArchiveJobResult>(async (resolve, reject) => {
    try {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 6 }, // Balanced compression speed & ratio
      });

      output.on('close', () => {
        const stats = fs.existsSync(zipFilePath) ? fs.statSync(zipFilePath) : { size: 0 };
        const result: ZipArchiveJobResult = {
          jobId,
          eventId,
          fileName: zipFileName,
          filePath: zipFilePath,
          totalFiles: total,
          fileSize: stats.size,
          downloadUrl: `/api/photos/download-zip/${jobId}/file`,
        };

        fallbackJobStore.set(jobId, {
          jobId,
          status: 'completed',
          progress: { current: total, total, percent: 100 },
          result,
        });

        resolve(result);
      });

      archive.on('error', (err: any) => {
        fallbackJobStore.set(jobId, {
          jobId,
          status: 'failed',
          error: err.message,
        });

        reject(err);
      });

      archive.pipe(output);

      // If no photos exist, write a friendly README note into the ZIP
      if (total === 0) {
        archive.append(`No photos or videos have been uploaded yet for "${rawEventName}".\nCheck back once guests start snapping moments!`, {
          name: 'README.txt',
        });
        await archive.finalize();
        return;
      }

      // Track duplicate filenames inside folders
      const usedPaths = new Set<string>();

      for (let i = 0; i < total; i++) {
        const item = photos[i];

        // Determine folder name
        let folderName = 'Quick Captures';
        if (item.checklistId && checklistMap.has(item.checklistId)) {
          folderName = checklistMap.get(item.checklistId)!;
        }

        // Determine base file name and extension
        let fileBase = item.fileName ? sanitizeName(item.fileName) : `media_${item.id}`;
        if (!fileBase.includes('.')) {
          const isVideo = item.mimeType?.startsWith('video/') || item.url?.endsWith('.mp4');
          fileBase += isVideo ? '.mp4' : '.jpg';
        }

        // Avoid collision in archive
        let archivePath = `${folderName}/${fileBase}`;
        if (usedPaths.has(archivePath)) {
          const ext = path.extname(fileBase);
          const stem = path.basename(fileBase, ext);
          archivePath = `${folderName}/${stem}_${item.id}${ext}`;
        }
        usedPaths.add(archivePath);

        const currentProgress = {
          current: i + 1,
          total,
          percent: Math.round(((i + 1) / total) * 100),
          currentFile: archivePath,
        };

        if (onProgress) {
          onProgress(currentProgress);
        }
        fallbackJobStore.set(jobId, {
          jobId,
          status: 'processing',
          progress: currentProgress,
        });

        // Fetch buffer from R2, or fallback to URL fetch
        let fileBuffer: Buffer | null = null;

        if (item.storageKey) {
          try {
            const { buffer } = await R2Service.getObjectBuffer(item.storageKey);
            fileBuffer = buffer;
          } catch (r2Err: any) {
            console.warn(`[ZipArchive] R2 buffer failed for ${item.storageKey}:`, r2Err.message);
          }
        }

        // Fallback: fetch via public URL if R2 buffer unavailable
        if (!fileBuffer && item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'))) {
          try {
            const resp = await fetch(item.url);
            if (resp.ok) {
              const arrayBuffer = await resp.arrayBuffer();
              fileBuffer = Buffer.from(arrayBuffer);
            }
          } catch (fetchErr: any) {
            console.warn(`[ZipArchive] URL fetch failed for ${item.url}:`, fetchErr.message);
          }
        }

        if (fileBuffer) {
          archive.append(fileBuffer, { name: archivePath });
        }
      }

      await archive.finalize();
    } catch (err: any) {
      fallbackJobStore.set(jobId, {
        jobId,
        status: 'failed',
        error: err.message,
      });

      reject(err);
    }
  });
}

// 1. BullMQ Queue Instance
export const zipArchiveQueue = new Queue<ZipArchiveJobData, ZipArchiveJobResult, string>(
  ZIP_ARCHIVE_QUEUE_NAME,
  {
    connection: bullMqConnectionOptions,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
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

// 2. BullMQ Worker Instance
export const zipArchiveWorker = new Worker<ZipArchiveJobData, ZipArchiveJobResult, string>(
  ZIP_ARCHIVE_QUEUE_NAME,
  async (job: Job<ZipArchiveJobData>) => {
    const { jobId, eventId } = job.data;
    job.log(`Starting ZIP archive generation for event ${eventId} (Job ${jobId})`);

    const result = await processZipArchive(job.data, (progress) => {
      job.updateProgress(progress);
    });

    job.log(`Completed ZIP archive for event ${eventId}: ${result.totalFiles} files, ${result.fileSize} bytes`);
    return result;
  },
  {
    connection: bullMqConnectionOptions,
    concurrency: 2,
  }
);

zipArchiveWorker.on('completed', (job, result) => {
  console.log(`✓ [ZipArchive] Job ${job.id} completed: ${result?.fileName} (${result?.fileSize} bytes)`);
});

zipArchiveWorker.on('failed', (job, err) => {
  console.error(`✗ [ZipArchive] Job ${job?.id} failed:`, err.message);
});

/**
 * Enqueue ZIP creation in Redis BullMQ with automatic fallback
 */
export async function enqueueZipArchiveJob(data: ZipArchiveJobData): Promise<string> {
  const { jobId } = data;

  fallbackJobStore.set(jobId, {
    jobId,
    status: 'queued',
    progress: { current: 0, total: 0, percent: 0 },
  });

  try {
    await zipArchiveQueue.add('create-zip-archive', data, {
      jobId,
      removeOnComplete: true,
      removeOnFail: false,
    });
    return jobId;
  } catch (err: any) {
    console.warn('[ZipArchiveQueue] BullMQ enqueue failed, processing via background fallback:', err.message);
    // Background execution if Redis queue unavailable
    processZipArchive(data).catch((e) => console.error('[ZipArchive Fallback Error]', e));
    return jobId;
  }
}

/**
 * Check job status from Redis BullMQ or fallback store
 */
export async function getZipArchiveJobStatus(jobId: string): Promise<ZipJobStatusResponse> {
  // 1. Try BullMQ
  try {
    const job = await zipArchiveQueue.getJob(jobId);
    if (job) {
      const state = await job.getState();
      let status: 'queued' | 'processing' | 'completed' | 'failed' = 'queued';

      if (state === 'active') {
        status = 'processing';
      } else if (state === 'completed') {
        status = 'completed';
      } else if (state === 'failed') {
        status = 'failed';
      }

      const progress = (job.progress as any) || (state === 'completed' ? { percent: 100, current: 0, total: 0 } : { percent: 0, current: 0, total: 0 });

      return {
        jobId,
        status,
        progress,
        result: job.returnvalue,
        error: job.failedReason,
      };
    }
  } catch (e) {
    // Redis query failed, proceed to fallback
  }

  // 2. Check fallback store
  const stored = fallbackJobStore.get(jobId);
  if (stored) {
    return stored;
  }

  // 3. Check if file exists on disk
  const zipFilePath = path.join(ZIP_STORAGE_DIR, `${jobId}.zip`);
  if (fs.existsSync(zipFilePath)) {
    const stat = fs.statSync(zipFilePath);
    return {
      jobId,
      status: 'completed',
      progress: { current: 1, total: 1, percent: 100 },
      result: {
        jobId,
        eventId: 0,
        fileName: 'photos.zip',
        filePath: zipFilePath,
        totalFiles: 0,
        fileSize: stat.size,
        downloadUrl: `/api/photos/download-zip/${jobId}/file`,
      },
    };
  }

  return {
    jobId,
    status: 'failed',
    error: 'Job not found',
  };
}
