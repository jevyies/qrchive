import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { db, snapPhotos, snapGuests, snapChecklist, events, snapPhotoLikes, eventPhotos, SnapPhoto, NewSnapPhoto, SnapGuest, NewSnapGuest } from '../db';
import { R2Service, R2_PUBLIC_DOMAIN } from '../services/r2.service';
import { BatchUploadService } from '../services/batchUpload.service';
import { photoUploadQueue } from '../queues/photoUpload.queue';
import { enqueueZipArchiveJob, getZipArchiveJobStatus, ZIP_STORAGE_DIR } from '../queues/zipArchive.queue';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { wsManager } from '../services/websocket.service';

/**
 * Formats a photo URL with Cloudflare Image Resizing parameters
 * When using a direct R2 public domain without CF Image Resizing, returns the direct public URL.
 */
export function formatThumbnailUrl(fullUrl: string, _options: string = 'width=500,quality=80,format=auto'): string {
  if (!fullUrl) return '';
  return fullUrl;
}

/**
 * Formats a photo record into the simplified response structure:
 * { id, thumbnailUrl, fullUrl, uploadedBy, createdAt, likesCount, isLiked, url, storageKey, storage_key }
 */
export function formatSimplifiedPhoto(photo: {
  id: number;
  url: string;
  storageKey?: string | null;
  storage_key?: string | null;
  uploadedBy?: string | null;
  createdAt: string | Date;
  likesCount?: number;
  isLiked?: boolean;
  checklistId?: number | null;
  fileName?: string | null;
  mimeType?: string | null;
  thumbnailUrl?: string | null;
}) {
  const rawKey = photo.storageKey || (photo as any).storage_key || photo.url || '';
  const cleanKey = R2Service.cleanStorageKey(rawKey);
  const domain = R2_PUBLIC_DOMAIN || 'https://photos.qrchive-events.com';
  const fullUrl = cleanKey ? `${domain}/${cleanKey}` : (photo.url && !photo.url.includes('/api/photos/') ? photo.url : '');

  const isVideo = Boolean(
    photo.mimeType?.startsWith('video/') ||
    photo.fileName?.endsWith('.mp4') ||
    photo.fileName?.endsWith('.webm') ||
    fullUrl.endsWith('.mp4') ||
    fullUrl.endsWith('.webm')
  );

  let thumbnailUrl = '';
  if (isVideo && cleanKey) {
    const thumbKey = cleanKey.replace(/\.[^.]+$/, '_thumb.jpg');
    thumbnailUrl = `${domain}/${thumbKey}`;
  } else if (isVideo) {
    thumbnailUrl = fullUrl.replace(/\.[^.]+$/, '_thumb.jpg');
  } else {
    thumbnailUrl = fullUrl;
  }

  const uploadedByName = photo.uploadedBy || 'Guest';
  const createdAtStr =
    typeof photo.createdAt === 'string'
      ? photo.createdAt
      : photo.createdAt instanceof Date
        ? photo.createdAt.toISOString()
        : String(photo.createdAt);

  return {
    id: photo.id,
    thumbnailUrl,
    fullUrl,
    uploadedBy: uploadedByName,
    createdAt: createdAtStr,
    likesCount: Number(photo.likesCount || 0),
    likes: Number(photo.likesCount || 0),
    isLiked: Boolean(photo.isLiked || false),
    // Retained for backward-compatibility with quests.vue & live-vault.vue
    url: fullUrl,
    storageKey: cleanKey || photo.storageKey || null,
    storage_key: cleanKey || photo.storageKey || null,
    checklistId: photo.checklistId || null,
    fileName: photo.fileName || null,
    mimeType: photo.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
    isVideo,
    type: isVideo ? 'video' : 'photo',
  };
}

/**
 * Formats a photo record without like stats (for guest-specific photo list):
 * { id, thumbnailUrl, fullUrl, uploadedBy, createdAt, url, storageKey, storage_key, checklistId, fileName, mimeType, isVideo, type }
 */
export function formatSimplifiedGuestPhoto(photo: {
  id: number;
  url: string;
  storageKey?: string | null;
  storage_key?: string | null;
  uploadedBy?: string | null;
  createdAt: string | Date;
  checklistId?: number | null;
  fileName?: string | null;
  mimeType?: string | null;
  thumbnailUrl?: string | null;
}) {
  const rawKey = photo.storageKey || (photo as any).storage_key || photo.url || '';
  const cleanKey = R2Service.cleanStorageKey(rawKey);
  const domain = R2_PUBLIC_DOMAIN || 'https://photos.qrchive-events.com';
  const fullUrl = cleanKey ? `${domain}/${cleanKey}` : (photo.url && !photo.url.includes('/api/photos/') ? photo.url : '');

  const isVideo = Boolean(
    photo.mimeType?.startsWith('video/') ||
    photo.fileName?.endsWith('.mp4') ||
    photo.fileName?.endsWith('.webm') ||
    fullUrl.endsWith('.mp4') ||
    fullUrl.endsWith('.webm')
  );

  let thumbnailUrl = '';
  if (isVideo && cleanKey) {
    const thumbKey = cleanKey.replace(/\.[^.]+$/, '_thumb.jpg');
    thumbnailUrl = `${domain}/${thumbKey}`;
  } else if (isVideo) {
    thumbnailUrl = fullUrl.replace(/\.[^.]+$/, '_thumb.jpg');
  } else {
    thumbnailUrl = fullUrl;
  }

  const uploadedByName = photo.uploadedBy || 'Guest';
  const createdAtStr =
    typeof photo.createdAt === 'string'
      ? photo.createdAt
      : photo.createdAt instanceof Date
        ? photo.createdAt.toISOString()
        : String(photo.createdAt);

  return {
    id: photo.id,
    thumbnailUrl,
    fullUrl,
    uploadedBy: uploadedByName,
    createdAt: createdAtStr,
    url: fullUrl,
    storageKey: cleanKey || photo.storageKey || null,
    storage_key: cleanKey || photo.storageKey || null,
    checklistId: photo.checklistId || null,
    fileName: photo.fileName || null,
    mimeType: photo.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
    isVideo,
    type: isVideo ? 'video' : 'photo',
  };
}

const TEMP_CHUNKS_DIR = path.join(os.tmpdir(), 'qrchive_temp_chunks');

// Ensure temporary staging directory exists
if (!fs.existsSync(TEMP_CHUNKS_DIR)) {
  fs.mkdirSync(TEMP_CHUNKS_DIR, { recursive: true });
}

// Generates a short, safe directory name for staged chunks (prevents Windows MAX_PATH errors with 300+ char R2 uploadIds)
function getSessionDir(uploadId: string): string {
  const hash = crypto.createHash('md5').update(uploadId).digest('hex');
  return path.join(TEMP_CHUNKS_DIR, `sess_${hash}`);
}

/**
 * Resolves or auto-registers a snap_guest for the given event
 */
async function resolveSnapGuest(
  eventId: number,
  guestName?: string,
  deviceSerial?: string | null,
  deviceName?: string | null,
  guestCode?: string | null
): Promise<number> {
  const name = (guestName || 'Guest').trim() || 'Guest';

  let existingGuest = null;
  if (guestCode) {
    existingGuest = await db.query.snapGuests.findFirst({
      where: and(
        eq(snapGuests.eventId, eventId),
        eq(snapGuests.guestCode, guestCode)
      ),
    });
  }

  if (!existingGuest && deviceSerial) {
    existingGuest = await db.query.snapGuests.findFirst({
      where: and(
        eq(snapGuests.eventId, eventId),
        eq(snapGuests.deviceSerial, deviceSerial)
      ),
    });
  }

  if (!existingGuest) {
    existingGuest = await db.query.snapGuests.findFirst({
      where: and(
        eq(snapGuests.eventId, eventId),
        eq(snapGuests.name, name)
      ),
    });
  }

  if (existingGuest) {
    if (guestCode && !existingGuest.guestCode) {
      await db
        .update(snapGuests)
        .set({ guestCode })
        .where(eq(snapGuests.id, existingGuest.id));
    }
    return existingGuest.id;
  }

  const [newGuest] = await db
    .insert(snapGuests)
    .values({
      eventId,
      name,
      guestCode: guestCode || null,
      deviceSerial: deviceSerial || null,
      deviceName: deviceName || null,
    })
    .returning();

  return newGuest.id;
}

/**
 * Toggles a like for a photo by a specific user/guest identifier
 */
