import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db, events, users, guests, snapGuests, snapPhotos, snapChecklist, storeUsers, stores, Event, NewEvent } from '../db';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';

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
                    brideFirstname: { type: 'string', nullable: true },
                    brideLastname: { type: 'string', nullable: true },
                    groomFirstname: { type: 'string', nullable: true },
                    groomLastname: { type: 'string', nullable: true },
                    invitationDeadline: { type: 'string', nullable: true },
                    eventDate: { type: 'string', nullable: true },
                    weddingDate: { type: 'string', nullable: true },
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
        brideFirstname: e.brideFirstname,
        brideLastname: e.brideLastname,
        groomFirstname: e.groomFirstname,
        groomLastname: e.groomLastname,
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
  // 2. GET EVENT BY TOKEN (GET /token/:token)
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
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with token '${token}' not found.`,
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

      return reply.send({
        id: event.id,
        name: event.name,
        token: event.token,
        eventDate: event.eventDate,
        storeName,
      });
    }
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
        brideFirstname: event.brideFirstname,
        brideLastname: event.brideLastname,
        groomFirstname: event.groomFirstname,
        groomLastname: event.groomLastname,
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
            brideFirstname: { type: 'string' },
            brideLastname: { type: 'string' },
            groomFirstname: { type: 'string' },
            groomLastname: { type: 'string' },
            invitationDeadline: { type: 'string' },
            eventDate: { type: 'string' },
            weddingDate: { type: 'string' },
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
      const [newEvent] = await db
        .insert(events)
        .values({
          userId: targetUserId,
          token: generatedToken,
          name: body.name,
          brideFirstname: body.brideFirstname || null,
          brideLastname: body.brideLastname || null,
          groomFirstname: body.groomFirstname || null,
          groomLastname: body.groomLastname || null,
          invitationDeadline: body.invitationDeadline || null,
          eventDate: body.eventDate || null,
        })
        .returning();

      return reply.status(201).send({
        message: 'Event created successfully',
        event: {
          id: newEvent.id,
          name: newEvent.name,
          token: newEvent.token,
          eventDate: newEvent.eventDate,
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
            id: { type: 'integer' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            brideFirstname: { type: 'string' },
            brideLastname: { type: 'string' },
            groomFirstname: { type: 'string' },
            groomLastname: { type: 'string' },
            invitationDeadline: { type: 'string' },
            eventDate: { type: 'string' },
            weddingDate: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const eventId = Number(id);
      const body = request.body as any;

      const existing = await db.query.events.findFirst({
        where: eq(events.id, eventId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID ${eventId} not found.`,
        });
      }

      const updatePayload: Partial<NewEvent> = {};
      if (body.name !== undefined) updatePayload.name = body.name;
      if (body.brideFirstname !== undefined) updatePayload.brideFirstname = body.brideFirstname;
      if (body.brideLastname !== undefined) updatePayload.brideLastname = body.brideLastname;
      if (body.groomFirstname !== undefined) updatePayload.groomFirstname = body.groomFirstname;
      if (body.groomLastname !== undefined) updatePayload.groomLastname = body.groomLastname;
      if (body.invitationDeadline !== undefined) updatePayload.invitationDeadline = body.invitationDeadline;
      if (body.eventDate !== undefined) updatePayload.eventDate = body.eventDate;
      if (body.weddingDate !== undefined) updatePayload.eventDate = body.weddingDate;

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

      await db.delete(events).where(eq(events.id, eventId));

      return reply.send({
        message: 'Event deleted successfully',
      });
    }
  );
};

export const weddingRoutes = eventRoutes;
