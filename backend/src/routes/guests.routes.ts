import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db, guests, guestTables, events, snapGuests, Guest, NewGuest, GuestTable, NewGuestTable } from '../db';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { enqueueCreateSnapGuest } from '../queues/guestCreation.queue';

export const guestRoutes: FastifyPluginAsync = async (app) => {
  // =========================================================================
  // GUEST_TABLES ENDPOINTS (Put guest_tables to the guests file as requested)
  // =========================================================================

  // ==========================================
  // 1. LIST GUEST TABLES (GET /tables)
  // ==========================================
  app.get(
    '/tables',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'List Guest Tables',
        description: 'Retrieves all guest seating tables with seated guest counts and details.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search table name' },
          },
        },
        response: {
          200: {
            description: 'List of guest tables',
            type: 'object',
            properties: {
              total: { type: 'integer' },
              tables: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    guestCount: { type: 'integer' },
                    guests: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          firstname: { type: 'string' },
                          lastname: { type: 'string' },
                          status: { type: 'string', nullable: true },
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
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { search } = (request.query as any) || {};

      const whereClause = search ? ilike(guestTables.name, `%${search}%`) : undefined;

      const tableList = await db.query.guestTables.findMany({
        where: whereClause,
        with: {
          guests: true,
        },
      });

      const formatted = tableList.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        guestCount: t.guests?.length ?? 0,
        guests: (t.guests || []).map((g) => ({
          id: g.id,
          firstname: g.firstname,
          lastname: g.lastname,
          status: g.status,
        })),
      }));

      return reply.send({
        total: formatted.length,
        tables: formatted,
      });
    }
  );

  // ==========================================
  // 2. GET GUEST TABLE BY ID (GET /tables/:id)
  // ==========================================
  app.get(
    '/tables/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Get Guest Table by ID',
        description: 'Retrieves a single guest table with all guests assigned to it.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'Guest table details',
            type: 'object',
            properties: {
              table: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  guestCount: { type: 'integer' },
                  guests: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        weddingId: { type: 'integer' },
                        firstname: { type: 'string' },
                        lastname: { type: 'string' },
                        status: { type: 'string', nullable: true },
                        linkId: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Table not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const tableId = Number(id);

      const table = await db.query.guestTables.findFirst({
        where: eq(guestTables.id, tableId),
        with: {
          guests: true,
        },
      });

      if (!table) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Guest table with ID ${tableId} not found.`,
        });
      }

      return reply.send({
        table: {
          id: table.id,
          name: table.name,
          description: table.description,
          guestCount: table.guests.length,
          guests: table.guests,
        },
      });
    }
  );

  // ==========================================
  // 3. CREATE GUEST TABLE (POST /tables)
  // ==========================================
  app.post(
    '/tables',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Create Guest Table',
        description: 'Creates a new guest table for wedding seating arrangements.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', nullable: true },
          },
        },
        response: {
          201: {
            description: 'Guest table created successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Guest table created successfully' },
              table: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { name, description } = (request.body as any) || {};

      if (!name?.trim()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Table name is required.',
        });
      }

      const [newTable] = await db
        .insert(guestTables)
        .values({
          name: name.trim(),
          description: description ?? null,
        })
        .returning();

      return reply.status(201).send({
        message: 'Guest table created successfully',
        table: newTable,
      });
    }
  );

  // ==========================================
  // 4. UPDATE GUEST TABLE (PUT /tables/:id)
  // ==========================================
  app.put(
    '/tables/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Update Guest Table',
        description: 'Updates table name or description.',
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
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Guest table updated successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Guest table updated successfully' },
              table: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                },
              },
            },
          },
          404: {
            description: 'Table not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const tableId = Number(id);
      const body = (request.body as any) || {};

      const existing = await db.query.guestTables.findFirst({
        where: eq(guestTables.id, tableId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Guest table with ID ${tableId} not found.`,
        });
      }

      const updateData: Partial<NewGuestTable> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;

      const [updated] = await db
        .update(guestTables)
        .set(updateData)
        .where(eq(guestTables.id, tableId))
        .returning();

      return reply.send({
        message: 'Guest table updated successfully',
        table: updated,
      });
    }
  );

  // ==========================================
  // 5. DELETE GUEST TABLE (DELETE /tables/:id)
  // ==========================================
  app.delete(
    '/tables/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Delete Guest Table',
        description: 'Deletes guest table. Seated guests will have their tableId set to null (unseated).',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'Table deleted successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Guest table deleted successfully' },
            },
          },
          404: {
            description: 'Table not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const tableId = Number(id);

      const existing = await db.query.guestTables.findFirst({
        where: eq(guestTables.id, tableId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Guest table with ID ${tableId} not found.`,
        });
      }

      await db.delete(guestTables).where(eq(guestTables.id, tableId));

      return reply.send({
        message: 'Guest table deleted successfully',
      });
    }
  );

  // =========================================================================
  // GUESTS ENDPOINTS
  // =========================================================================

  // ==========================================
  // 6. LIST GUESTS (GET /)
  // ==========================================
  app.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'List Guests',
        description: 'Retrieves a paginated and filterable list of guests with populated table and wedding information.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            weddingId: { type: 'integer', description: 'Filter by wedding ID' },
            tableId: { type: 'integer', description: 'Filter by table ID' },
            status: { type: 'string', description: 'Filter by status (pending, attending, declined)' },
            search: { type: 'string', description: 'Search firstname, lastname, or linkId' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            description: 'List of guests',
            type: 'object',
            properties: {
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              guests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    weddingId: { type: 'integer' },
                    firstname: { type: 'string' },
                    lastname: { type: 'string' },
                    fullname: { type: 'string' },
                    linkId: { type: 'string', nullable: true },
                    status: { type: 'string', nullable: true },
                    tableId: { type: 'integer', nullable: true },
                    table: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                      },
                    },
                    wedding: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'integer' },
                        brideFirstname: { type: 'string' },
                        brideLastname: { type: 'string' },
                        groomFirstname: { type: 'string' },
                        groomLastname: { type: 'string' },
                        weddingDate: { type: 'string', nullable: true },
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
      const { weddingId, eventId, tableId, status, search, page = 1, limit = 50 } = (request.query as any) || {};
      const targetEventId = eventId || weddingId;
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 50;
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      if (targetEventId) conditions.push(eq(guests.eventId, Number(targetEventId)));
      if (tableId) conditions.push(eq(guests.tableId, Number(tableId)));
      if (status) conditions.push(eq(guests.status, status));
      if (search) {
        conditions.push(
          or(
            ilike(guests.firstname, `%${search}%`),
            ilike(guests.lastname, `%${search}%`),
            ilike(guests.linkId, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(guests)
        .where(whereClause);

      const guestList = await db.query.guests.findMany({
        where: whereClause,
        limit: limitNum,
        offset,
        with: {
          table: true,
          event: true,
        },
      });

      const formatted = guestList.map((g) => ({
        id: g.id,
        eventId: g.eventId,
        weddingId: g.eventId,
        firstname: g.firstname,
        lastname: g.lastname,
        fullname: `${g.lastname}, ${g.firstname}`,
        linkId: g.linkId,
        status: g.status,
        tableId: g.tableId,
        table: g.table
          ? {
              id: g.table.id,
              name: g.table.name,
              description: g.table.description,
            }
          : null,
        event: g.event,
        wedding: g.event
          ? {
              id: g.event.id,
              brideFirstname: g.event.brideFirstname,
              brideLastname: g.event.brideLastname,
              groomFirstname: g.event.groomFirstname,
              groomLastname: g.event.groomLastname,
              weddingDate: g.event.eventDate,
            }
          : null,
      }));

      return reply.send({
        total: totalCountResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        guests: formatted,
      });
    }
  );

  // ==========================================
  // 7. GET GUEST BY LINK ID (Public RSVP Lookup)
  // ==========================================
  app.get(
    '/by-link/:linkId',
    {
      preHandler: [optionalAuthenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Public Guest RSVP Lookup by Link ID',
        description: 'Allows guests to view their invitation status and table info using their unique linkId without authentication.',
        params: {
          type: 'object',
          required: ['linkId'],
          properties: {
            linkId: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'Guest details for RSVP page',
            type: 'object',
            properties: {
              guest: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  weddingId: { type: 'integer' },
                  firstname: { type: 'string' },
                  lastname: { type: 'string' },
                  fullname: { type: 'string' },
                  status: { type: 'string', nullable: true },
                  linkId: { type: 'string' },
                  tableId: { type: 'integer', nullable: true },
                  tableName: { type: 'string', nullable: true },
                  coupleNames: { type: 'string' },
                  weddingDate: { type: 'string', nullable: true },
                  invitationDeadline: { type: 'string', nullable: true },
                },
              },
            },
          },
          404: {
            description: 'Invitation link not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { linkId } = request.params as any;

      const guest = await db.query.guests.findFirst({
        where: eq(guests.linkId, linkId),
        with: {
          table: true,
          event: true,
        },
      });

      if (!guest) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `No invitation found matching link code: ${linkId}`,
        });
      }

      const coupleNames = guest.event
        ? `${guest.event.brideFirstname || ''} & ${guest.event.groomFirstname || ''} ${guest.event.groomLastname || ''}`.trim()
        : '';

      return reply.send({
        guest: {
          id: guest.id,
          eventId: guest.eventId,
          weddingId: guest.eventId,
          firstname: guest.firstname,
          lastname: guest.lastname,
          fullname: `${guest.lastname}, ${guest.firstname}`,
          status: guest.status,
          linkId: guest.linkId,
          tableId: guest.tableId,
          tableName: guest.table?.name ?? null,
          coupleNames,
          weddingDate: guest.event?.eventDate ?? null,
          invitationDeadline: guest.event?.invitationDeadline ?? null,
        },
      });
    }
  );

  // ==========================================
  // 8. PUBLIC RSVP SUBMISSION (POST /rsvp/:linkId)
  // ==========================================
  app.post(
    '/rsvp/:linkId',
    {
      schema: {
        tags: ['Guests'],
        summary: 'Public Guest RSVP Response',
        description: 'Updates RSVP response (attending or declined) using the invitation linkId.',
        params: {
          type: 'object',
          required: ['linkId'],
          properties: {
            linkId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['attending', 'declined', 'pending'] },
          },
        },
        response: {
          200: {
            description: 'RSVP recorded successfully',
            type: 'object',
            properties: {
              message: { type: 'string' },
              guest: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  firstname: { type: 'string' },
                  lastname: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
          404: {
            description: 'Guest not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { linkId } = request.params as any;
      const { status } = (request.body as any) || {};

      const guest = await db.query.guests.findFirst({
        where: eq(guests.linkId, linkId),
      });

      if (!guest) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `No invitation found matching link code: ${linkId}`,
        });
      }

      const [updated] = await db
        .update(guests)
        .set({ status })
        .where(eq(guests.id, guest.id))
        .returning();

      const message =
        status === 'attending'
          ? `Thank you ${guest.firstname}! Your attendance has been confirmed.`
          : status === 'declined'
          ? `Thank you for letting us know, ${guest.firstname}. We will miss you!`
          : `RSVP status updated to ${status}.`;

      return reply.send({
        message,
        guest: {
          id: updated.id,
          firstname: updated.firstname,
          lastname: updated.lastname,
          status: updated.status || 'pending',
        },
      });
    }
  );

  // ==========================================
  // 9. GET GUEST BY ID (GET /:id)
  // ==========================================
  app.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Get Guest by ID',
        description: 'Retrieves a single guest with table and wedding details.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'Guest details retrieved successfully',
            type: 'object',
            properties: {
              guest: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  weddingId: { type: 'integer' },
                  firstname: { type: 'string' },
                  lastname: { type: 'string' },
                  fullname: { type: 'string' },
                  linkId: { type: 'string', nullable: true },
                  status: { type: 'string', nullable: true },
                  tableId: { type: 'integer', nullable: true },
                  table: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                      description: { type: 'string', nullable: true },
                    },
                  },
                  wedding: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'integer' },
                      brideFirstname: { type: 'string' },
                      brideLastname: { type: 'string' },
                      groomFirstname: { type: 'string' },
                      groomLastname: { type: 'string' },
                      weddingDate: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Guest not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const guestId = Number(id);

      const guest = await db.query.guests.findFirst({
        where: eq(guests.id, guestId),
        with: {
          table: true,
          event: true,
        },
      });

      if (!guest) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Guest with ID ${guestId} not found.`,
        });
      }

      return reply.send({
        guest: {
          id: guest.id,
          eventId: guest.eventId,
          weddingId: guest.eventId,
          firstname: guest.firstname,
          lastname: guest.lastname,
          fullname: `${guest.lastname}, ${guest.firstname}`,
          linkId: guest.linkId,
          status: guest.status,
          tableId: guest.tableId,
          table: guest.table,
          event: guest.event,
          wedding: guest.event,
        },
      });
    }
  );

  // ==========================================
  // 10. CREATE GUEST (POST /)
  // ==========================================
  app.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Create Guest',
        description: 'Creates a new guest. If linkId is not provided, an 8-character unique hex code is generated automatically.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['weddingId', 'firstname', 'lastname'],
          properties: {
            weddingId: { type: 'integer' },
            firstname: { type: 'string', minLength: 1, maxLength: 100 },
            lastname: { type: 'string', minLength: 1, maxLength: 100 },
            linkId: { type: 'string', maxLength: 100 },
            status: { type: 'string', default: 'pending' },
            tableId: { type: 'integer', nullable: true },
          },
        },
        response: {
          201: {
            description: 'Guest created successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Guest created successfully' },
              guest: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  weddingId: { type: 'integer' },
                  firstname: { type: 'string' },
                  lastname: { type: 'string' },
                  linkId: { type: 'string', nullable: true },
                  status: { type: 'string', nullable: true },
                  tableId: { type: 'integer', nullable: true },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const {
        weddingId,
        eventId,
        firstname,
        lastname,
        linkId,
        status = 'pending',
        tableId,
      } = (request.body as any) || {};

      const targetEventId = Number(eventId || weddingId);
      if (!targetEventId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'eventId or weddingId is required.',
        });
      }

      if (!firstname?.trim() || !lastname?.trim()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Firstname and lastname are required.',
        });
      }

      // Verify event exists
      const event = await db.query.events.findFirst({
        where: eq(events.id, targetEventId),
      });
      if (!event) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Event with ID ${targetEventId} does not exist.`,
        });
      }

      // If tableId provided, verify table exists
      if (tableId) {
        const table = await db.query.guestTables.findFirst({
          where: eq(guestTables.id, Number(tableId)),
        });
        if (!table) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: `Guest table with ID ${tableId} does not exist.`,
          });
        }
      }

      const effectiveLinkId = linkId?.trim() || crypto.randomBytes(4).toString('hex');

      const [newGuest] = await db
        .insert(guests)
        .values({
          eventId: targetEventId,
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          linkId: effectiveLinkId,
          status: status || 'pending',
          tableId: tableId ? Number(tableId) : null,
        })
        .returning();

      return reply.status(201).send({
        message: 'Guest created successfully',
        guest: {
          ...newGuest,
          weddingId: newGuest.eventId,
        },
      });
    }
  );

  // ==========================================
  // 11. BATCH CREATE GUESTS (POST /batch)
  // ==========================================
  app.post(
    '/batch',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Batch Create Guests',
        description: 'Creates multiple guests for a wedding simultaneously.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['weddingId', 'guests'],
          properties: {
            weddingId: { type: 'integer' },
            guests: {
              type: 'array',
              items: {
                type: 'object',
                required: ['firstname', 'lastname'],
                properties: {
                  firstname: { type: 'string', minLength: 1 },
                  lastname: { type: 'string', minLength: 1 },
                  linkId: { type: 'string' },
                  status: { type: 'string', default: 'pending' },
                  tableId: { type: 'integer', nullable: true },
                },
              },
            },
          },
        },
        response: {
          201: {
            description: 'Guests created successfully',
            type: 'object',
            properties: {
              message: { type: 'string' },
              count: { type: 'integer' },
              guests: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    firstname: { type: 'string' },
                    lastname: { type: 'string' },
                    linkId: { type: 'string', nullable: true },
                    status: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { weddingId, eventId, guests: guestList } = (request.body as any) || {};
      const targetEventId = Number(eventId || weddingId);

      if (!targetEventId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'eventId or weddingId is required.',
        });
      }

      const event = await db.query.events.findFirst({
        where: eq(events.id, targetEventId),
      });
      if (!event) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Event with ID ${targetEventId} does not exist.`,
        });
      }

      if (!guestList || !Array.isArray(guestList) || guestList.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Guest list must contain at least one guest.',
        });
      }

      const valuesToInsert = guestList.map((g: any) => ({
        eventId: targetEventId,
        firstname: g.firstname.trim(),
        lastname: g.lastname.trim(),
        linkId: g.linkId?.trim() || crypto.randomBytes(4).toString('hex'),
        status: g.status || 'pending',
        tableId: g.tableId ? Number(g.tableId) : null,
      }));

      const created = await db.insert(guests).values(valuesToInsert).returning();

      return reply.status(201).send({
        message: `Successfully imported ${created.length} guests`,
        count: created.length,
        guests: created.map((g) => ({ ...g, weddingId: g.eventId })),
      });
    }
  );

  // ==========================================
  // 12. UPDATE GUEST (PUT /:id)
  // ==========================================
  app.put(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Update Guest',
        description: 'Updates details of an existing guest.',
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
            firstname: { type: 'string', minLength: 1, maxLength: 100 },
            lastname: { type: 'string', minLength: 1, maxLength: 100 },
            linkId: { type: 'string', maxLength: 100 },
            status: { type: 'string', maxLength: 50 },
            tableId: { type: 'integer', nullable: true },
            weddingId: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'Guest updated successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Guest updated successfully' },
              guest: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  weddingId: { type: 'integer' },
                  firstname: { type: 'string' },
                  lastname: { type: 'string' },
                  linkId: { type: 'string', nullable: true },
                  status: { type: 'string', nullable: true },
                  tableId: { type: 'integer', nullable: true },
                },
              },
            },
          },
          404: {
            description: 'Guest not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const guestId = Number(id);
      const body = (request.body as any) || {};

      const existing = await db.query.guests.findFirst({
        where: eq(guests.id, guestId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Guest with ID ${guestId} not found.`,
        });
      }

      const updateData: Partial<NewGuest> = {};
      if (body.firstname !== undefined) updateData.firstname = body.firstname;
      if (body.lastname !== undefined) updateData.lastname = body.lastname;
      if (body.linkId !== undefined) updateData.linkId = body.linkId;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.tableId !== undefined) updateData.tableId = body.tableId;
      if (body.eventId !== undefined) updateData.eventId = Number(body.eventId);
      if (body.weddingId !== undefined && body.eventId === undefined) updateData.eventId = Number(body.weddingId);

      const [updated] = await db
        .update(guests)
        .set(updateData)
        .where(eq(guests.id, guestId))
        .returning();

      return reply.send({
        message: 'Guest updated successfully',
        guest: updated,
      });
    }
  );

  // ==========================================
  // 13. QUICK STATUS UPDATE (PATCH /:id/status)
  // ==========================================
  app.patch(
    '/:id/status',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Update Guest Status',
        description: 'Updates only the RSVP/attendance status of a guest.',
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
          required: ['status'],
          properties: {
            status: { type: 'string', example: 'attending' },
          },
        },
        response: {
          200: {
            description: 'Status updated',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Guest status updated successfully' },
              guest: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  status: { type: 'string', nullable: true },
                },
              },
            },
          },
          404: {
            description: 'Guest not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const guestId = Number(id);
      const { status } = (request.body as any) || {};

      const existing = await db.query.guests.findFirst({
        where: eq(guests.id, guestId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Guest with ID ${guestId} not found.`,
        });
      }

      const [updated] = await db
        .update(guests)
        .set({ status })
        .where(eq(guests.id, guestId))
        .returning();

      return reply.send({
        message: 'Guest status updated successfully',
        guest: {
          id: updated.id,
          status: updated.status,
        },
      });
    }
  );

  // ==========================================
  // 14. DELETE GUEST (DELETE /:id)
  // ==========================================
  app.delete(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Guests'],
        summary: 'Delete Guest',
        description: 'Permanently deletes a guest record.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'Guest deleted successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Guest deleted successfully' },
            },
          },
          404: {
            description: 'Guest not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const guestId = Number(id);

      const existing = await db.query.guests.findFirst({
        where: eq(guests.id, guestId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Guest with ID ${guestId} not found.`,
        });
      }

      await db.delete(guests).where(eq(guests.id, guestId));

      return reply.send({
        message: 'Guest deleted successfully',
      });
    }
  );

  // ==========================================
  // 12. CREATE SNAP GUEST (POST /snap)
  // Redis BullMQ queue backed with concurrency serialization
  // ==========================================
  app.post(
    '/snap',
    {
      schema: {
        tags: ['Guests'],
        summary: 'Create Snap Guest',
        description: 'Creates a new snap guest for an event using Redis queue for concurrency. Returns guest id and generated guest_code.',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            guestName: { type: 'string' },
            eventToken: { type: 'string' },
            eventId: { type: ['integer', 'string'] },
            deviceSerial: { type: 'string' },
            deviceName: { type: 'string' },
          },
        },
        response: {
          201: {
            description: 'Snap guest created successfully',
            type: 'object',
            properties: {
              id: { type: 'integer' },
              guest_code: { type: 'string' },
              guestCode: { type: 'string' },
              name: { type: 'string' },
              eventId: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      const guestName = (body.name || body.guestName || 'Guest').trim() || 'Guest';
      const rawTokenOrId = body.eventToken || body.eventId;

      let resolvedEventId: number | null = null;
      if (rawTokenOrId) {
        const isNumeric = /^\d+$/.test(String(rawTokenOrId));
        const event = await db.query.events.findFirst({
          where: isNumeric
            ? or(eq(events.token, String(rawTokenOrId)), eq(events.id, Number(rawTokenOrId)))
            : eq(events.token, String(rawTokenOrId)),
        });
        if (event) {
          resolvedEventId = event.id;
        }
      }

      if (!resolvedEventId) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Event not found for provided token or ID.',
        });
      }

      const result = await enqueueCreateSnapGuest({
        eventId: resolvedEventId,
        name: guestName,
        deviceSerial: body.deviceSerial || null,
        deviceName: body.deviceName || null,
      });

      return reply.status(201).send({
        id: result.id,
        guest_code: result.guest_code,
        guestCode: result.guest_code,
        name: result.name,
        eventId: result.eventId,
      });
    }
  );
};