async function togglePhotoLike(photoId: number, userIdentifier: string) {
  const photo = await db.query.snapPhotos.findFirst({
    where: eq(snapPhotos.id, photoId),
    with: {
      guest: {
        with: {
          event: true,
        },
      },
    },
  });

  if (!photo) return null;

  const existing = await db.query.snapPhotoLikes.findFirst({
    where: and(
      eq(snapPhotoLikes.photoId, photoId),
      eq(snapPhotoLikes.userIdentifier, userIdentifier)
    ),
  });

  let isLiked = false;
  if (existing) {
    await db.delete(snapPhotoLikes).where(eq(snapPhotoLikes.id, existing.id));
    isLiked = false;
  } else {
    await db.insert(snapPhotoLikes).values({
      photoId,
      userIdentifier,
    });
    isLiked = true;
  }

  const [countRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(snapPhotoLikes)
    .where(eq(snapPhotoLikes.photoId, photoId));

  const likesCount = countRes?.count || 0;
  const guestInfo = (photo as any).guest;
  const eventId = guestInfo?.eventId || 0;
  const eventToken = guestInfo?.event?.token || String(eventId);

  return {
    photoId,
    isLiked,
    likesCount,
    eventId,
    eventToken,
  };
}

export const photoRoutes: FastifyPluginAsync = async (app) => {
  // =========================================================================
  // 0. BATCH UPLOAD COORDINATION (Redis-Backed)
  // =========================================================================

  // POST /batch/init: Initialize high-volume batch session in Redis
  app.post(
    '/batch/init',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Initialize High-Volume Batch Upload Session',
        description: 'Creates a Redis-backed batch upload tracking session for uploading up to 500+ photos.',
        body: {
          type: 'object',
          required: ['eventId', 'totalFiles'],
          properties: {
            eventId: { type: 'integer', description: 'Target event ID' },
            totalFiles: { type: 'integer', minimum: 1, description: 'Total number of files in this batch (e.g. 500)' },
            uploadedBy: { type: 'string' },
            deviceName: { type: 'string' },
            deviceSerial: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Batch upload session initialized',
            type: 'object',
            properties: {
              message: { type: 'string' },
              batch: {
                type: 'object',
                properties: {
                  batchId: { type: 'string' },
                  eventId: { type: 'integer' },
                  total: { type: 'integer' },
                  completed: { type: 'integer' },
                  failed: { type: 'integer' },
                  inProgress: { type: 'integer' },
                  percent: { type: 'integer' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const eventId = Number(body.eventId);
      const totalFiles = Number(body.totalFiles);

      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
      });

      if (!event) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID ${eventId} does not exist.`,
        });
      }

      let uploader = body.uploadedBy;
      if (!uploader && request.user) {
        uploader = `${request.user.firstname || ''} ${request.user.lastname || ''}`.trim() || request.user.username;
      }

      const batch = await BatchUploadService.initBatch({
        eventId,
        totalFiles,
        uploadedBy: uploader,
        deviceName: body.deviceName,
        deviceSerial: body.deviceSerial,
      });

      return reply.status(201).send({
        message: 'Batch upload session initialized successfully',
        batch,
      });
    }
  );

  // GET /batch/:batchId: Real-time atomic progress of batch
  app.get(
    '/batch/:batchId',
    {
      schema: {
        tags: ['Photos'],
        summary: 'Get Batch Upload Progress',
        description: 'Retrieves real-time atomic progress and statistics of a multi-file batch upload from Redis.',
        params: {
          type: 'object',
          required: ['batchId'],
          properties: {
            batchId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { batchId } = request.params as any;
      const progress = await BatchUploadService.getBatchProgress(batchId);

      if (!progress) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Batch session '${batchId}' not found or has expired.`,
        });
      }

      return reply.send(progress);
    }
  );

  // =========================================================================
  // 1. INIT CHUNKED UPLOAD (POST /upload/init)
  // =========================================================================
  app.post(
    '/upload/init',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Initialize Chunked Photo Upload',
        description: 'Creates a photo record, allocates an R2 storage key and multipart upload session.',
        body: {
          type: 'object',
          required: ['eventId', 'fileName'],
          properties: {
            eventId: { type: 'integer', description: 'ID of the event from events table' },
            fileName: { type: 'string', description: 'Original filename of the photo' },
            fileSize: { type: 'integer', description: 'Total file size in bytes' },
            mimeType: { type: 'string', default: 'image/jpeg', description: 'MIME type of the photo' },
            totalChunks: { type: 'integer', default: 1, description: 'Expected total number of chunks' },
            uploadedBy: { type: 'string', description: 'Name, handle or email of the uploader' },
            deviceSerial: { type: 'string', description: 'Serial or UUID of the uploading device' },
            deviceName: { type: 'string', description: 'Model / name of the device (e.g. iPhone 15 Pro, Pixel 8)' },
          },
        },
        response: {
          201: {
            description: 'Upload session initialized successfully',
            type: 'object',
            properties: {
              message: { type: 'string' },
              photoId: { type: 'integer' },
              uploadId: { type: 'string' },
              storageKey: { type: 'string' },
              totalChunks: { type: 'integer' },
            },
          },
          404: {
            description: 'Event not found',
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const rawEvent = body.eventCode || body.eventId || request.headers['x-event-id'] || request.headers['x-event-code'];
      if (!rawEvent) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'eventId or eventCode is required.',
        });
      }

      const isNumeric = /^\d+$/.test(String(rawEvent));
      let event = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.token, String(rawEvent)), eq(events.id, Number(rawEvent)))
          : eq(events.token, String(rawEvent)),
      });

      if (!event && String(rawEvent) === 'demo-event') {
        event = await db.query.events.findFirst();
      }

      if (!event) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with token or ID '${rawEvent}' does not exist.`,
        });
      }

      const eventId = event.id;
      const eventCode = body.eventCode || (request.headers['x-event-code'] as string) || event.token || String(event.id);
      const guestCode = body.guestCode || (request.headers['x-guest-code'] as string) || null;
      const captureMode = body.captureMode || (request.headers['x-capture-mode'] as string) || null;
      const checkListId = body.checkListId || body.checklistId || (request.headers['x-checklist-id'] as string) || null;

      const originalFileName = body.fileName || 'photo.jpg';
      const mimeType = body.mimeType || 'image/jpeg';
      const storageKey = R2Service.generateStorageKey(eventId, originalFileName, {
        eventCode,
        guestCode,
        captureMode,
        checkListId,
      });

      // Initialize R2 Multipart Upload session
      let uploadId = '';
      try {
        uploadId = await R2Service.initMultipartUpload(storageKey, mimeType);
      } catch (err: any) {
        request.log.error(err, 'Failed to init R2 multipart upload');
        return reply.status(500).send({
          error: 'R2StorageError',
          message: `Failed to initialize R2 storage session: ${err.message}`,
        });
      }

      // Determine uploaded_by: explicit input -> user name -> Guest
      let uploader = body.uploadedBy;
      if (!uploader && request.user) {
        uploader = `${request.user.firstname || ''} ${request.user.lastname || ''}`.trim() || request.user.username;
      }
      if (!uploader) {
        uploader = 'Guest';
      }

      // Resolve snap_guest
      const guestId = await resolveSnapGuest(
        eventId,
        uploader,
        body.deviceSerial,
        body.deviceName,
        guestCode
      );

      // Create record in snap_photos table (status: uploading)
      const [newPhoto] = await db
        .insert(snapPhotos)
        .values({
          uploadedBy: guestId,
          checklistId: checkListId ? Number(checkListId) : null,
          url: '',
          fileName: originalFileName,
          fileSize: body.fileSize ? Number(body.fileSize) : null,
          mimeType,
          storageKey,
          totalChunks: Number(body.totalChunks) || 1,
          status: 'uploading',
        })
        .returning();

      return reply.status(201).send({
        message: 'Upload session initialized successfully',
        photoId: newPhoto.id,
        uploadId,
        storageKey,
        totalChunks: newPhoto.totalChunks,
      });
    }
  );

  // =========================================================================
  // 2. UPLOAD CHUNK (POST /upload/chunk)
  // =========================================================================
  app.post(
    '/upload/chunk',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Upload Photo Chunk',
        description: 'Uploads a single chunk of a photo via multipart form-data or buffer.',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Parse multipart form data
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Missing chunk file data in multipart request.',
        });
      }

      const fields = data.fields as any;
      const photoId = Number(fields.photoId?.value || request.headers['x-photo-id']);
      const uploadId = String(fields.uploadId?.value || request.headers['x-upload-id'] || '');
      const partNumber = Number(fields.partNumber?.value || fields.chunkIndex?.value || request.headers['x-part-number'] || 1);

      if (!photoId || !uploadId || !partNumber) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'photoId, uploadId, and partNumber are required.',
        });
      }

      // Check photo record in DB
      const photo = await db.query.snapPhotos.findFirst({
        where: eq(snapPhotos.id, photoId),
      });

      if (!photo) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Active upload session for photo ID ${photoId} not found.`,
        });
      }

      const chunkBuffer = await data.toBuffer();
      const isFiveMbOrMore = chunkBuffer.length >= 5 * 1024 * 1024;

      let etag = `chunk_${partNumber}`;

      // Hybrid chunk strategy:
      // If chunk is 5MB or larger, we can send it directly to Cloudflare R2's S3 UploadPartCommand.
      // If smaller than 5MB (standard for mobile photo chunks), we stage it on server disk
      // and concatenate into R2 PutObjectCommand on completion.
      if (isFiveMbOrMore) {
        try {
          etag = await R2Service.uploadPart(
            photo.storageKey || '',
            uploadId,
            partNumber,
            chunkBuffer
          );
        } catch (err: any) {
          request.log.error(err, `R2 uploadPart error for part ${partNumber}`);
          return reply.status(500).send({
            error: 'R2UploadError',
            message: `Failed to upload part ${partNumber} to R2: ${err.message}`,
          });
        }
      } else {
        // Stage chunk locally for session
        const sessionDir = getSessionDir(uploadId);
        if (!fs.existsSync(sessionDir)) {
          fs.mkdirSync(sessionDir, { recursive: true });
        }
        const chunkFilePath = path.join(sessionDir, `part_${String(partNumber).padStart(5, '0')}.tmp`);
        await fs.promises.writeFile(chunkFilePath, chunkBuffer);
      }

      return reply.send({
        success: true,
        message: `Chunk ${partNumber} uploaded successfully`,
        photoId,
        partNumber,
        etag,
        chunkSize: chunkBuffer.length,
      });
    }
  );

  // =========================================================================
  // 3. COMPLETE CHUNKED UPLOAD (POST /upload/complete)
  // =========================================================================
  app.post(
    '/upload/complete',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Complete Chunked Photo Upload',
        description: 'Finalizes the upload in R2, calculates the public photo URL, and marks the photo as completed.',
        body: {
          type: 'object',
          required: ['photoId', 'uploadId'],
          properties: {
            photoId: { type: 'integer' },
            uploadId: { type: 'string' },
            parts: {
              type: 'array',
              items: {
                type: 'object',
                required: ['partNumber', 'etag'],
                properties: {
                  partNumber: { type: 'integer' },
                  etag: { type: 'string' },
                },
              },
            },
          },
        },
        response: {
          200: {
            description: 'Photo upload completed successfully',
            type: 'object',
            properties: {
              message: { type: 'string' },
              photo: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  eventId: { type: 'integer' },
                  url: { type: 'string' },
                  uploadedBy: { type: 'string', nullable: true },
                  uploadedAt: { type: 'string' },
                  deviceSerial: { type: 'string', nullable: true },
                  deviceName: { type: 'string', nullable: true },
                  fileName: { type: 'string', nullable: true },
                  fileSize: { type: 'integer', nullable: true },
                  mimeType: { type: 'string', nullable: true },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { photoId, uploadId, parts } = request.body as any;

      const photo = await db.query.snapPhotos.findFirst({
        where: eq(snapPhotos.id, Number(photoId)),
      });

      if (!photo) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Photo with ID ${photoId} and uploadId '${uploadId}' not found.`,
        });
      }

      const storageKey = photo.storageKey || '';
      const sessionDir = getSessionDir(uploadId);
      let photoUrl = '';

      // Check if chunks were staged locally (<5MB chunks)
      if (fs.existsSync(sessionDir)) {
        try {
          const files = (await fs.promises.readdir(sessionDir))
            .filter((f) => f.startsWith('part_') && f.endsWith('.tmp'))
            .sort();

          // Concatenate all chunks in numerical part order
          const chunkBuffers: Buffer[] = [];
          for (const file of files) {
            const buf = await fs.promises.readFile(path.join(sessionDir, file));
            chunkBuffers.push(buf);
          }
          const assembledBuffer = Buffer.concat(chunkBuffers);

          // Upload assembled file to Cloudflare R2
          photoUrl = await R2Service.putObject(
            storageKey,
            assembledBuffer,
            photo.mimeType || 'image/jpeg'
          );

          // Cleanup R2 multipart session if one was opened
          try {
            await R2Service.abortMultipartUpload(storageKey, uploadId);
          } catch {
            // Non-critical if multipart wasn't active
          }

          // Cleanup local session temp files
          await fs.promises.rm(sessionDir, { recursive: true, force: true });
        } catch (err: any) {
          request.log.error(err, 'Failed to assemble staged chunks');
          return reply.status(500).send({
            error: 'AssemblyError',
            message: `Failed to assemble chunks: ${err.message}`,
          });
        }
      } else {
        // Complete via native R2 Multipart Upload
        try {
          const completedParts = (parts || []).map((p: any) => ({
            PartNumber: Number(p.partNumber),
            ETag: String(p.etag).replace(/^"|"$/g, ''),
          }));

          await R2Service.completeMultipartUpload(storageKey, uploadId, completedParts);
          photoUrl = R2Service.getPublicUrl(storageKey);
        } catch (err: any) {
          request.log.error(err, 'Failed to complete R2 multipart upload');
          return reply.status(500).send({
            error: 'R2CompleteError',
            message: `Failed to complete R2 multipart upload: ${err.message}`,
          });
        }
      }

      // Update record in database: status = completed, url
      const [updatedPhoto] = await db
        .update(snapPhotos)
        .set({
          url: photoUrl,
          status: 'completed',
        })
        .where(eq(snapPhotos.id, photo.id))
        .returning();

      // If part of a Redis batch, update batch progress
      const batchId = (request.body as any)?.batchId || (request.headers['x-batch-id'] as string);
      let batchProgress = null;
      let guestEventId = 0;
      let uploaderName = 'Guest';
      let eventToken = '';

      if (photo.uploadedBy) {
        const g = await db.query.snapGuests.findFirst({
          where: eq(snapGuests.id, photo.uploadedBy),
          with: { event: true },
        });
        if (g) {
          guestEventId = g.eventId;
          uploaderName = g.name;
          eventToken = (g as any).event?.token || String(guestEventId);
        }
      }

      // Format simplified photo and broadcast via WebSocket to live vault
      const simplifiedPhoto = formatSimplifiedPhoto({
        id: updatedPhoto.id,
        url: photoUrl,
        storageKey: updatedPhoto.storageKey,
        uploadedBy: uploaderName,
        createdAt: updatedPhoto.createdAt,
        likesCount: 0,
        isLiked: false,
        checklistId: updatedPhoto.checklistId,
        fileName: updatedPhoto.fileName,
        mimeType: updatedPhoto.mimeType,
      });

      if (guestEventId) {
        wsManager.broadcastToEvent(guestEventId, {
          type: 'new_photo',
          photo: simplifiedPhoto,
        });
        if (eventToken && eventToken !== String(guestEventId)) {
          wsManager.broadcastToEvent(eventToken, {
            type: 'new_photo',
            photo: simplifiedPhoto,
          });
        }
      }

      if (batchId) {
        batchProgress = await BatchUploadService.recordFileCompleted(batchId, updatedPhoto.id);

        // Enqueue background processing job
        await photoUploadQueue.add('process-photo', {
          photoId: updatedPhoto.id,
          eventId: guestEventId,
          batchId,
          storageKey,
          fileName: photo.fileName || 'photo.jpg',
          mimeType: photo.mimeType || 'image/jpeg',
        });
      }

      return reply.send({
        message: 'Photo upload completed successfully',
        photo: {
          ...updatedPhoto,
          ...simplifiedPhoto,
        },
        batch: batchProgress,
      });
    }
  );

  // =========================================================================
  // 4. ABORT CHUNKED UPLOAD (POST /upload/abort)
  // =========================================================================
  app.post(
    '/upload/abort',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Abort Chunked Photo Upload',
        description: 'Cancels an in-progress upload session, cleans up R2 and temporary staging chunks.',
        body: {
          type: 'object',
          required: ['photoId', 'uploadId'],
          properties: {
            photoId: { type: 'integer' },
            uploadId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { photoId, uploadId } = request.body as any;

      const photo = await db.query.snapPhotos.findFirst({
        where: eq(snapPhotos.id, Number(photoId)),
      });

      if (!photo) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Photo upload session not found.',
        });
      }

      // Abort R2 multipart upload
      try {
        if (photo.storageKey) {
          await R2Service.abortMultipartUpload(photo.storageKey, uploadId);
        }
      } catch (err) {
        request.log.warn(err, 'Failed to abort R2 multipart');
      }

      // Clean local session temp files
      const sessionDir = getSessionDir(uploadId);
      if (fs.existsSync(sessionDir)) {
        await fs.promises.rm(sessionDir, { recursive: true, force: true }).catch(() => { });
      }

      // Mark record as failed
      await db
        .update(snapPhotos)
        .set({ status: 'failed' })
        .where(eq(snapPhotos.id, photo.id));

      return reply.send({
        message: 'Photo upload aborted successfully',
      });
    }
  );

  // =========================================================================
  // 5. DIRECT PHOTO UPLOAD (POST /upload/direct)
  // =========================================================================
  app.post(
    '/upload/direct',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Direct Photo Upload',
        description: 'Uploads a photo file in a single request directly to Cloudflare R2.',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Missing file in upload.',
        });
      }

      const fields = data.fields as any;
      const rawEvent = fields.eventCode?.value || fields.eventId?.value || request.headers['x-event-id'] || request.headers['x-event-code'];
      if (!rawEvent) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'eventId or eventCode is required.',
        });
      }

      const isNumeric = /^\d+$/.test(String(rawEvent));
      let event = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.token, String(rawEvent)), eq(events.id, Number(rawEvent)))
          : eq(events.token, String(rawEvent)),
      });

      if (!event && String(rawEvent) === 'demo-event') {
        event = await db.query.events.findFirst();
      }

      if (!event) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with token or ID '${rawEvent}' does not exist.`,
        });
      }

      const eventId = event.id;
      const eventCode = fields.eventCode?.value || (request.headers['x-event-code'] as string) || event.token || String(event.id);
      const guestCode = fields.guestCode?.value || (request.headers['x-guest-code'] as string) || null;
      const captureMode = fields.captureMode?.value || (request.headers['x-capture-mode'] as string) || null;
      const checkListId = fields.checkListId?.value || fields.checklistId?.value || (request.headers['x-checklist-id'] as string) || null;

      const fileBuffer = await data.toBuffer();
      const fileName = data.filename || 'photo.jpg';
      const mimeType = data.mimetype || 'image/jpeg';
      const isVideo = Boolean(
        mimeType.startsWith('video/') ||
        fileName.endsWith('.mp4') ||
        fileName.endsWith('.webm')
      );
      const storageKey = R2Service.generateStorageKey(eventId, fileName, {
        eventCode,
        guestCode,
        captureMode,
        checkListId,
      });

      let photoUrl = '';
      try {
        photoUrl = await R2Service.putObject(storageKey, fileBuffer, mimeType);
      } catch (err: any) {
        request.log.error(err, 'Failed to putObject to R2');
        return reply.status(500).send({
          error: 'R2UploadError',
          message: `Failed to upload photo to R2: ${err.message}`,
        });
      }

      // If video, process and upload video thumbnail to R2
      let thumbUrl = '';
      const rawThumbnail = fields.thumbnailBase64?.value || (request.headers['x-thumbnail-base64'] as string);
      if (isVideo && rawThumbnail && typeof rawThumbnail === 'string') {
        try {
          const base64Data = rawThumbnail.replace(/^data:[^;]+;base64,/, '');
          const thumbBuffer = Buffer.from(base64Data, 'base64');
          const thumbStorageKey = storageKey.replace(/\.[^.]+$/, '_thumb.jpg');
          thumbUrl = await R2Service.putObject(thumbStorageKey, thumbBuffer, 'image/jpeg');
        } catch (err: any) {
          request.log.warn(err, 'Failed to upload video thumbnail to R2');
        }
      }

      let uploader = fields.uploadedBy?.value;
      if (!uploader && request.user) {
        uploader = `${request.user.firstname || ''} ${request.user.lastname || ''}`.trim() || request.user.username;
      }
      if (!uploader) {
        uploader = 'Guest';
      }

      // Resolve snap_guest
      const guestId = await resolveSnapGuest(
        eventId,
        uploader,
        fields.deviceSerial?.value,
        fields.deviceName?.value,
        guestCode
      );

      // If this is a checklist moment capture/replacement, remove existing entry from snap_photos and R2
      const deletedPhotoIds: number[] = [];
      const eventToken = event?.token || String(eventId);
      const replacePhotoIdRaw = fields.replacePhotoId?.value || (request.headers['x-replace-photo-id'] as string);
      const replacePhotoId = replacePhotoIdRaw ? Number(replacePhotoIdRaw) : null;

      if (checkListId && guestId) {
        let oldChecklistPhotos: any[] = [];
        if (replacePhotoId) {
          oldChecklistPhotos = await db
            .select()
            .from(snapPhotos)
            .where(
              and(
                eq(snapPhotos.id, replacePhotoId),
                eq(snapPhotos.uploadedBy, guestId)
              )
            );
        }
        if (oldChecklistPhotos.length === 0) {
          oldChecklistPhotos = await db
            .select()
            .from(snapPhotos)
            .where(
              and(
                eq(snapPhotos.uploadedBy, guestId),
                eq(snapPhotos.checklistId, Number(checkListId))
              )
            );
        }

        for (const oldPhoto of oldChecklistPhotos) {
          deletedPhotoIds.push(oldPhoto.id);

          // 1. Delete old photo object from Cloudflare R2
          if (oldPhoto.storageKey) {
            try {
              await R2Service.deleteObject(oldPhoto.storageKey);
              const isOldVid = Boolean(
                oldPhoto.mimeType?.startsWith('video/') ||
                oldPhoto.fileName?.endsWith('.mp4') ||
                oldPhoto.fileName?.endsWith('.webm')
              );
              if (isOldVid) {
                const thumbKey = oldPhoto.storageKey.replace(/\.[^.]+$/, '_thumb.jpg');
                await R2Service.deleteObject(thumbKey).catch(() => {});
              }
            } catch (r2Err: any) {
              request.log.warn(r2Err, `[Photos] Failed to delete old R2 object: ${oldPhoto.storageKey}`);
            }
          }

          // 2. Delete likes associated with old photo
          try {
            await db.delete(snapPhotoLikes).where(eq(snapPhotoLikes.photoId, oldPhoto.id));
          } catch (likeErr: any) {
            request.log.warn(likeErr, `[Photos] Failed to delete likes for replaced photo ${oldPhoto.id}`);
          }

          // 3. Delete old photo from snapPhotos table
          try {
            await db.delete(snapPhotos).where(eq(snapPhotos.id, oldPhoto.id));
          } catch (dbErr: any) {
            request.log.warn(dbErr, `[Photos] Failed to delete replaced snap photo ${oldPhoto.id}`);
          }

          // 4. Broadcast photo_deleted to all subscribers in the event room so LiveGallery updates
          wsManager.broadcastToEvent(eventId, {
            type: 'photo_deleted',
            data: {
              photoId: oldPhoto.id,
              checklistId: oldPhoto.checklistId,
              eventId,
            },
          });
          if (eventToken && eventToken !== String(eventId)) {
            wsManager.broadcastToEvent(eventToken, {
              type: 'photo_deleted',
              data: {
                photoId: oldPhoto.id,
                checklistId: oldPhoto.checklistId,
                eventId,
              },
            });
          }
        }
      }

      const [newPhoto] = await db
        .insert(snapPhotos)
        .values({
          uploadedBy: guestId,
          checklistId: checkListId ? Number(checkListId) : null,
          url: photoUrl,
          fileName,
          fileSize: fileBuffer.length,
          mimeType,
          storageKey,
          status: 'completed',
        })
        .returning();

      // Format simplified photo and broadcast via WebSocket to live vault
      const simplifiedPhoto = formatSimplifiedPhoto({
        id: newPhoto.id,
        url: photoUrl,
        storageKey: newPhoto.storageKey,
        uploadedBy: uploader,
        createdAt: newPhoto.createdAt,
        likesCount: 0,
        isLiked: false,
        checklistId: newPhoto.checklistId,
        fileName: newPhoto.fileName,
        mimeType: newPhoto.mimeType,
        thumbnailUrl: thumbUrl || undefined,
      });

      wsManager.broadcastToEvent(eventId, {
        type: 'new_photo',
        photo: simplifiedPhoto,
      });
      if (eventToken && eventToken !== String(eventId)) {
        wsManager.broadcastToEvent(eventToken, {
          type: 'new_photo',
          photo: simplifiedPhoto,
        });
      }

      // If part of a Redis batch, update batch progress
      const batchId = fields.batchId?.value || (request.headers['x-batch-id'] as string);
      let batchProgress = null;
      if (batchId) {
        batchProgress = await BatchUploadService.recordFileCompleted(batchId, newPhoto.id);
        // Enqueue background processing job
        await photoUploadQueue.add('process-photo', {
          photoId: newPhoto.id,
          eventId,
          batchId,
          storageKey,
          fileName: newPhoto.fileName || 'photo.jpg',
          mimeType: newPhoto.mimeType || 'image/jpeg',
        });
      }

      return reply.status(201).send({
        message: 'Photo uploaded successfully',
        photo: {
          ...newPhoto,
          ...simplifiedPhoto,
          eventId,
          uploadedBy: uploader,
          guestId,
        },
        replacedPhotoId: deletedPhotoIds[0] || null,
        deletedPhotoIds,
        batch: batchProgress,
      });
    }
  );

  // =========================================================================
  // 6. LIST PHOTOS FOR EVENT (GET /events/:eventId)
  // =========================================================================
  app.get(
    '/events/:eventId',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'List Photos for Event',
        description: 'Retrieves all photos uploaded for an event, ordered newest first.',
        params: {
          type: 'object',
          required: ['eventId'],
          properties: {
            eventId: { type: ['integer', 'string'] },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            status: { type: 'string', default: 'completed' },
            userIdentifier: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { eventId } = request.params as any;
      const { page = 1, limit = 10, status = 'completed', userIdentifier: qUserIdentifier } =
        (request.query as any) || {};

      let resolvedEventId = Number(eventId);
      if (isNaN(resolvedEventId) || resolvedEventId <= 0) {
        let ev = await db.query.events.findFirst({
          where: eq(events.token, String(eventId)),
        });
        if (!ev && String(eventId) === 'demo-event') {
          ev = await db.query.events.findFirst();
        }
        resolvedEventId = ev ? ev.id : 0;
      }

      const numEventId = resolvedEventId;
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      const userIdentifier =
        qUserIdentifier ||
        (request.headers['x-guest-code'] as string) ||
        (request.headers['x-device-serial'] as string) ||
        (request.user ? String(request.user.id) : null) ||
        '';

      const whereClause = and(
        eq(snapGuests.eventId, numEventId),
        status ? eq(snapPhotos.status, status) : undefined
      );

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(snapPhotos)
        .innerJoin(snapGuests, eq(snapPhotos.uploadedBy, snapGuests.id))
        .where(whereClause);

      const rows = await db
        .select({
          id: snapPhotos.id,
          checklistId: snapPhotos.checklistId,
          url: snapPhotos.url,
          uploadedBy: snapGuests.name,
          guestId: snapGuests.id,
          deviceSerial: snapGuests.deviceSerial,
          deviceName: snapGuests.deviceName,
          uploadedAt: snapPhotos.createdAt,
          fileName: snapPhotos.fileName,
          fileSize: snapPhotos.fileSize,
          mimeType: snapPhotos.mimeType,
          storageKey: snapPhotos.storageKey,
          status: snapPhotos.status,
          createdAt: snapPhotos.createdAt,
          likesCount: sql<number>`(SELECT count(*)::int FROM snap_photo_likes WHERE snap_photo_likes.photo_id = ${snapPhotos.id})`.as('likes_count'),
          isLiked: userIdentifier
            ? sql<boolean>`EXISTS (SELECT 1 FROM snap_photo_likes WHERE snap_photo_likes.photo_id = ${snapPhotos.id} AND snap_photo_likes.user_identifier = ${userIdentifier})`.as('is_liked')
            : sql<boolean>`false`.as('is_liked'),
        })
        .from(snapPhotos)
        .innerJoin(snapGuests, eq(snapPhotos.uploadedBy, snapGuests.id))
        .where(whereClause)
        .orderBy(desc(snapPhotos.createdAt))
        .limit(limitNum)
        .offset(offset);

      const formattedPhotos = rows.map((p: any) =>
        formatSimplifiedPhoto({
          id: p.id,
          url: p.url,
          storageKey: p.storageKey,
          uploadedBy: p.uploadedBy,
          createdAt: p.createdAt,
          likesCount: p.likesCount,
          isLiked: p.isLiked,
          checklistId: p.checklistId,
          fileName: p.fileName,
          mimeType: p.mimeType,
        })
      );

      const total = totalResult?.count || 0;
      return reply.send({
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasMore: offset + rows.length < total,
        photos: formattedPhotos,
      });
    }
  );

  // =========================================================================
  // 6b. LIST ALL PHOTOS FOR GUEST IN EVENT (GET /events/:eventId/guests/:guestCode)
  // =========================================================================
  const getGuestPhotosHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { eventId, guestCode, guest_code } = (request.params as any) || {};
      const { status = 'completed', guestCode: qGuestCode, guest_code: qGuest_code } =
        (request.query as any) || {};

      let resolvedEventId = Number(eventId);
      if (isNaN(resolvedEventId) || resolvedEventId <= 0) {
        const [ev] = await db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.token, String(eventId)))
          .limit(1);
        if (!ev && String(eventId) === 'demo-event') {
          const [firstEv] = await db.select({ id: events.id }).from(events).limit(1);
          resolvedEventId = firstEv ? firstEv.id : 0;
        } else {
          resolvedEventId = ev ? ev.id : 0;
        }
      }

      const numEventId = resolvedEventId;
      const targetGuestCode =
        guestCode ||
        guest_code ||
        qGuestCode ||
        qGuest_code ||
        (request.headers['x-guest-code'] as string);

      if (!targetGuestCode) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'guest_code is required to fetch guest photos.',
        });
      }

      if (!numEventId) {
        return reply.send({
          total: 0,
          photos: [],
        });
      }

      const whereClause = and(
        eq(snapGuests.eventId, numEventId),
        eq(snapGuests.guestCode, String(targetGuestCode).trim()),
        status && status !== 'all' ? eq(snapPhotos.status, status) : undefined
      );

      const rows = await db
        .select({
          id: snapPhotos.id,
          checklistId: snapPhotos.checklistId,
          url: snapPhotos.url,
          uploadedBy: snapGuests.name,
          guestId: snapGuests.id,
          deviceSerial: snapGuests.deviceSerial,
          deviceName: snapGuests.deviceName,
          uploadedAt: snapPhotos.createdAt,
          fileName: snapPhotos.fileName,
          fileSize: snapPhotos.fileSize,
          mimeType: snapPhotos.mimeType,
          storageKey: snapPhotos.storageKey,
          status: snapPhotos.status,
          createdAt: snapPhotos.createdAt,
        })
        .from(snapPhotos)
        .innerJoin(snapGuests, eq(snapPhotos.uploadedBy, snapGuests.id))
        .where(whereClause)
        .orderBy(desc(snapPhotos.createdAt));

      const formattedPhotos = rows.map((p: any) =>
        formatSimplifiedGuestPhoto({
          id: p.id,
          url: p.url,
          storageKey: p.storageKey,
          uploadedBy: p.uploadedBy,
          createdAt: p.createdAt,
          checklistId: p.checklistId,
          fileName: p.fileName,
          mimeType: p.mimeType,
        })
      );

      return reply.send({
        total: formattedPhotos.length,
        photos: formattedPhotos,
      });
    } catch (err: any) {
      request.log.error(err, '[Photos] Error in getGuestPhotosHandler:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message || 'Failed to fetch guest photos',
        total: 0,
        photos: [],
      });
    }
  };

  app.get(
    '/events/:eventId/guests/:guestCode',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'List All Photos for Specific Guest in Event',
        description:
          'Retrieves all photos uploaded by a guest (linking eventId and guest_code to snap_guests), returning all items without limit and excluding like data.',
        params: {
          type: 'object',
          required: ['eventId', 'guestCode'],
          properties: {
            eventId: { type: ['integer', 'string'] },
            guestCode: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', default: 'completed' },
          },
        },
      },
    },
    getGuestPhotosHandler
  );

  // =========================================================================
  // 6c. LIST 1 PHOTO EACH CHECKLIST_ID (GET /events/:eventId/checklist-photos)
  // =========================================================================
  const getEventChecklistPhotosHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rawParam = (request.params as any)?.token || (request.params as any)?.eventId;
      const { format = 'object', includeEmpty = false } = (request.query as any) || {};

      let resolvedEventId = 0;
      if (rawParam) {
        // 1. Look up by event token
        const [ev] = await db
          .select({ id: events.id })
          .from(events)
          .where(eq(events.token, String(rawParam)))
          .limit(1);

        if (ev) {
          resolvedEventId = ev.id;
        } else if (String(rawParam) === 'demo-event') {
          const [firstEv] = await db.select({ id: events.id }).from(events).limit(1);
          resolvedEventId = firstEv ? firstEv.id : 0;
        } else {
          // 2. Fallback to numeric eventId
          const numId = Number(rawParam);
          if (!isNaN(numId) && numId > 0) {
            const [evById] = await db
              .select({ id: events.id })
              .from(events)
              .where(eq(events.id, numId))
              .limit(1);
            resolvedEventId = evById ? evById.id : 0;
          }
        }
      }

      if (!resolvedEventId) {
        if (format === 'array') {
          return reply.send([]);
        }
        return reply.send({
          total: 0,
          checklists: [],
          photos: [],
        });
      }

      // 1. Fetch event checklists for name lookup
      const checklistRows = await db
        .select({
          id: snapChecklist.id,
          name: snapChecklist.name,
          description: snapChecklist.description,
        })
        .from(snapChecklist)
        .where(eq(snapChecklist.eventId, resolvedEventId))
        .orderBy(snapChecklist.id);

      const checklistMap = new Map<number, { name: string; description: string | null }>();
      for (const c of checklistRows) {
        checklistMap.set(c.id, { name: c.name, description: c.description });
      }

      // 2. Fetch all completed photos for the event with their likes count
      const rows = await db
        .select({
          id: snapPhotos.id,
          checklistId: snapPhotos.checklistId,
          url: snapPhotos.url,
          uploadedBy: snapGuests.name,
          guestId: snapGuests.id,
          deviceSerial: snapGuests.deviceSerial,
          deviceName: snapGuests.deviceName,
          uploadedAt: snapPhotos.createdAt,
          fileName: snapPhotos.fileName,
          fileSize: snapPhotos.fileSize,
          mimeType: snapPhotos.mimeType,
          storageKey: snapPhotos.storageKey,
          status: snapPhotos.status,
          createdAt: snapPhotos.createdAt,
          likesCount: sql<number>`(SELECT count(*)::int FROM snap_photo_likes WHERE snap_photo_likes.photo_id = ${snapPhotos.id})`.as('likes_count'),
        })
        .from(snapPhotos)
        .innerJoin(snapGuests, eq(snapPhotos.uploadedBy, snapGuests.id))
        .where(
          and(
            eq(snapGuests.eventId, resolvedEventId),
            eq(snapPhotos.status, 'completed')
          )
        )
        .orderBy(desc(snapPhotos.createdAt));

      // 3. Group by checklist_id
      interface ChecklistGroup {
        checklistId: number | null;
        checklistName: string;
        name: string;
        description: string | null;
        totalPhotos: number;
        totalVideos: number;
        totalItems: number;
        topPhoto: any | null;
      }

      const groups = new Map<string, ChecklistGroup>();

      for (const p of rows) {
        const rawChecklistId = p.checklistId !== null && p.checklistId !== undefined ? Number(p.checklistId) : null;
        const groupKey = rawChecklistId === null ? 'null' : String(rawChecklistId);

        if (!groups.has(groupKey)) {
          let name = 'Quick Captures';
          let desc: string | null = null;
          if (rawChecklistId !== null) {
            const meta = checklistMap.get(rawChecklistId);
            name = meta?.name || `Checklist #${rawChecklistId}`;
            desc = meta?.description || null;
          }

          groups.set(groupKey, {
            checklistId: rawChecklistId,
            checklistName: name,
            name,
            description: desc,
            totalPhotos: 0,
            totalVideos: 0,
            totalItems: 0,
            topPhoto: null,
          });
        }

        const group = groups.get(groupKey)!;

        const isVid = Boolean(
          p.mimeType?.startsWith('video/') ||
          p.fileName?.endsWith('.mp4') ||
          p.fileName?.endsWith('.webm') ||
          p.url?.endsWith('.mp4') ||
          p.url?.endsWith('.webm')
        );

        if (isVid) {
          group.totalVideos += 1;
        } else {
          group.totalPhotos += 1;
        }
        group.totalItems += 1;

        // Determine if this photo is better than current top photo:
        // "it must return the very liked photo. If no likes then the first photo by id desc."
        const photoLikes = Number(p.likesCount || 0);
        let isBetter = false;

        if (!group.topPhoto) {
          isBetter = true;
        } else {
          const currentTopLikes = Number(group.topPhoto.likesCount || 0);
          if (photoLikes > currentTopLikes) {
            isBetter = true;
          } else if (photoLikes === currentTopLikes) {
            // If tied (or both 0 likes), pick the one with highest id (first by id desc)
            if (p.id > group.topPhoto.id) {
              isBetter = true;
            }
          }
        }

        if (isBetter) {
          group.topPhoto = {
            ...p,
            likesCount: photoLikes,
            isVideo: isVid,
          };
        }
      }

      // If includeEmpty=true, also add any checklist that has 0 photos
      if (includeEmpty === 'true' || includeEmpty === true) {
        for (const c of checklistRows) {
          const key = String(c.id);
          if (!groups.has(key)) {
            groups.set(key, {
              checklistId: c.id,
              checklistName: c.name,
              name: c.name,
              description: c.description,
              totalPhotos: 0,
              totalVideos: 0,
              totalItems: 0,
              topPhoto: null,
            });
          }
        }
      }

      // Convert groups to sorted array:
      // Quick Captures first (checklistId === null), then sorted by checklistId ascending
      const results = Array.from(groups.values()).map((g) => {
        const formattedPhoto = g.topPhoto
          ? formatSimplifiedPhoto({
            id: g.topPhoto.id,
            url: g.topPhoto.url,
            storageKey: g.topPhoto.storageKey,
            uploadedBy: g.topPhoto.uploadedBy,
            createdAt: g.topPhoto.createdAt,
            likesCount: g.topPhoto.likesCount,
            checklistId: g.topPhoto.checklistId,
            fileName: g.topPhoto.fileName,
            mimeType: g.topPhoto.mimeType,
          })
          : null;

        return {
          checklistId: g.checklistId,
          checklistName: g.checklistName,
          name: g.checklistName,
          description: g.description,
          totalPhotos: g.totalPhotos,
          totalVideos: g.totalVideos,
          totalItems: g.totalItems,
          photo: formattedPhoto,
          // Flat convenience properties matching the top photo
          id: formattedPhoto?.id ?? null,
          url: formattedPhoto?.fullUrl || formattedPhoto?.url || null,
          thumbnailUrl: formattedPhoto?.thumbnailUrl || null,
          fullUrl: formattedPhoto?.fullUrl || null,
          storageKey: formattedPhoto?.storageKey || g.topPhoto?.storageKey || null,
          storage_key: formattedPhoto?.storage_key || g.topPhoto?.storageKey || null,
          uploadedBy: formattedPhoto?.uploadedBy ?? null,
          createdAt: formattedPhoto?.createdAt ?? null,
          likesCount: formattedPhoto?.likesCount ?? 0,
          likes: formattedPhoto?.likesCount ?? 0,
          isVideo: formattedPhoto?.isVideo ?? false,
          type: formattedPhoto?.type ?? 'photo',
        };
      });

      results.sort((a, b) => {
        if (a.checklistId === null) return -1;
        if (b.checklistId === null) return 1;
        return (a.checklistId || 0) - (b.checklistId || 0);
      });

      if (format === 'array') {
        return reply.send(results);
      }

      return reply.send({
        total: results.length,
        checklists: results,
      });
    } catch (err: any) {
      request.log.error(err, '[Photos] Error in getEventChecklistPhotosHandler:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: err.message || 'Failed to fetch checklist photos',
        total: 0,
        checklists: [],
      });
    }
  };

  app.get(
    '/token/:token/checklist-photos',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'List 1 Top Photo for Each Checklist by Token',
        description:
          'Returns 1 photo for each checklist_id (most liked photo, or newest/highest id desc if tied/no likes), along with checklist name, total photos, and total videos by event token. Items with checklist_id = null are named "Quick Captures".',
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            format: { type: 'string', enum: ['object', 'array'], default: 'object' },
            includeEmpty: { type: 'boolean', default: false },
          },
        },
      },
    },
    getEventChecklistPhotosHandler
  );

  app.get('/token/:token/checklist-summary', { preHandler: [optionalAuthenticate] }, getEventChecklistPhotosHandler);
  app.get('/token/:token/checklists', { preHandler: [optionalAuthenticate] }, getEventChecklistPhotosHandler);
  app.get('/token/:token/albums', { preHandler: [optionalAuthenticate] }, getEventChecklistPhotosHandler);

  // Backward-compatibility aliases
  app.get('/events/:eventId/checklist-photos', { preHandler: [optionalAuthenticate] }, getEventChecklistPhotosHandler);
  app.get('/events/:eventId/checklist-summary', { preHandler: [optionalAuthenticate] }, getEventChecklistPhotosHandler);
  app.get('/events/:eventId/checklists', { preHandler: [optionalAuthenticate] }, getEventChecklistPhotosHandler);
  app.get('/events/:eventId/albums', { preHandler: [optionalAuthenticate] }, getEventChecklistPhotosHandler);

  // Background photos aliases (from event_photos table stored in R2)
  app.get(
    '/events/:eventId/backgrounds',
    { preHandler: [optionalAuthenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { eventId } = request.params as any;
      const isNumeric = /^\d+$/.test(String(eventId));
      const ev = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.token, String(eventId)), eq(events.id, Number(eventId)))
          : eq(events.token, String(eventId)),
      });
      if (!ev) {
        return reply.status(404).send({ error: 'Not Found', message: `Event '${eventId}' not found` });
      }
      const bgPhotos = await db.query.eventPhotos.findMany({
        where: eq(eventPhotos.eventId, ev.id),
        orderBy: (ep, { desc }) => [desc(ep.createdAt)],
      });
      return reply.send({ backgrounds: bgPhotos });
    }
  );
  app.get(
    '/token/:token/backgrounds',
    { preHandler: [optionalAuthenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as any;
      const ev = await db.query.events.findFirst({
        where: or(eq(events.token, String(token)), eq(events.id, Number(token) || 0)),
      });
      if (!ev) {
        return reply.status(404).send({ error: 'Not Found', message: `Event '${token}' not found` });
      }
      const bgPhotos = await db.query.eventPhotos.findMany({
        where: eq(eventPhotos.eventId, ev.id),
        orderBy: (ep, { desc }) => [desc(ep.createdAt)],
      });
      return reply.send({ backgrounds: bgPhotos });
    }
  );

  // =========================================================================
  // 7. GET SINGLE PHOTO METADATA (GET /:id)
  // =========================================================================
  app.get(
    '/:id',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Get Photo Details',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const photoId = Number(id);

      const photo = await db.query.snapPhotos.findFirst({
        where: eq(snapPhotos.id, photoId),
        with: {
          guest: {
            with: {
              event: true,
            },
          },
        },
      });

      if (!photo) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Photo with ID ${photoId} not found.`,
        });
      }

      const formatted = formatSimplifiedPhoto({
        id: photo.id,
        url: photo.url,
        storageKey: photo.storageKey,
        uploadedBy: (photo as any).guest?.name || 'Guest',
        createdAt: photo.createdAt,
        checklistId: photo.checklistId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
      });

      const guestInfo = (photo as any).guest;
      return reply.send({
        ...photo,
        ...formatted,
        eventId: guestInfo?.eventId || null,
        uploadedBy: guestInfo?.name || 'Guest',
        event: guestInfo?.event || null,
        guest: guestInfo || null,
      });
    }
  );

  // =========================================================================
  // 8. STREAM / PROXY PHOTO FILE (GET /:id/file)
  // =========================================================================
  app.get(
    '/:id/file',
    {
      schema: {
        tags: ['Photos'],
        summary: 'Stream / Proxy Photo File from R2',
        description: 'Serves the photo directly from Cloudflare R2 bucket with proper caching and Content-Type headers.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const photoId = Number(id);

      const photo = await db.query.snapPhotos.findFirst({
        where: eq(snapPhotos.id, photoId),
      });

      if (!photo || !photo.storageKey) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Photo with ID ${photoId} not found.`,
        });
      }

      const cleanKey = R2Service.cleanStorageKey(photo.storageKey);
      if (R2_PUBLIC_DOMAIN && !R2_PUBLIC_DOMAIN.includes('r2.cloudflarestorage.com')) {
        return reply.redirect(`${R2_PUBLIC_DOMAIN}/${cleanKey}`, 301);
      }

      try {
        const { buffer, contentType, contentLength, eTag } =
          await R2Service.getObjectBuffer(cleanKey);

        reply.header('Content-Type', contentType || photo.mimeType || 'image/jpeg');
        if (contentLength) {
          reply.header('Content-Length', contentLength);
        }
        if (eTag) {
          reply.header('ETag', eTag);
        }
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');

        return reply.send(buffer);
      } catch (err: any) {
        request.log.error(err, 'Failed to serve photo from R2');
        return reply.status(500).send({
          error: 'StreamError',
          message: `Failed to serve photo file: ${err.message}`,
        });
      }
    }
  );

  // =========================================================================
  // 8B. STREAM / PROXY PHOTO FILE BY STORAGE KEY (GET /view/*)
  // =========================================================================
  app.get(
    '/view/*',
    {
      schema: {
        tags: ['Photos'],
        summary: 'Stream / Proxy Photo by Storage Key',
        description: 'Serves any photo directly from Cloudflare R2 bucket by its storageKey path.',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawStorageKey = (request.params as any)['*'];
      if (!rawStorageKey) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Missing storageKey in path.',
        });
      }

      const storageKey = R2Service.cleanStorageKey(rawStorageKey);
      if (R2_PUBLIC_DOMAIN && !R2_PUBLIC_DOMAIN.includes('r2.cloudflarestorage.com')) {
        return reply.redirect(`${R2_PUBLIC_DOMAIN}/${storageKey}`, 301);
      }

      try {
        const { buffer, contentType, contentLength, eTag } =
          await R2Service.getObjectBuffer(storageKey);

        reply.header('Content-Type', contentType || 'image/jpeg');
        if (contentLength) {
          reply.header('Content-Length', contentLength);
        }
        if (eTag) {
          reply.header('ETag', eTag);
        }
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');

        return reply.send(buffer);
      } catch (err: any) {
        request.log.error(err, 'Failed to serve photo from R2 by key');
        return reply.status(404).send({
          error: 'NotFound',
          message: `Photo file not found: ${err.message}`,
        });
      }
    }
  );

  // =========================================================================
  // 9. DELETE PHOTO (DELETE /:id)
  // =========================================================================
  app.delete(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Delete Photo',
        description: 'Deletes photo from Cloudflare R2 bucket and removes database record.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const photoId = Number(id);

      const photo = await db.query.snapPhotos.findFirst({
        where: eq(snapPhotos.id, photoId),
      });

      if (!photo) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Photo with ID ${photoId} not found.`,
        });
      }

      // Delete from R2 bucket
      if (photo.storageKey) {
        try {
          await R2Service.deleteObject(photo.storageKey);
        } catch (err) {
          request.log.warn(err, `Failed to delete R2 object: ${photo.storageKey}`);
        }
      }

      // Delete from database
      await db.delete(snapPhotos).where(eq(snapPhotos.id, photoId));

      // Broadcast photo deletion via WebSocket
      if (photo.uploadedBy) {
        const guest = await db.query.snapGuests.findFirst({
          where: eq(snapGuests.id, photo.uploadedBy),
          with: { event: true },
        });
        if (guest) {
          wsManager.broadcastToEvent(guest.eventId, {
            type: 'photo_deleted',
            data: { photoId: photo.id, checklistId: photo.checklistId },
          });
          const evToken = (guest as any).event?.token;
          if (evToken && evToken !== String(guest.eventId)) {
            wsManager.broadcastToEvent(evToken, {
              type: 'photo_deleted',
              data: { photoId: photo.id, checklistId: photo.checklistId },
            });
          }
        }
      }

      return reply.send({
        message: 'Photo deleted successfully',
      });
    }
  );

  // =========================================================================
  // 10. TOGGLE PHOTO LIKE (POST /:id/like)
  // =========================================================================
  app.post(
    '/:id/like',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Toggle Like on Photo',
        description: 'Toggles a like for a photo by a guest/user and broadcasts update via WebSocket.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        body: {
          type: 'object',
          properties: {
            userIdentifier: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const photoId = Number(id);
      const body = (request.body as any) || {};

      let userIdentifier =
        body.userIdentifier ||
        (request.headers['x-guest-code'] as string) ||
        (request.headers['x-device-serial'] as string) ||
        (request.user ? String(request.user.id) : null) ||
        request.ip ||
        'anonymous';

      const result = await togglePhotoLike(photoId, userIdentifier);
      if (!result) {
        return reply.status(404).send({
          error: 'NotFound',
          message: `Photo with ID ${photoId} not found.`,
        });
      }

      // Broadcast like event to event WebSocket subscribers
      if (result.eventId) {
        const likeMsg = {
          type: 'photo_liked' as const,
          data: {
            photoId,
            likesCount: result.likesCount,
            userIdentifier,
          },
        };
        wsManager.broadcastToEvent(result.eventId, likeMsg);
        if (result.eventToken && result.eventToken !== String(result.eventId)) {
          wsManager.broadcastToEvent(result.eventToken, likeMsg);
        }
      }

      return reply.send({
        photoId,
        isLiked: result.isLiked,
        likesCount: result.likesCount,
      });
    }
  );

  // =========================================================================
  // 12. BATCH EVENT MEDIA DOWNLOAD (ZIP ARCHIVE VIA REDIS QUEUE)
  // =========================================================================

  // Helper to resolve event token or id
  const resolveEventForDownload = async (rawIdentifier: string) => {
    if (!rawIdentifier) return null;

    // 1. Try by token
    const [byToken] = await db
      .select({ id: events.id, name: events.name, token: events.token })
      .from(events)
      .where(eq(events.token, String(rawIdentifier)))
      .limit(1);

    if (byToken) return byToken;

    // 2. Try by numeric id
    const numId = Number(rawIdentifier);
    if (!isNaN(numId) && numId > 0) {
      const [byId] = await db
        .select({ id: events.id, name: events.name, token: events.token })
        .from(events)
        .where(eq(events.id, numId))
        .limit(1);

      if (byId) return byId;
    }

    return null;
  };

  /**
   * POST /token/:token/download-zip
   * Enqueue ZIP archive generation for all photos/videos of an event in Redis BullMQ
   */
  app.post(
    '/token/:token/download-zip',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Enqueue Event ZIP Archive Download',
        description: 'Enqueues background job to bundle all completed event photos/videos into a ZIP archive',
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { token } = request.params as { token: string };
        const ev = await resolveEventForDownload(token);

        if (!ev) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `Event '${token}' was not found`,
          });
        }

        const jobId = crypto.randomUUID();

        await enqueueZipArchiveJob({
          jobId,
          eventId: ev.id,
          eventToken: ev.token || undefined,
          eventName: ev.name || undefined,
          requestedAt: new Date().toISOString(),
        });

        request.log.info(`[Photos] Enqueued ZIP archive job ${jobId} for event ${ev.id} (${ev.token})`);

        return reply.status(202).send({
          success: true,
          jobId,
          eventId: ev.id,
          eventToken: ev.token || undefined,
          eventName: ev.name,
          status: 'queued',
          message: 'ZIP archive generation has been queued in Redis',
          statusUrl: `/api/photos/download-zip/${jobId}/status`,
          downloadUrl: `/api/photos/download-zip/${jobId}/file`,
        });
      } catch (err: any) {
        request.log.error(err, '[Photos] Error enqueuing ZIP archive download:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: err.message || 'Failed to queue ZIP archive download',
        });
      }
    }
  );

  // Alias for events/:eventId/download-zip
  app.post(
    '/events/:eventId/download-zip',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Photos'],
        summary: 'Enqueue Event ZIP Archive Download by Event ID',
        params: {
          type: 'object',
          required: ['eventId'],
          properties: {
            eventId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { eventId } = request.params as { eventId: string };
        const ev = await resolveEventForDownload(eventId);
        if (!ev) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `Event '${eventId}' was not found`,
          });
        }

        const jobId = crypto.randomUUID();
        await enqueueZipArchiveJob({
          jobId,
          eventId: ev.id,
          eventToken: ev.token || undefined,
          eventName: ev.name || undefined,
          requestedAt: new Date().toISOString(),
        });

        return reply.status(202).send({
          success: true,
          jobId,
          eventId: ev.id,
          eventToken: ev.token || undefined,
          status: 'queued',
          message: 'ZIP archive generation has been queued in Redis',
          statusUrl: `/api/photos/download-zip/${jobId}/status`,
          downloadUrl: `/api/photos/download-zip/${jobId}/file`,
        });
      } catch (err: any) {
        request.log.error(err, '[Photos] Error enqueuing ZIP archive download by eventId:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: err.message || 'Failed to queue ZIP archive download',
        });
      }
    }
  );

  /**
   * GET /download-zip/:jobId/status
   * Poll status and progress of the ZIP generation job
   */
  app.get(
    '/download-zip/:jobId/status',
    {
      schema: {
        tags: ['Photos'],
        summary: 'Check ZIP Archive Generation Status',
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const statusData = await getZipArchiveJobStatus(jobId);

        return reply.send({
          success: true,
          ...statusData,
          downloadUrl: statusData.status === 'completed' ? `/api/photos/download-zip/${jobId}/file` : undefined,
        });
      } catch (err: any) {
        request.log.error(err, '[Photos] Error fetching ZIP archive status:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: err.message || 'Failed to check status',
        });
      }
    }
  );

  /**
   * GET /download-zip/:jobId/file
   * Download the generated ZIP file
   */
  app.get(
    '/download-zip/:jobId/file',
    {
      schema: {
        tags: ['Photos'],
        summary: 'Download Completed Event ZIP File',
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const statusData = await getZipArchiveJobStatus(jobId);

        const filePath = path.join(ZIP_STORAGE_DIR, `${jobId}.zip`);

        if (!fs.existsSync(filePath)) {
          if (statusData.status === 'processing' || statusData.status === 'queued') {
            return reply.status(202).send({
              status: statusData.status,
              message: 'ZIP archive is still being prepared',
              progress: statusData.progress,
            });
          }
          return reply.status(404).send({
            error: 'Not Found',
            message: 'ZIP archive file does not exist or has expired',
          });
        }

        const stat = fs.statSync(filePath);
        const fileName = statusData.result?.fileName || `event-photos-${jobId.slice(0, 8)}.zip`;

        reply.header('Content-Type', 'application/zip');
        reply.header('Content-Length', stat.size);
        reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

        return reply.send(fs.createReadStream(filePath));
      } catch (err: any) {
        request.log.error(err, '[Photos] Error serving ZIP file:');
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: err.message || 'Failed to stream ZIP archive',
        });
      }
    }
  );

  // =========================================================================
  // 11. WEBSOCKET REAL-TIME SYNC (GET /ws/:eventId)
  // =========================================================================
  app.get(
    '/ws/:eventId',
    { websocket: true },
    (socket, request) => {
      const { eventId } = request.params as any;
      const resolvedEventId = String(eventId);

      wsManager.addSubscriber(resolvedEventId, socket);
      request.log.info(`[WebSocket] Connected to event room: ${resolvedEventId}`);

      socket.on('message', async (rawMsg: any) => {
        try {
          const parsed = JSON.parse(rawMsg.toString());
          if (parsed.action === 'like' && parsed.photoId) {
            const userIdentifier =
              parsed.userIdentifier ||
              (request.headers['x-guest-code'] as string) ||
              request.ip ||
              'anonymous';

            const res = await togglePhotoLike(Number(parsed.photoId), userIdentifier);
            if (res && res.eventId) {
              const likeMsg = {
                type: 'photo_liked' as const,
                data: {
                  photoId: Number(parsed.photoId),
                  likesCount: res.likesCount,
                  userIdentifier,
                },
              };
              wsManager.broadcastToEvent(res.eventId, likeMsg);
              if (res.eventToken && res.eventToken !== String(res.eventId)) {
                wsManager.broadcastToEvent(res.eventToken, likeMsg);
              }
            }
          }
        } catch (err: any) {
          request.log.warn({ err: err.message }, '[WebSocket] Error processing incoming message');
        }
      });

      socket.on('close', () => {
        wsManager.removeSubscriber(resolvedEventId, socket);
        request.log.info(`[WebSocket] Disconnected from event room: ${resolvedEventId}`);
      });
    }
  );
};
