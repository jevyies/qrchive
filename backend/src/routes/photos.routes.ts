import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, desc, and, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, snapPhotos, snapGuests, photos, events, SnapPhoto, NewSnapPhoto, SnapGuest, NewSnapGuest } from '../db';
import { R2Service } from '../services/r2.service';
import { BatchUploadService } from '../services/batchUpload.service';
import { photoUploadQueue } from '../queues/photoUpload.queue';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

const TEMP_CHUNKS_DIR = path.join(__dirname, '../../uploads/temp_chunks');

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
  deviceName?: string | null
): Promise<number> {
  const name = (guestName || 'Guest').trim() || 'Guest';

  let existingGuest = null;
  if (deviceSerial) {
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
    return existingGuest.id;
  }

  const [newGuest] = await db
    .insert(snapGuests)
    .values({
      eventId,
      name,
      deviceSerial: deviceSerial || null,
      deviceName: deviceName || null,
    })
    .returning();

  return newGuest.id;
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
      const eventId = Number(body.eventId);

      // Verify that event exists in events table
      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
      });

      if (!event) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID ${eventId} does not exist.`,
        });
      }

      const originalFileName = body.fileName || 'photo.jpg';
      const mimeType = body.mimeType || 'image/jpeg';
      const storageKey = R2Service.generateStorageKey(eventId, originalFileName);

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
        body.deviceName
      );

      // Create record in snap_photos table (status: uploading)
      const [newPhoto] = await db
        .insert(snapPhotos)
        .values({
          uploadedBy: guestId,
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
      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, photoId),
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

      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, Number(photoId)),
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
        .update(photos)
        .set({
          url: photoUrl,
          status: 'completed',
        })
        .where(eq(photos.id, photo.id))
        .returning();

      // If part of a Redis batch, update batch progress
      const batchId = (request.body as any)?.batchId || (request.headers['x-batch-id'] as string);
      let batchProgress = null;
      if (batchId) {
        batchProgress = await BatchUploadService.recordFileCompleted(batchId, updatedPhoto.id);
        
        let guestEventId = 0;
        if (photo.uploadedBy) {
          const g = await db.query.snapGuests.findFirst({
            where: eq(snapGuests.id, photo.uploadedBy),
          });
          guestEventId = g?.eventId || 0;
        }

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
        photo: updatedPhoto,
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

      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, Number(photoId)),
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
        await fs.promises.rm(sessionDir, { recursive: true, force: true }).catch(() => {});
      }

      // Mark record as failed
      await db
        .update(photos)
        .set({ status: 'failed' })
        .where(eq(photos.id, photo.id));

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
      const eventId = Number(fields.eventId?.value || request.headers['x-event-id']);
      if (!eventId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'eventId is required.',
        });
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
      });
      if (!event) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID ${eventId} does not exist.`,
        });
      }

      const fileBuffer = await data.toBuffer();
      const fileName = data.filename || 'photo.jpg';
      const mimeType = data.mimetype || 'image/jpeg';
      const storageKey = R2Service.generateStorageKey(eventId, fileName);

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
        fields.deviceName?.value
      );

      const [newPhoto] = await db
        .insert(snapPhotos)
        .values({
          uploadedBy: guestId,
          url: photoUrl,
          fileName,
          fileSize: fileBuffer.length,
          mimeType,
          storageKey,
          status: 'completed',
        })
        .returning();

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
          eventId,
          uploadedBy: uploader,
          guestId,
        },
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
            eventId: { type: 'integer' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            status: { type: 'string', default: 'completed' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { eventId } = request.params as any;
      const { page = 1, limit = 50, status = 'completed' } = (request.query as any) || {};

      const numEventId = Number(eventId);
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 50;
      const offset = (pageNum - 1) * limitNum;

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
        .orderBy(desc(snapPhotos.createdAt))
        .limit(limitNum)
        .offset(offset);

      const formattedPhotos = rows.map((p: any) => {
        let url = p.url;
        if (!url || url.includes('r2.cloudflarestorage.com')) {
          url = R2Service.getPublicUrl(p.storageKey || '', p.id);
        }
        return {
          ...p,
          eventId: numEventId,
          url,
        };
      });

      return reply.send({
        total: totalResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        photos: formattedPhotos,
      });
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

      let url = photo.url;
      if (!url || url.includes('r2.cloudflarestorage.com')) {
        url = R2Service.getPublicUrl(photo.storageKey || '', photo.id);
      }

      const guestInfo = (photo as any).guest;
      return reply.send({
        ...photo,
        eventId: guestInfo?.eventId || null,
        uploadedBy: guestInfo?.name || 'Guest',
        event: guestInfo?.event || null,
        guest: guestInfo || null,
        url,
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

      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, photoId),
      });

      if (!photo || !photo.storageKey) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Photo with ID ${photoId} not found.`,
        });
      }

      try {
        const { buffer, contentType, contentLength, eTag } =
          await R2Service.getObjectBuffer(photo.storageKey);

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
      const storageKey = (request.params as any)['*'];
      if (!storageKey) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Missing storageKey in path.',
        });
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

      const photo = await db.query.photos.findFirst({
        where: eq(photos.id, photoId),
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
      await db.delete(photos).where(eq(photos.id, photoId));

      return reply.send({
        message: 'Photo deleted successfully',
      });
    }
  );
};
