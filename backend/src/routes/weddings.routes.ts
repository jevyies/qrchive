import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import { db, weddings, weddingUsers, users, guests, Wedding, NewWedding } from '../db';
import { authenticate } from '../middlewares/auth.middleware';

export const weddingRoutes: FastifyPluginAsync = async (app) => {
  // ==========================================
  // 1. LIST WEDDINGS
  // ==========================================
  app.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'List Weddings',
        description: 'Retrieves a paginated list of weddings with search by bride or groom names.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Search bride or groom name' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            description: 'List of weddings retrieved successfully',
            type: 'object',
            properties: {
              total: { type: 'integer', example: 5 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 50 },
              weddings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    brideFirstname: { type: 'string' },
                    brideLastname: { type: 'string' },
                    groomFirstname: { type: 'string' },
                    groomLastname: { type: 'string' },
                    coupleNames: { type: 'string' },
                    invitationDeadline: { type: 'string', nullable: true },
                    weddingDate: { type: 'string', nullable: true },
                    guestCount: { type: 'integer' },
                    userCount: { type: 'integer' },
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
            ilike(weddings.brideFirstname, `%${search}%`),
            ilike(weddings.brideLastname, `%${search}%`),
            ilike(weddings.groomFirstname, `%${search}%`),
            ilike(weddings.groomLastname, `%${search}%`)
          )
        : undefined;

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(weddings)
        .where(whereClause);

      const weddingList = await db.query.weddings.findMany({
        where: whereClause,
        limit: limitNum,
        offset,
        with: {
          guests: true,
          weddingUsers: true,
        },
      });

      const formatted = weddingList.map((w) => ({
        id: w.id,
        brideFirstname: w.brideFirstname,
        brideLastname: w.brideLastname,
        groomFirstname: w.groomFirstname,
        groomLastname: w.groomLastname,
        coupleNames: `${w.brideFirstname} & ${w.groomFirstname} ${w.groomLastname}`,
        invitationDeadline: w.invitationDeadline,
        weddingDate: w.weddingDate,
        guestCount: w.guests?.length ?? 0,
        userCount: w.weddingUsers?.length ?? 0,
      }));

      return reply.send({
        total: totalCountResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        weddings: formatted,
      });
    }
  );

  // ==========================================
  // 2. GET WEDDING BY ID
  // ==========================================
  app.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'Get Wedding by ID',
        description: 'Retrieves complete details of a wedding including guests summary and assigned users.',
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
            description: 'Wedding details retrieved successfully',
            type: 'object',
            properties: {
              wedding: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  brideFirstname: { type: 'string' },
                  brideLastname: { type: 'string' },
                  groomFirstname: { type: 'string' },
                  groomLastname: { type: 'string' },
                  coupleNames: { type: 'string' },
                  invitationDeadline: { type: 'string', nullable: true },
                  weddingDate: { type: 'string', nullable: true },
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
                        tableId: { type: 'integer', nullable: true },
                        linkId: { type: 'string', nullable: true },
                      },
                    },
                  },
                  users: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        firstname: { type: 'string' },
                        lastname: { type: 'string' },
                        email: { type: 'string', nullable: true },
                        username: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Wedding not found',
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
      const weddingId = Number(id);

      const wedding = await db.query.weddings.findFirst({
        where: eq(weddings.id, weddingId),
        with: {
          guests: true,
          weddingUsers: {
            with: {
              user: true,
            },
          },
        },
      });

      if (!wedding) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Wedding with ID ${weddingId} not found.`,
        });
      }

      const assignedUsers = wedding.weddingUsers.map((wu) => ({
        id: wu.user.id,
        firstname: wu.user.firstname,
        lastname: wu.user.lastname,
        email: wu.user.email,
        username: wu.user.username,
      }));

      return reply.send({
        wedding: {
          id: wedding.id,
          brideFirstname: wedding.brideFirstname,
          brideLastname: wedding.brideLastname,
          groomFirstname: wedding.groomFirstname,
          groomLastname: wedding.groomLastname,
          coupleNames: `${wedding.brideFirstname} & ${wedding.groomFirstname} ${wedding.groomLastname}`,
          invitationDeadline: wedding.invitationDeadline,
          weddingDate: wedding.weddingDate,
          guestCount: wedding.guests.length,
          guests: wedding.guests,
          users: assignedUsers,
        },
      });
    }
  );

  // ==========================================
  // 3. CREATE WEDDING
  // ==========================================
  app.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'Create Wedding',
        description: 'Creates a new wedding record and optionally links the creating user.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['brideFirstname', 'brideLastname', 'groomFirstname', 'groomLastname'],
          properties: {
            brideFirstname: { type: 'string', minLength: 1, maxLength: 100 },
            brideLastname: { type: 'string', minLength: 1, maxLength: 100 },
            groomFirstname: { type: 'string', minLength: 1, maxLength: 100 },
            groomLastname: { type: 'string', minLength: 1, maxLength: 100 },
            invitationDeadline: { type: 'string', nullable: true, format: 'date-time' },
            weddingDate: { type: 'string', nullable: true, format: 'date-time' },
            assignCurrentUser: { type: 'boolean', default: true, description: 'Link creating user to wedding_users' },
          },
        },
        response: {
          201: {
            description: 'Wedding created successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Wedding created successfully' },
              wedding: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  brideFirstname: { type: 'string' },
                  brideLastname: { type: 'string' },
                  groomFirstname: { type: 'string' },
                  groomLastname: { type: 'string' },
                  invitationDeadline: { type: 'string', nullable: true },
                  weddingDate: { type: 'string', nullable: true },
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
        brideFirstname,
        brideLastname,
        groomFirstname,
        groomLastname,
        invitationDeadline,
        weddingDate,
        assignCurrentUser = true,
      } = (request.body as any) || {};

      if (!brideFirstname?.trim() || !brideLastname?.trim() || !groomFirstname?.trim() || !groomLastname?.trim()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Bride and Groom first and last names are all required.',
        });
      }

      const [newWedding] = await db
        .insert(weddings)
        .values({
          brideFirstname: brideFirstname.trim(),
          brideLastname: brideLastname.trim(),
          groomFirstname: groomFirstname.trim(),
          groomLastname: groomLastname.trim(),
          invitationDeadline: invitationDeadline ?? null,
          weddingDate: weddingDate ?? null,
        })
        .returning();

      if (assignCurrentUser && request.user) {
        await db.insert(weddingUsers).values({
          weddingId: newWedding.id,
          userId: request.user.id,
        });
      }

      return reply.status(201).send({
        message: 'Wedding created successfully',
        wedding: newWedding,
      });
    }
  );

  // ==========================================
  // 4. UPDATE WEDDING
  // ==========================================
  app.put(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'Update Wedding',
        description: 'Updates information for an existing wedding.',
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
            brideFirstname: { type: 'string', minLength: 1, maxLength: 100 },
            brideLastname: { type: 'string', minLength: 1, maxLength: 100 },
            groomFirstname: { type: 'string', minLength: 1, maxLength: 100 },
            groomLastname: { type: 'string', minLength: 1, maxLength: 100 },
            invitationDeadline: { type: 'string', nullable: true, format: 'date-time' },
            weddingDate: { type: 'string', nullable: true, format: 'date-time' },
          },
        },
        response: {
          200: {
            description: 'Wedding updated successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Wedding updated successfully' },
              wedding: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  brideFirstname: { type: 'string' },
                  brideLastname: { type: 'string' },
                  groomFirstname: { type: 'string' },
                  groomLastname: { type: 'string' },
                  invitationDeadline: { type: 'string', nullable: true },
                  weddingDate: { type: 'string', nullable: true },
                },
              },
            },
          },
          404: {
            description: 'Wedding not found',
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
      const weddingId = Number(id);
      const body = (request.body as any) || {};

      const existing = await db.query.weddings.findFirst({
        where: eq(weddings.id, weddingId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Wedding with ID ${weddingId} not found.`,
        });
      }

      const updateData: Partial<NewWedding> = {};
      if (body.brideFirstname !== undefined) updateData.brideFirstname = body.brideFirstname;
      if (body.brideLastname !== undefined) updateData.brideLastname = body.brideLastname;
      if (body.groomFirstname !== undefined) updateData.groomFirstname = body.groomFirstname;
      if (body.groomLastname !== undefined) updateData.groomLastname = body.groomLastname;
      if (body.invitationDeadline !== undefined) updateData.invitationDeadline = body.invitationDeadline;
      if (body.weddingDate !== undefined) updateData.weddingDate = body.weddingDate;

      const [updatedWedding] = await db
        .update(weddings)
        .set(updateData)
        .where(eq(weddings.id, weddingId))
        .returning();

      return reply.send({
        message: 'Wedding updated successfully',
        wedding: updatedWedding,
      });
    }
  );

  // ==========================================
  // 5. DELETE WEDDING
  // ==========================================
  app.delete(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'Delete Wedding',
        description: 'Permanently deletes a wedding, cascading to guests, invitations, and wedding_users.',
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
            description: 'Wedding deleted successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Wedding deleted successfully' },
            },
          },
          404: {
            description: 'Wedding not found',
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
      const weddingId = Number(id);

      const existing = await db.query.weddings.findFirst({
        where: eq(weddings.id, weddingId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Wedding with ID ${weddingId} not found.`,
        });
      }

      await db.delete(weddings).where(eq(weddings.id, weddingId));

      return reply.send({
        message: 'Wedding deleted successfully',
      });
    }
  );

  // ==========================================
  // 6. GET WEDDING GUESTS (/:id/guests)
  // ==========================================
  app.get(
    '/:id/guests',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'Get Guests for Wedding',
        description: 'Retrieves all guests belonging to the specified wedding.',
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
            description: 'Wedding guests list',
            type: 'object',
            properties: {
              weddingId: { type: 'integer' },
              total: { type: 'integer' },
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
                    tableId: { type: 'integer', nullable: true },
                    linkId: { type: 'string', nullable: true },
                    table: {
                      type: 'object',
                      nullable: true,
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Wedding not found',
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
      const weddingId = Number(id);

      const wedding = await db.query.weddings.findFirst({
        where: eq(weddings.id, weddingId),
      });

      if (!wedding) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Wedding with ID ${weddingId} not found.`,
        });
      }

      const weddingGuests = await db.query.guests.findMany({
        where: eq(guests.weddingId, weddingId),
        with: {
          table: true,
        },
      });

      return reply.send({
        weddingId,
        total: weddingGuests.length,
        guests: weddingGuests,
      });
    }
  );

  // ==========================================
  // 7. GET USERS FOR WEDDING (/:id/users)
  // ==========================================
  app.get(
    '/:id/users',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'List Users Assigned to Wedding',
        description: 'Retrieves all users assigned to manage or coordinate this wedding.',
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
            description: 'Assigned users list',
            type: 'object',
            properties: {
              weddingId: { type: 'integer' },
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    mappingId: { type: 'integer' },
                    userId: { type: 'integer' },
                    firstname: { type: 'string' },
                    lastname: { type: 'string' },
                    email: { type: 'string', nullable: true },
                    username: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Wedding not found',
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
      const weddingId = Number(id);

      const wedding = await db.query.weddings.findFirst({
        where: eq(weddings.id, weddingId),
      });

      if (!wedding) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Wedding with ID ${weddingId} not found.`,
        });
      }

      const mappings = await db.query.weddingUsers.findMany({
        where: eq(weddingUsers.weddingId, weddingId),
        with: {
          user: true,
        },
      });

      const usersList = mappings.map((m) => ({
        mappingId: m.id,
        userId: m.user.id,
        firstname: m.user.firstname,
        lastname: m.user.lastname,
        email: m.user.email,
        username: m.user.username,
      }));

      return reply.send({
        weddingId,
        users: usersList,
      });
    }
  );

  // ==========================================
  // 8. ASSIGN USER TO WEDDING (POST /:id/users)
  // ==========================================
  app.post(
    '/:id/users',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'Assign User to Wedding',
        description: 'Links a user account to the specified wedding.',
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
          required: ['userId'],
          properties: {
            userId: { type: 'integer' },
          },
        },
        response: {
          201: {
            description: 'User assigned successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'User assigned to wedding successfully' },
              mapping: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  weddingId: { type: 'integer' },
                  userId: { type: 'integer' },
                },
              },
            },
          },
          404: {
            description: 'Wedding or user not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string' },
            },
          },
          409: {
            description: 'User already assigned',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Conflict' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const { userId } = (request.body as any) || {};
      const weddingId = Number(id);
      const targetUserId = Number(userId);

      const wedding = await db.query.weddings.findFirst({
        where: eq(weddings.id, weddingId),
      });
      if (!wedding) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Wedding with ID ${weddingId} not found.`,
        });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
      });
      if (!user) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `User with ID ${targetUserId} not found.`,
        });
      }

      const existing = await db.query.weddingUsers.findFirst({
        where: and(eq(weddingUsers.weddingId, weddingId), eq(weddingUsers.userId, targetUserId)),
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Conflict',
          message: `User ${targetUserId} is already assigned to wedding ${weddingId}.`,
        });
      }

      const [newMapping] = await db
        .insert(weddingUsers)
        .values({
          weddingId,
          userId: targetUserId,
        })
        .returning();

      return reply.status(201).send({
        message: 'User assigned to wedding successfully',
        mapping: newMapping,
      });
    }
  );

  // ==========================================
  // 9. REMOVE USER FROM WEDDING (DELETE /:id/users/:userId)
  // ==========================================
  app.delete(
    '/:id/users/:userId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Weddings'],
        summary: 'Remove User from Wedding',
        description: 'Unlinks a user from the wedding.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'User removed successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'User removed from wedding successfully' },
            },
          },
          404: {
            description: 'Mapping not found',
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
      const { id, userId } = request.params as any;
      const weddingId = Number(id);
      const targetUserId = Number(userId);

      const mapping = await db.query.weddingUsers.findFirst({
        where: and(eq(weddingUsers.weddingId, weddingId), eq(weddingUsers.userId, targetUserId)),
      });

      if (!mapping) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `User ${targetUserId} is not assigned to wedding ${weddingId}.`,
        });
      }

      await db.delete(weddingUsers).where(eq(weddingUsers.id, mapping.id));

      return reply.send({
        message: 'User removed from wedding successfully',
      });
    }
  );
};
