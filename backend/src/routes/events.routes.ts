import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, events, users, guests, snapGuests, snapPhotos, snapChecklist, eventPhotos, storeUsers, stores, Event, NewEvent } from '../db';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { R2Service, R2_ROOT_FOLDER, R2_PUBLIC_DOMAIN } from '../services/r2.service';
import { enqueueBackgroundUploadJob, getBackgroundUploadJobStatus } from '../queues';

export const eventRoutes: FastifyPluginAsync = async (app) => {
  // ==========================================
  // 1. LIST EVENTS (GET /)
  // ==========================================
  app.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Events'],
        summary: 'List Events',
        description: 'Retrieves a paginated list of events with search by name, bride or groom names.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search event name, bride, or groom' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            description: 'List of events retrieved successfully',
            type: 'object',
            properties: {
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    userId: { type: 'integer' },
                    token: { type: 'string', nullable: true },
                    name: { type: 'string' },
                    eventCategory: { type: 'string', nullable: true },
                    paymentStatus: { type: 'string', nullable: true },
                    brideFirstname: { type: 'string', nullable: true },
                    brideLastname: { type: 'string', nullable: true },
                    groomFirstname: { type: 'string', nullable: true },
                    groomLastname: { type: 'string', nullable: true },
                    invitationDeadline: { type: 'string', nullable: true },
                    eventDate: { type: 'string', nullable: true },
                    weddingDate: { type: 'string', nullable: true },
                    isUnlimited: { type: 'boolean', nullable: true },
                    guestCount: { type: 'integer' },
                    photoCount: { type: 'integer' },
                    user: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'integer' },
                        firstname: { type: 'string', nullable: true },
                        lastname: { type: 'string', nullable: true },
                        email: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { search, page = 1, limit = 50 } = (request.query as any) || {};
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 50;
      const offset = (pageNum - 1) * limitNum;

      const whereClause = search
        ? or(
          ilike(events.name, `%${search}%`),
          ilike(events.brideFirstname, `%${search}%`),
          ilike(events.brideLastname, `%${search}%`),
          ilike(events.groomFirstname, `%${search}%`),
          ilike(events.groomLastname, `%${search}%`)
        )
        : undefined;

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(events)
        .where(whereClause);

      const eventList = await db.query.events.findMany({
        where: whereClause,
        limit: limitNum,
        offset,
        with: {
          guests: true,
          snapGuests: {
            with: {
              photos: true,
            },
          },
          user: true,
        },
      });

      const formatted = eventList.map((e) => ({
        id: e.id,
        userId: e.userId,
        token: e.token,
        name: e.name,
        eventCategory: e.eventCategory,
        paymentStatus: e.paymentStatus,
        brideFirstname: e.brideFirstname,
        brideLastname: e.brideLastname,
        groomFirstname: e.groomFirstname,
        groomLastname: e.groomLastname,
        maxGuest: e.maxGuest,
        price: e.price,
        isUnlimited: e.isUnlimited,
        invitationDeadline: e.invitationDeadline,
        eventDate: e.eventDate,
        weddingDate: e.eventDate,
        guestCount: e.guests?.length ?? 0,
        photoCount: (e as any).snapGuests?.reduce((sum: number, g: any) => sum + (g.photos?.length || 0), 0) ?? 0,
        user: e.user
          ? {
            id: e.user.id,
            firstname: e.user.firstname,
            lastname: e.user.lastname,
            email: e.user.email,
          }
          : null,
      }));

      return reply.send({
        total: totalCountResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        events: formatted,
      });
    }
  );

  // ==========================================
  // 2. GET MY EVENTS (GET /my)
  // Returns all events owned by the authenticated user (from JWT token id)
  // with all columns + computed status: 'active' | 'completed'
  // ==========================================
  app.get(
    '/my',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Events'],
        summary: 'Get My Events',
        description: 'Retrieves all events created by the authenticated user. Active = eventDate is in the future (or not set). Completed = eventDate has already passed.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search event name, bride, or groom' },
          },
        },
        response: {
          200: {
            description: 'List of events for the current user',
            type: 'object',
            properties: {
              total: { type: 'integer' },
              activeCount: { type: 'integer' },
              completedCount: { type: 'integer' },
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    userId: { type: 'integer' },
                    token: { type: 'string', nullable: true },
                    name: { type: 'string' },
                    eventCategory: { type: 'string', nullable: true },
                    paymentStatus: { type: 'string', nullable: true },
                    brideFirstname: { type: 'string', nullable: true },
                    brideLastname: { type: 'string', nullable: true },
                    groomFirstname: { type: 'string', nullable: true },
                    groomLastname: { type: 'string', nullable: true },
                    maxGuest: { type: 'integer', nullable: true },
                    price: { type: 'string', nullable: true },
                    isUnlimited: { type: 'boolean', nullable: true },
                    photoExpiry: { type: 'string', nullable: true },
                    invitationDeadline: { type: 'string', nullable: true },
                    eventDate: { type: 'string', nullable: true },
                    createdAt: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'completed'] },
                    guestCount: { type: 'integer' },
                    photoCount: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const currentUserId = (request.user as any)?.id;
      if (!currentUserId) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token.' });
      }

      const { search } = (request.query as any) || {};

      const searchClause = search
        ? or(
          ilike(events.name, `%${search}%`),
          ilike(events.brideFirstname, `%${search}%`),
          ilike(events.brideLastname, `%${search}%`),
          ilike(events.groomFirstname, `%${search}%`),
          ilike(events.groomLastname, `%${search}%`)
        )
        : undefined;

      const whereClause = searchClause
        ? and(eq(events.userId, currentUserId), searchClause)
        : eq(events.userId, currentUserId);

      const eventList = await db.query.events.findMany({
        where: whereClause,
        orderBy: (e, { desc }) => [desc(e.createdAt)],
        with: {
          guests: true,
          snapGuests: {
            with: { photos: true },
          },
        },
      });

      const now = new Date();

      const formatted = eventList.map((e) => {
        const isCompleted = e.eventDate ? new Date(e.eventDate) < now : false;
        return {
          id: e.id,
          userId: e.userId,
          token: e.token,
          name: e.name,
          eventCategory: e.eventCategory,
          paymentStatus: e.paymentStatus,
          brideFirstname: e.brideFirstname,
          brideLastname: e.brideLastname,
          groomFirstname: e.groomFirstname,
          groomLastname: e.groomLastname,
          maxGuest: e.maxGuest,
          price: e.price,
          isUnlimited: e.isUnlimited,
          photoExpiry: e.photoExpiry,
          invitationDeadline: e.invitationDeadline,
          eventDate: e.eventDate,
          createdAt: e.createdAt,
          status: isCompleted ? 'completed' : 'active',
          guestCount: e.guests?.length ?? 0,
          photoCount: (e as any).snapGuests?.reduce((sum: number, g: any) => sum + (g.photos?.length || 0), 0) ?? 0,
        };
      });

      const activeCount = formatted.filter(e => e.status === 'active').length;
      const completedCount = formatted.filter(e => e.status === 'completed').length;

      return reply.send({
        total: formatted.length,
        activeCount,
        completedCount,
        events: formatted,
      });
    }
  );

  // ==========================================
  // 2b. GET EVENT BY TOKEN (GET /token/:token)
  // ==========================================
  app.get(
    '/token/:token',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Events'],
        summary: 'Get Event by Public Token',
        description: 'Retrieves public event information by event token (used for guest photo uploads and RSVPs).',
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
      const { token } = request.params as any;
      const isNumeric = /^\d+$/.test(token);
      const event = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.token, token), eq(events.id, Number(token)))
          : eq(events.token, token),
        with: {
          guests: true,
          snapGuests: {
            with: {
              photos: true,
            },
          },
        },
      });

      if (!event) {
        return reply.status(200).send({
          error: true,
          message: 'Event not found',
        });
      }

      // Return the data of the storeName from stores table using link to user to store (if no link return storeName: null)
      let storeName: string | null = null;
      if (event.userId) {
        const storeUser = await db.query.storeUsers.findFirst({
          where: eq(storeUsers.userId, event.userId),
          with: {
            store: true,
          },
        });
        if (storeUser?.store?.name) {
          storeName = storeUser.store.name;
        }
      }

      // Return the photos of the event
      const photos = await db.query.eventPhotos.findMany({
        where: eq(eventPhotos.eventId, event.id),
      });

      return reply.send({
        id: event.id,
        name: event.name,
        token: event.token,
        eventCategory: event.eventCategory,
        paymentStatus: event.paymentStatus,
        eventDate: event.eventDate,
        weddingDate: event.eventDate,
        photoExpiry: event.photoExpiry,
        isUnlimited: event.isUnlimited,
        brideFirstname: event.brideFirstname,
        brideLastname: event.brideLastname,
        groomFirstname: event.groomFirstname,
        groomLastname: event.groomLastname,
        invitationDeadline: event.invitationDeadline,
        maxGuest: event.maxGuest,
        price: event.price,
        storeName,
        photos: photos.map((p) => ({
          url: p.url,
          type: p.type,
          cropData: p.cropData,
        })),
      });
    }
  );

  // ==========================================
  // 2c. GET EVENT STATS BY TOKEN (GET /token/:token/stats)
  // [id, event_date, photo_expiry, totalPhotos, totalVideos, totalGigabytes, totalUsers (total uploaders)]
  // ==========================================
  const handleGetEventStats = async (request: FastifyRequest, reply: FastifyReply) => {
    const rawToken = (request.params as any).token || (request.params as any).id;
    const isNumeric = /^\d+$/.test(String(rawToken));
    let event = await db.query.events.findFirst({
      where: isNumeric
        ? or(eq(events.token, String(rawToken)), eq(events.id, Number(rawToken)))
        : eq(events.token, String(rawToken)),
    });

    if (!event && String(rawToken) === 'demo-event') {
      event = await db.query.events.findFirst();
    }

    if (!event) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Event with token or ID '${rawToken}' not found.`,
      });
    }

    // Fetch completed photos and videos for stats
    const mediaRows = await db
      .select({
        id: snapPhotos.id,
        uploadedBy: snapPhotos.uploadedBy,
        fileSize: snapPhotos.fileSize,
        mimeType: snapPhotos.mimeType,
        fileName: snapPhotos.fileName,
        url: snapPhotos.url,
      })
      .from(snapPhotos)
      .innerJoin(snapGuests, eq(snapPhotos.uploadedBy, snapGuests.id))
      .where(
        and(
          eq(snapGuests.eventId, event.id),
          eq(snapPhotos.status, 'completed')
        )
      );

    let totalPhotos = 0;
    let totalVideos = 0;
    let totalBytes = 0;
    const uploaderSet = new Set<number>();

    for (const item of mediaRows) {
      const isVideo = Boolean(
        item.mimeType?.startsWith('video/') ||
        item.fileName?.endsWith('.mp4') ||
        item.fileName?.endsWith('.webm') ||
        item.url?.endsWith('.mp4') ||
        item.url?.endsWith('.webm')
      );

      if (isVideo) {
        totalVideos += 1;
      } else {
        totalPhotos += 1;
      }

      if (item.fileSize) {
        totalBytes += Number(item.fileSize);
      }

      if (item.uploadedBy) {
        uploaderSet.add(Number(item.uploadedBy));
      }
    }

    const totalUsers = uploaderSet.size;
    const rawGb = totalBytes / (1024 * 1024 * 1024);
    let totalGigabytes = 0;
    if (totalBytes > 0) {
      totalGigabytes = rawGb < 0.01 ? Number(rawGb.toFixed(4)) : Number(rawGb.toFixed(2));
    }

    // Fetch backgrounds from event_photos
    const backgroundRows = await db.query.eventPhotos.findMany({
      where: eq(eventPhotos.eventId, event.id),
      orderBy: (ep, { desc }) => [desc(ep.createdAt)],
    });
    const deskCropped = backgroundRows.find((b) => b.type === 'desktop_cropped');
    const mobCropped = backgroundRows.find((b) => b.type === 'mobile_cropped');
    const origBackground = backgroundRows.find((b) => b.type === 'original' || b.type === 'mobile_original' || b.type === 'desktop_original');

    return reply.send({
      id: event.id,
      name: event.name,
      token: event.token,
      eventCategory: event.eventCategory,
      event_category: event.eventCategory,
      paymentStatus: event.paymentStatus,
      payment_status: event.paymentStatus,
      isUnlimited: event.isUnlimited,
      is_unlimited: event.isUnlimited,
      event_date: event.eventDate,
      photo_expiry: event.photoExpiry,
      totalPhotos,
      totalVideos,
      totalGigabytes,
      totalUsers,
      desktopCroppedUrl: deskCropped?.url || null,
      mobileCroppedUrl: mobCropped?.url || null,
      originalUrl: origBackground?.url || null,
      backgrounds: backgroundRows,
      // camelCase aliases for convenience
      eventDate: event.eventDate,
      weddingDate: event.eventDate,
      photoExpiry: event.photoExpiry,
      totalUploaders: totalUsers,
      totalBytes,
      brideFirstname: event.brideFirstname,
      brideLastname: event.brideLastname,
      groomFirstname: event.groomFirstname,
      groomLastname: event.groomLastname,
      invitationDeadline: event.invitationDeadline,
      maxGuest: event.maxGuest,
      price: event.price,
    });
  };

  app.get(
    '/token/:token/stats',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Events'],
        summary: 'Get Event Stats by Public Token',
        description: 'Retrieves event stats (id, event_date, photo_expiry, totalPhotos, totalVideos, totalGigabytes, totalUsers) by event token.',
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    handleGetEventStats
  );

  // ==========================================
  // 2b. GET EVENT CHECKLIST (GET /token/:token/checklist & GET /:id/checklist)
  // ==========================================
  const handleGetEventChecklist = async (request: FastifyRequest, reply: FastifyReply) => {
    const rawId = (request.params as any).token || (request.params as any).id;
    const isNumeric = /^\d+$/.test(String(rawId));
    let event = await db.query.events.findFirst({
      where: isNumeric
        ? or(eq(events.token, String(rawId)), eq(events.id, Number(rawId)))
        : eq(events.token, String(rawId)),
    });

    if (!event && String(rawId) === 'demo-event') {
      event = await db.query.events.findFirst();
    }

    if (!event) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Event with token or ID '${rawId}' not found.`,
      });
    }

    const checklist = await db
      .select({
        id: snapChecklist.id,
        name: snapChecklist.name,
        description: snapChecklist.description,
      })
      .from(snapChecklist)
      .where(eq(snapChecklist.eventId, event.id))
      .orderBy(snapChecklist.id);

    if (String(rawId) === 'demo-event' && checklist.length === 0) {
      return reply.send([
        { id: 1, name: "Couple's Grand Entrance", description: 'Grand applause walking into the hall' },
        { id: 2, name: "Couple's First Dance", description: 'Under the romantic ballroom lights' },
        { id: 3, name: 'Dance with Parents', description: 'Tender father-daughter & mother-son dance' },
        { id: 4, name: 'Guests Laughing', description: 'Hearty laughs and cheerful table toasts' },
        { id: 5, name: 'The Emcee on Stage', description: 'Lively hosting and games introduction' },
        { id: 6, name: "Groom's Surprise Number", description: 'Secret performance for the bride' },
      ]);
    }

    return reply.send(checklist);
  };

  app.get(
    '/token/:token/checklist',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Events'],
        summary: 'Get Event Checklist by Public Token',
        description: 'Retrieves all checklist items (only id, name, description) for an event by token.',
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    handleGetEventChecklist
  );

  app.get(
    '/:id/checklist',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Events'],
        summary: 'Get Event Checklist by Event ID or Token',
        description: 'Retrieves all checklist items (only id, name, description) for an event by ID or token.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    handleGetEventChecklist
  );

  // ==========================================
  // Checklists CRUD (Add, Update, Delete)
  // ==========================================
  app.post(
    '/:id/checklist',
    { preHandler: [optionalAuthenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const isNumeric = /^\d+$/.test(String(id));
      const event = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.token, String(id)), eq(events.id, Number(id)))
          : eq(events.token, String(id)),
      });

      if (!event) {
        return reply.status(404).send({ error: 'Not Found', message: `Event '${id}' not found` });
      }

      const body = request.body as any;
      const name = body?.name?.trim();
      if (!name) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Checklist item name is required' });
      }

      const [item] = await db
        .insert(snapChecklist)
        .values({
          eventId: event.id,
          name,
          description: body.description ? body.description.trim() : null,
        })
        .returning();

      return reply.status(201).send(item);
    }
  );

  app.put(
    '/:id/checklist/:checklistId',
    { preHandler: [optionalAuthenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { checklistId } = request.params as any;
      const numId = Number(checklistId);
      if (isNaN(numId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid checklist ID' });
      }

      const body = request.body as any;
      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;

      const [updated] = await db
        .update(snapChecklist)
        .set(updateData)
        .where(eq(snapChecklist.id, numId))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Not Found', message: 'Checklist item not found' });
      }

      return reply.send(updated);
    }
  );

  app.delete(
    '/:id/checklist/:checklistId',
    { preHandler: [optionalAuthenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { checklistId } = request.params as any;
      const numId = Number(checklistId);
      if (isNaN(numId)) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid checklist ID' });
      }

      await db.delete(snapChecklist).where(eq(snapChecklist.id, numId));
      return reply.send({ success: true, message: 'Checklist item deleted successfully' });
    }
  );

  // ==========================================
  // Event Background Photos (GET & POST)
  // ==========================================
  app.get(
    '/:id/backgrounds',
    { preHandler: [optionalAuthenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const isNumeric = /^\d+$/.test(String(id));
      const event = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.token, String(id)), eq(events.id, Number(id)))
          : eq(events.token, String(id)),
      });

      if (!event) {
        return reply.status(404).send({ error: 'Not Found', message: `Event '${id}' not found` });
      }

      const photos = await db.query.eventPhotos.findMany({
        where: eq(eventPhotos.eventId, event.id),
        orderBy: (ep, { desc }) => [desc(ep.createdAt)],
      });

      return reply.send({ backgrounds: photos });
    }
  );

  app.post(
    '/:id/backgrounds',
    {
      bodyLimit: 100 * 1024 * 1024, // 100MB for multi-image high-res background uploads
      preHandler: [optionalAuthenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const isNumeric = /^\d+$/.test(String(id));
      const event = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.token, String(id)), eq(events.id, Number(id)))
          : eq(events.token, String(id)),
      });

      if (!event) {
        return reply.status(404).send({ error: 'Not Found', message: `Event '${id}' not found` });
      }

      const body = request.body as any;
      const itemsToProcess: Array<{
        type: string;
        dataUrl?: string;
        url?: string;
        fileName?: string;
        cropData?: any;
      }> = [];

      if (Array.isArray(body?.items)) {
        itemsToProcess.push(...body.items);
      } else {
        if (body?.original) itemsToProcess.push({ type: 'original', ...body.original });
        if (body?.mobileOriginal) itemsToProcess.push({ type: 'mobile_original', ...body.mobileOriginal });
        if (body?.mobileCropped) itemsToProcess.push({ type: 'mobile_cropped', ...body.mobileCropped });
        if (body?.desktopOriginal) itemsToProcess.push({ type: 'desktop_original', ...body.desktopOriginal });
        if (body?.desktopCropped) itemsToProcess.push({ type: 'desktop_cropped', ...body.desktopCropped });
      }

      if (itemsToProcess.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No background items provided for upload',
        });
      }

      const jobId = crypto.randomUUID();

      await enqueueBackgroundUploadJob({
        jobId,
        eventId: event.id,
        eventToken: event.token || undefined,
        items: itemsToProcess,
        requestedAt: new Date().toISOString(),
      });

      request.log.info(`[BackgroundUpload] Enqueued background upload job ${jobId} for event ${event.id}`);

      // If synchronous waiting is requested via ?sync=true, wait for job completion
      if ((request.query as any)?.sync === 'true') {
        const startTime = Date.now();
        while (Date.now() - startTime < 60000) {
          await new Promise((r) => setTimeout(r, 400));
          const currentStatus = await getBackgroundUploadJobStatus(jobId);
          if (currentStatus.status === 'completed') {
            return reply.send({
              success: true,
              message: 'Event background photos saved successfully to R2 storage',
              backgrounds: currentStatus.result?.savedResults || [],
              jobId,
            });
          }
          if (currentStatus.status === 'failed') {
            return reply.status(500).send({
              error: 'BackgroundProcessingFailed',
              message: currentStatus.error || 'Failed to process background photos in queue',
              jobId,
            });
          }
        }
      }

      return reply.status(202).send({
        success: true,
        message: 'Event background upload queued successfully in BullMQ',
        jobId,
        status: 'queued',
        statusUrl: `/api/events/${event.id}/backgrounds/status/${jobId}`,
        eventId: event.id,
      });
    }
  );

  // GET /:id/backgrounds/status/:jobId - Poll background upload job progress
  app.get(
    '/:id/backgrounds/status/:jobId',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Events'],
        summary: 'Check Background Upload Job Status',
        description: 'Polls the status and progress of an asynchronous event background upload job in BullMQ',
        params: {
          type: 'object',
          required: ['id', 'jobId'],
          properties: {
            id: { type: 'string' },
            jobId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { jobId } = request.params as any;
      const statusData = await getBackgroundUploadJobStatus(jobId);
      return reply.send(statusData);
    }
  );

  app.get(
    '/photos/local/:fileName',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(410).send({
        error: 'Gone',
        message: 'Local background photo storage has been retired. Photos are stored in Cloudflare R2 storage.',
      });
    }
  );

  app.get(
    '/:id/stats',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Events'],
        summary: 'Get Event Stats by ID or Token',
        description: 'Retrieves event information and stats (totalPhotos, totalVideos, totalGigabytes, totalUsers) by event ID or token.',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    handleGetEventStats
  );

  app.get('/:id/summary', { preHandler: [optionalAuthenticate] }, handleGetEventStats);

  // ==========================================
  // 3. GET SINGLE EVENT BY ID (GET /:id)
  // ==========================================
  app.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Events'],
        summary: 'Get Event by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const numId = Number(id);

      const event = isNaN(numId)
        ? await db.query.events.findFirst({
          where: eq(events.token, id),
          with: { guests: true, snapGuests: { with: { photos: true } }, user: true },
        })
        : await db.query.events.findFirst({
          where: eq(events.id, numId),
          with: { guests: true, snapGuests: { with: { photos: true } }, user: true },
        });

      if (!event) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with identifier '${id}' not found.`,
        });
      }

      return reply.send({
        id: event.id,
        userId: event.userId,
        token: event.token,
        name: event.name,
        eventCategory: event.eventCategory,
        paymentStatus: event.paymentStatus,
        brideFirstname: event.brideFirstname,
        brideLastname: event.brideLastname,
        groomFirstname: event.groomFirstname,
        groomLastname: event.groomLastname,
        maxGuest: event.maxGuest,
        price: event.price,
        isUnlimited: event.isUnlimited,
        photoExpiry: event.photoExpiry,
        invitationDeadline: event.invitationDeadline,
        eventDate: event.eventDate,
        weddingDate: event.eventDate,
        guestCount: event.guests?.length ?? 0,
        photoCount: (event as any).snapGuests?.reduce((sum: number, g: any) => sum + (g.photos?.length || 0), 0) ?? 0,
        user: event.user,
        guests: event.guests,
      });
    }
  );

  // ==========================================
  // 4. CREATE EVENT (POST /)
  // ==========================================
  app.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Events'],
        summary: 'Create Event',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            token: { type: 'string' },
            eventCategory: { type: 'string' },
            event_category: { type: 'string' },
            paymentStatus: { type: 'string' },
            payment_status: { type: 'string' },
            brideFirstname: { type: 'string' },
            brideLastname: { type: 'string' },
            groomFirstname: { type: 'string' },
            groomLastname: { type: 'string' },
            invitationDeadline: { type: 'string' },
            eventDate: { type: 'string' },
            weddingDate: { type: 'string' },
            photoExpiry: { type: 'string' },
            isUnlimited: { type: 'boolean' },
            is_unlimited: { type: 'boolean' },
            maxGuest: { type: 'integer' },
            price: { type: ['string', 'number'] },
            userId: { type: 'integer' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;
      const currentUserId = (request.user as any)?.id;
      const targetUserId = body.userId ? Number(body.userId) : currentUserId;

      if (!targetUserId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'A valid userId is required to create an event.',
        });
      }

      const generatedToken = body.token || crypto.randomBytes(4).toString('hex');
      const targetEventDate = body.eventDate || body.weddingDate || null;

      let photoExpiry: string | null = body.photoExpiry || body.photo_expiry || null;

      if (targetEventDate) {
        const eventDateObj = new Date(targetEventDate);
        if (!isNaN(eventDateObj.getTime())) {
          const photoExpiryDate = new Date(eventDateObj);
          photoExpiryDate.setDate(photoExpiryDate.getDate() + 60);
          photoExpiry = photoExpiryDate.toISOString();
        }
      }

      const isUnlimitedVal =
        body.isUnlimited !== undefined && body.isUnlimited !== null
          ? Boolean(body.isUnlimited)
          : body.is_unlimited !== undefined && body.is_unlimited !== null
            ? Boolean(body.is_unlimited)
            : false;

      const [newEvent] = await db
        .insert(events)
        .values({
          userId: targetUserId,
          token: generatedToken,
          name: body.name,
          eventCategory: body.eventCategory || body.event_category || 'Wedding',
          paymentStatus: body.paymentStatus || body.payment_status || 'pending',
          brideFirstname: body.brideFirstname || body.bride_firstname || null,
          brideLastname: body.brideLastname || body.bride_lastname || null,
          groomFirstname: body.groomFirstname || body.groom_firstname || null,
          groomLastname: body.groomLastname || body.groom_lastname || null,
          invitationDeadline: body.invitationDeadline || null,
          eventDate: targetEventDate,
          photoExpiry: photoExpiry,
          isUnlimited: isUnlimitedVal,
          maxGuest: body.maxGuest !== undefined && body.maxGuest !== null ? Number(body.maxGuest) : null,
          price: body.price !== undefined && body.price !== null ? String(body.price) : null,
        })
        .returning();

      return reply.status(201).send({
        message: 'Event created successfully',
        event: {
          id: newEvent.id,
          name: newEvent.name,
          token: newEvent.token,
          eventCategory: newEvent.eventCategory,
          paymentStatus: newEvent.paymentStatus,
          eventDate: newEvent.eventDate,
          photoExpiry: newEvent.photoExpiry,
          isUnlimited: newEvent.isUnlimited,
        },
      });
    }
  );

  // ==========================================
  // 5. UPDATE EVENT (PUT /:id)
  // ==========================================
  app.put(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Events'],
        summary: 'Update Event',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: ['integer', 'string'] },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            eventCategory: { type: 'string' },
            event_category: { type: 'string' },
            paymentStatus: { type: 'string' },
            payment_status: { type: 'string' },
            brideFirstname: { type: 'string' },
            brideLastname: { type: 'string' },
            groomFirstname: { type: 'string' },
            groomLastname: { type: 'string' },
            invitationDeadline: { type: 'string' },
            eventDate: { type: 'string' },
            weddingDate: { type: 'string' },
            photoExpiry: { type: 'string' },
            isUnlimited: { type: 'boolean' },
            is_unlimited: { type: 'boolean' },
            maxGuest: { type: 'integer' },
            price: { type: ['string', 'number'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const isNumeric = /^\d+$/.test(String(id));
      const body = request.body as any;

      const existing = await db.query.events.findFirst({
        where: isNumeric
          ? or(eq(events.id, Number(id)), eq(events.token, String(id)))
          : eq(events.token, String(id)),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID or token '${id}' not found.`,
        });
      }

      const eventId = existing.id;

      const updatePayload: Partial<NewEvent> = {};
      if (body.name !== undefined) updatePayload.name = body.name;
      if (body.eventCategory !== undefined) updatePayload.eventCategory = body.eventCategory;
      if (body.event_category !== undefined) updatePayload.eventCategory = body.event_category;
      if (body.paymentStatus !== undefined) updatePayload.paymentStatus = body.paymentStatus;
      if (body.payment_status !== undefined) updatePayload.paymentStatus = body.payment_status;
      if (body.brideFirstname !== undefined) updatePayload.brideFirstname = body.brideFirstname;
      if (body.brideLastname !== undefined) updatePayload.brideLastname = body.brideLastname;
      if (body.groomFirstname !== undefined) updatePayload.groomFirstname = body.groomFirstname;
      if (body.groomLastname !== undefined) updatePayload.groomLastname = body.groomLastname;
      if (body.invitationDeadline !== undefined) updatePayload.invitationDeadline = body.invitationDeadline;
      const newEventDate = body.eventDate !== undefined ? body.eventDate : body.weddingDate;
      if (newEventDate !== undefined) {
        updatePayload.eventDate = newEventDate;
        if (newEventDate) {
          const eventDateObj = new Date(newEventDate);
          if (!isNaN(eventDateObj.getTime())) {
            const photoExpiryDate = new Date(eventDateObj);
            photoExpiryDate.setDate(photoExpiryDate.getDate() + 60);
            updatePayload.photoExpiry = photoExpiryDate.toISOString();
          }
        }
      }
      if (body.photoExpiry !== undefined) updatePayload.photoExpiry = body.photoExpiry;
      if (body.photo_expiry !== undefined) updatePayload.photoExpiry = body.photo_expiry;
      if (body.isUnlimited !== undefined) updatePayload.isUnlimited = Boolean(body.isUnlimited);
      if (body.is_unlimited !== undefined) updatePayload.isUnlimited = Boolean(body.is_unlimited);
      if (body.maxGuest !== undefined) updatePayload.maxGuest = body.maxGuest !== null ? Number(body.maxGuest) : null;
      if (body.price !== undefined) updatePayload.price = body.price !== null ? String(body.price) : null;

      const [updated] = await db
        .update(events)
        .set(updatePayload)
        .where(eq(events.id, eventId))
        .returning();

      return reply.send({
        message: 'Event updated successfully',
        event: updated,
      });
    }
  );

  // ==========================================
  // 6. DELETE EVENT (DELETE /:id)
  // ==========================================
  app.delete(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Events'],
        summary: 'Delete Event',
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
      const eventId = Number(id);

      const existing = await db.query.events.findFirst({
        where: eq(events.id, eventId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID ${eventId} not found.`,
        });
      }

      // Clean up event_photos from R2 storage before deleting event
      try {
        const bgPhotos = await db.query.eventPhotos.findMany({
          where: eq(eventPhotos.eventId, eventId),
        });
        for (const p of bgPhotos) {
          if (p.storageKey) {
            await R2Service.deleteObject(p.storageKey).catch(() => { });
          }
        }
      } catch (r2Err) {
        request.log.warn({ err: r2Err }, `Failed to clean up event ${eventId} background photos from R2`);
      }

      await db.delete(events).where(eq(events.id, eventId));

      return reply.send({
        message: 'Event deleted successfully',
      });
    }
  );
};

export const weddingRoutes = eventRoutes;
