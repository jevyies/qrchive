import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, ilike, or, and, sql } from 'drizzle-orm';
import { db, stores, storeUsers, users, Store, NewStore } from '../db';
import { authenticate } from '../middlewares/auth.middleware';

export const storeRoutes: FastifyPluginAsync = async (app) => {
  // ==========================================
  // 1. LIST STORES
  // ==========================================
  app.get(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'List Stores',
        description: 'Retrieves a paginated list of stores with optional search by name or email.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Filter by store name or email' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          },
        },
        response: {
          200: {
            description: 'List of stores retrieved successfully',
            type: 'object',
            properties: {
              total: { type: 'integer', example: 10 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 50 },
              stores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    email: { type: 'string' },
                    driveDetails: { type: 'object', nullable: true, additionalProperties: true },
                    defaultPassword: { type: 'string', nullable: true },
                    dateStarted: { type: 'string', nullable: true },
                    createdAt: { type: 'string' },
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
        ? or(ilike(stores.name, `%${search}%`), ilike(stores.email, `%${search}%`))
        : undefined;

      const [totalCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(stores)
        .where(whereClause);

      const storeList = await db.query.stores.findMany({
        where: whereClause,
        limit: limitNum,
        offset,
        with: {
          storeUsers: true,
        },
      });

      const formattedStores = storeList.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        email: s.email,
        driveDetails: s.driveDetails,
        defaultPassword: s.defaultPassword,
        dateStarted: s.dateStarted,
        createdAt: s.createdAt,
        userCount: s.storeUsers?.length ?? 0,
      }));

      return reply.send({
        total: totalCountResult?.count || 0,
        page: pageNum,
        limit: limitNum,
        stores: formattedStores,
      });
    }
  );

  // ==========================================
  // 2. GET STORE BY ID
  // ==========================================
  app.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Get Store Details by ID',
        description: 'Retrieves store information along with all assigned users.',
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
            description: 'Store details retrieved successfully',
            type: 'object',
            properties: {
              store: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  email: { type: 'string' },
                  driveDetails: { type: 'object', nullable: true, additionalProperties: true },
                  defaultPassword: { type: 'string', nullable: true },
                  dateStarted: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
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
                        status: { type: 'string' },
                        authPosition: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Store not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string', example: 'Store not found' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const storeId = Number(id);

      const store = await db.query.stores.findFirst({
        where: eq(stores.id, storeId),
        with: {
          storeUsers: {
            with: {
              user: true,
            },
          },
        },
      });

      if (!store) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Store with ID ${storeId} not found.`,
        });
      }

      const assignedUsers = store.storeUsers.map((su) => ({
        id: su.user.id,
        firstname: su.user.firstname,
        lastname: su.user.lastname,
        email: su.user.email,
        username: su.user.username,
        status: su.user.status,
        authPosition: su.user.authPosition,
      }));

      return reply.send({
        store: {
          id: store.id,
          name: store.name,
          description: store.description,
          email: store.email,
          driveDetails: store.driveDetails,
          defaultPassword: store.defaultPassword,
          dateStarted: store.dateStarted,
          createdAt: store.createdAt,
          users: assignedUsers,
        },
      });
    }
  );

  // ==========================================
  // 3. CREATE STORE
  // ==========================================
  app.post(
    '/',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Create Store',
        description: 'Creates a new store and optionally assigns the creating user or specified user.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            description: { type: 'string', nullable: true },
            driveDetails: { type: 'object', nullable: true, additionalProperties: true },
            defaultPassword: { type: 'string', nullable: true, maxLength: 255 },
            dateStarted: { type: 'string', nullable: true, description: 'YYYY-MM-DD' },
            assignCurrentUser: { type: 'boolean', default: true, description: 'Automatically assign creator to store_users' },
          },
        },
        response: {
          201: {
            description: 'Store created successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Store created successfully' },
              store: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  email: { type: 'string' },
                  driveDetails: { type: 'object', nullable: true, additionalProperties: true },
                  defaultPassword: { type: 'string', nullable: true },
                  dateStarted: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
          400: {
            description: 'Invalid input',
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
        name,
        email,
        description,
        driveDetails,
        defaultPassword,
        dateStarted,
        assignCurrentUser = true,
      } = (request.body as any) || {};

      if (!name?.trim() || !email?.trim()) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Store name and email are required.',
        });
      }

      const [newStore] = await db
        .insert(stores)
        .values({
          name: name.trim(),
          email: email.trim(),
          description: description ?? null,
          driveDetails: driveDetails ?? null,
          defaultPassword: defaultPassword ?? null,
          dateStarted: dateStarted ?? null,
        })
        .returning();

      // If user is authenticated and assignCurrentUser is true, assign to storeUsers
      if (assignCurrentUser && request.user) {
        await db.insert(storeUsers).values({
          storeId: newStore.id,
          userId: request.user.id,
        });
      }

      return reply.status(201).send({
        message: 'Store created successfully',
        store: newStore,
      });
    }
  );

  // ==========================================
  // 4. UPDATE STORE
  // ==========================================
  app.put(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Update Store',
        description: 'Updates details of an existing store.',
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
            name: { type: 'string', minLength: 1, maxLength: 255 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            description: { type: 'string', nullable: true },
            driveDetails: { type: 'object', nullable: true, additionalProperties: true },
            defaultPassword: { type: 'string', nullable: true, maxLength: 255 },
            dateStarted: { type: 'string', nullable: true },
          },
        },
        response: {
          200: {
            description: 'Store updated successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Store updated successfully' },
              store: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  email: { type: 'string' },
                  driveDetails: { type: 'object', nullable: true, additionalProperties: true },
                  defaultPassword: { type: 'string', nullable: true },
                  dateStarted: { type: 'string', nullable: true },
                  createdAt: { type: 'string' },
                },
              },
            },
          },
          404: {
            description: 'Store not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string', example: 'Store not found' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const storeId = Number(id);
      const body = (request.body as any) || {};

      const existing = await db.query.stores.findFirst({
        where: eq(stores.id, storeId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Store with ID ${storeId} not found.`,
        });
      }

      const updateData: Partial<NewStore> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.driveDetails !== undefined) updateData.driveDetails = body.driveDetails;
      if (body.defaultPassword !== undefined) updateData.defaultPassword = body.defaultPassword;
      if (body.dateStarted !== undefined) updateData.dateStarted = body.dateStarted;

      const [updatedStore] = await db
        .update(stores)
        .set(updateData)
        .where(eq(stores.id, storeId))
        .returning();

      return reply.send({
        message: 'Store updated successfully',
        store: updatedStore,
      });
    }
  );

  // ==========================================
  // 5. DELETE STORE
  // ==========================================
  app.delete(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Delete Store',
        description: 'Permanently deletes a store and removes user assignments (cascading).',
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
            description: 'Store deleted successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Store deleted successfully' },
            },
          },
          404: {
            description: 'Store not found',
            type: 'object',
            properties: {
              error: { type: 'string', example: 'Not Found' },
              message: { type: 'string', example: 'Store not found' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const storeId = Number(id);

      const existing = await db.query.stores.findFirst({
        where: eq(stores.id, storeId),
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Store with ID ${storeId} not found.`,
        });
      }

      await db.delete(stores).where(eq(stores.id, storeId));

      return reply.send({
        message: 'Store deleted successfully',
      });
    }
  );

  // =========================================================================
  // STORE_USERS ENDPOINTS (Put store_users to stores file as requested)
  // =========================================================================

  // ==========================================
  // 6. GET USERS FOR STORE (/:id/users)
  // ==========================================
  app.get(
    '/:id/users',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'List Users Assigned to Store',
        description: 'Retrieves all users assigned to the specified store.',
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
            description: 'Users assigned to store',
            type: 'object',
            properties: {
              storeId: { type: 'integer' },
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
                    authPosition: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Store not found',
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
      const storeId = Number(id);

      const store = await db.query.stores.findFirst({
        where: eq(stores.id, storeId),
      });

      if (!store) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Store with ID ${storeId} not found.`,
        });
      }

      const mappings = await db.query.storeUsers.findMany({
        where: eq(storeUsers.storeId, storeId),
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
        authPosition: m.user.authPosition,
        status: m.user.status,
      }));

      return reply.send({
        storeId,
        users: usersList,
      });
    }
  );

  // ==========================================
  // 7. ASSIGN USER TO STORE (POST /:id/users)
  // ==========================================
  app.post(
    '/:id/users',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Assign User to Store',
        description: 'Assigns a user to the store. Rejects if user is already assigned.',
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
            description: 'User assigned to store successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'User assigned to store successfully' },
              mapping: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  storeId: { type: 'integer' },
                  userId: { type: 'integer' },
                },
              },
            },
          },
          404: {
            description: 'Store or user not found',
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
      const storeId = Number(id);
      const targetUserId = Number(userId);

      const store = await db.query.stores.findFirst({
        where: eq(stores.id, storeId),
      });
      if (!store) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Store with ID ${storeId} not found.`,
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

      const existingMapping = await db.query.storeUsers.findFirst({
        where: and(eq(storeUsers.storeId, storeId), eq(storeUsers.userId, targetUserId)),
      });

      if (existingMapping) {
        return reply.status(409).send({
          error: 'Conflict',
          message: `User ${targetUserId} is already assigned to store ${storeId}.`,
        });
      }

      const [newMapping] = await db
        .insert(storeUsers)
        .values({
          storeId,
          userId: targetUserId,
        })
        .returning();

      return reply.status(201).send({
        message: 'User assigned to store successfully',
        mapping: newMapping,
      });
    }
  );

  // ==========================================
  // 8. REMOVE USER FROM STORE (DELETE /:id/users/:userId)
  // ==========================================
  app.delete(
    '/:id/users/:userId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Remove User from Store',
        description: 'Removes user assignment from the specified store.',
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
            description: 'User removed from store',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'User removed from store successfully' },
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
      const storeId = Number(id);
      const targetUserId = Number(userId);

      const mapping = await db.query.storeUsers.findFirst({
        where: and(eq(storeUsers.storeId, storeId), eq(storeUsers.userId, targetUserId)),
      });

      if (!mapping) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `User ${targetUserId} is not assigned to store ${storeId}.`,
        });
      }

      await db.delete(storeUsers).where(eq(storeUsers.id, mapping.id));

      return reply.send({
        message: 'User removed from store successfully',
      });
    }
  );

  // ==========================================
  // 9. QUERY STORE-USER ASSIGNMENTS (GET /users)
  // ==========================================
  app.get(
    '/users',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Query Store Users Mappings',
        description: 'List store-user mappings with optional filters by storeId or userId.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            storeId: { type: 'integer' },
            userId: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'Store user mappings list',
            type: 'object',
            properties: {
              mappings: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    storeId: { type: 'integer' },
                    userId: { type: 'integer' },
                    storeName: { type: 'string' },
                    userName: { type: 'string' },
                    userEmail: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { storeId, userId } = (request.query as any) || {};

      const conditions = [];
      if (storeId) conditions.push(eq(storeUsers.storeId, Number(storeId)));
      if (userId) conditions.push(eq(storeUsers.userId, Number(userId)));

      const mappings = await db.query.storeUsers.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          store: true,
          user: true,
        },
      });

      const formatted = mappings.map((m) => ({
        id: m.id,
        storeId: m.storeId,
        userId: m.userId,
        storeName: m.store?.name || '',
        userName: `${m.user?.lastname}, ${m.user?.firstname}`,
        userEmail: m.user?.email || null,
      }));

      return reply.send({
        mappings: formatted,
      });
    }
  );

  // ==========================================
  // 10. DIRECT ASSIGN STORE USER (POST /users)
  // ==========================================
  app.post(
    '/users',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Direct Store User Assignment',
        description: 'Assign a user to a store via { storeId, userId } payload.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['storeId', 'userId'],
          properties: {
            storeId: { type: 'integer' },
            userId: { type: 'integer' },
          },
        },
        response: {
          201: {
            description: 'Assignment created',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Store user mapping created' },
              mapping: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  storeId: { type: 'integer' },
                  userId: { type: 'integer' },
                },
              },
            },
          },
          404: {
            description: 'Store or user not found',
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
      const { storeId, userId } = (request.body as any) || {};
      const targetStoreId = Number(storeId);
      const targetUserId = Number(userId);

      const store = await db.query.stores.findFirst({
        where: eq(stores.id, targetStoreId),
      });
      if (!store) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Store with ID ${targetStoreId} not found.`,
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

      const existing = await db.query.storeUsers.findFirst({
        where: and(eq(storeUsers.storeId, targetStoreId), eq(storeUsers.userId, targetUserId)),
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Conflict',
          message: `User ${targetUserId} is already assigned to store ${targetStoreId}.`,
        });
      }

      const [newMapping] = await db
        .insert(storeUsers)
        .values({
          storeId: targetStoreId,
          userId: targetUserId,
        })
        .returning();

      return reply.status(201).send({
        message: 'Store user mapping created',
        mapping: newMapping,
      });
    }
  );

  // ==========================================
  // 11. DELETE STORE USER MAPPING (DELETE /users/:mappingId)
  // ==========================================
  app.delete(
    '/users/:mappingId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stores'],
        summary: 'Delete Store User Mapping by ID',
        description: 'Deletes a store-user mapping by its primary key ID.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['mappingId'],
          properties: {
            mappingId: { type: 'integer' },
          },
        },
        response: {
          200: {
            description: 'Mapping deleted successfully',
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Store user mapping deleted' },
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
      const { mappingId } = request.params as any;
      const targetMappingId = Number(mappingId);

      const mapping = await db.query.storeUsers.findFirst({
        where: eq(storeUsers.id, targetMappingId),
      });

      if (!mapping) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Store user mapping with ID ${targetMappingId} not found.`,
        });
      }

      await db.delete(storeUsers).where(eq(storeUsers.id, targetMappingId));

      return reply.send({
        message: 'Store user mapping deleted',
      });
    }
  );
};
