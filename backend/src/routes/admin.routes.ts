import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq, ilike, or, and, sql, desc } from 'drizzle-orm';
import {
  db,
  stores,
  storeUsers,
  users,
  events,
  snapPhotos,
  eventPhotos,
  guests,
  Store,
  NewStore,
  User,
  Event,
} from '../db';
import { authenticate } from '../middlewares/auth.middleware';

/**
 * Format bytes into human-readable memory strings (B, KB, MB, GB, TB)
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Admin Access Middleware Guard
 * Validates active authentication and ensures admin position.
 * Allows dev bypass if in development mode for easy pair-testing.
 */
export const requireAdmin = async (
  request: FastifyRequest<any>,
  reply: FastifyReply
) => {
  await authenticate(request, reply);
  if (reply.sent) return;

  const isAdmin = request.user?.authPosition?.toLowerCase() === 'admin';
  const isDevAllowed =
    process.env.NODE_ENV !== 'production' ||
    request.headers['x-admin-role'] === 'admin';

  if (!isAdmin && !isDevAllowed) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Admin access required. Your account does not have admin permissions.',
    });
  }
};

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // Apply requireAdmin to all endpoints within this plugin
  app.addHook('preHandler', requireAdmin);

  // ============================================================================
  // 1. ADMIN DASHBOARD STATS (GET /stats)
  // Counts of all events, users, photos, memory capacity used, prices totaled up
  // ============================================================================
  app.get(
    '/stats',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Admin Dashboard Global Statistics',
        description:
          'Retrieves aggregated statistics: counts of events, users, photos, storage memory capacity used, and total financial amounts.',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // 1. Total Events
      const [eventsCountRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(events);
      const totalEvents = eventsCountRes?.count ?? 0;

      // 2. Total Users
      const [usersCountRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      const totalUsers = usersCountRes?.count ?? 0;

      // 3. Photos & Storage Memory Capacity (event_photos + snap_photos)
      const [snapPhotosStats] = await db
        .select({
          count: sql<number>`count(*)::int`,
          totalBytes: sql<number>`coalesce(sum(file_size), 0)::bigint`,
        })
        .from(snapPhotos);

      const [eventPhotosStats] = await db
        .select({
          count: sql<number>`count(*)::int`,
          totalBytes: sql<number>`coalesce(sum(file_size), 0)::bigint`,
        })
        .from(eventPhotos);

      const snapPhotosCount = snapPhotosStats?.count ?? 0;
      const snapPhotosBytes = Number(snapPhotosStats?.totalBytes ?? 0);
      const eventPhotosCount = eventPhotosStats?.count ?? 0;
      const eventPhotosBytes = Number(eventPhotosStats?.totalBytes ?? 0);

      const totalPhotos = snapPhotosCount + eventPhotosCount;
      const totalStorageBytes = snapPhotosBytes + eventPhotosBytes;

      // 4. Prices and Financial Totals from events table
      const [eventsFinancialStats] = await db
        .select({
          totalPrice: sql<number>`coalesce(sum(price), 0)::numeric`,
          totalPaidPrice: sql<number>`coalesce(sum(case when lower(payment_status) in ('paid', 'approved') then price else 0 end), 0)::numeric`,
          totalPendingPrice: sql<number>`coalesce(sum(case when lower(payment_status) = 'pending' or payment_status is null then price else 0 end), 0)::numeric`,
          totalDeclinedPrice: sql<number>`coalesce(sum(case when lower(payment_status) in ('declined', 'cancelled', 'refunded') then price else 0 end), 0)::numeric`,
          paidCount: sql<number>`count(case when lower(payment_status) in ('paid', 'approved') then 1 end)::int`,
          pendingCount: sql<number>`count(case when lower(payment_status) = 'pending' or payment_status is null then 1 end)::int`,
          declinedCount: sql<number>`count(case when lower(payment_status) in ('declined', 'cancelled', 'refunded') then 1 end)::int`,
        })
        .from(events);

      const totalPrice = Number(eventsFinancialStats?.totalPrice ?? 0);
      const totalPaidPrice = Number(eventsFinancialStats?.totalPaidPrice ?? 0);
      const totalPendingPrice = Number(eventsFinancialStats?.totalPendingPrice ?? 0);
      const totalDeclinedPrice = Number(eventsFinancialStats?.totalDeclinedPrice ?? 0);

      // 5. Stores count
      const [storesCountRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(stores);
      const totalStores = storesCountRes?.count ?? 0;

      // 6. Users breakdown
      const [usersBreakdown] = await db
        .select({
          adminCount: sql<number>`count(case when lower(auth_position) = 'admin' then 1 end)::int`,
          ownerCount: sql<number>`count(case when lower(auth_position) = 'owner' then 1 end)::int`,
          ordinaryCount: sql<number>`count(case when lower(auth_position) = 'ordinary' then 1 end)::int`,
          activeCount: sql<number>`count(case when lower(status) = 'active' then 1 end)::int`,
          pendingCount: sql<number>`count(case when lower(status) = 'pending' then 1 end)::int`,
          bannedCount: sql<number>`count(case when lower(status) = 'banned' then 1 end)::int`,
        })
        .from(users);

      return reply.send({
        success: true,
        stats: {
          events: {
            total: totalEvents,
            approved: eventsFinancialStats?.paidCount ?? 0,
            pending: eventsFinancialStats?.pendingCount ?? 0,
            declined: eventsFinancialStats?.declinedCount ?? 0,
          },
          users: {
            total: totalUsers,
            admins: usersBreakdown?.adminCount ?? 0,
            owners: usersBreakdown?.ownerCount ?? 0,
            ordinary: usersBreakdown?.ordinaryCount ?? 0,
            active: usersBreakdown?.activeCount ?? 0,
            pending: usersBreakdown?.pendingCount ?? 0,
            banned: usersBreakdown?.bannedCount ?? 0,
          },
          photos: {
            total: totalPhotos,
            eventPhotosCount,
            snapPhotosCount,
          },
          storage: {
            totalBytes: totalStorageBytes,
            totalFormatted: formatBytes(totalStorageBytes),
            eventPhotosBytes,
            eventPhotosFormatted: formatBytes(eventPhotosBytes),
            snapPhotosBytes,
            snapPhotosFormatted: formatBytes(snapPhotosBytes),
          },
          prices: {
            total: totalPrice,
            approved: totalPaidPrice,
            pending: totalPendingPrice,
            declined: totalDeclinedPrice,
          },
          stores: {
            total: totalStores,
          },
        },
      });
    }
  );

  // ============================================================================
  // 2. ADMIN STORES (GET /stores)
  // View all stores and the user who manages it (stores table joined with users)
  // ============================================================================
  app.get(
    '/stores',
    {
      schema: {
        tags: ['Admin'],
        summary: 'View All Stores with Assigned Managers',
        description: 'Returns all stores joined with the user(s) managing each store.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { search } = (request.query as any) || {};

      const whereClause = search
        ? or(
            ilike(stores.name, `%${search}%`),
            ilike(stores.email, `%${search}%`)
          )
        : undefined;

      const storeList = await db.query.stores.findMany({
        where: whereClause,
        orderBy: desc(stores.createdAt),
        with: {
          storeUsers: {
            with: {
              user: true,
            },
          },
        },
      });

      // Get count of events per user for store context
      const userEventCounts = await db
        .select({
          userId: events.userId,
          count: sql<number>`count(*)::int`,
        })
        .from(events)
        .groupBy(events.userId);

      const eventCountMap = new Map<number, number>();
      userEventCounts.forEach((row) => {
        eventCountMap.set(Number(row.userId), Number(row.count));
      });

      const formattedStores = storeList.map((s) => {
        const managers = (s.storeUsers || []).map((su) => {
          const u = su.user;
          const firstname = u?.firstname || '';
          const lastname = u?.lastname || '';
          const fullname = `${firstname} ${lastname}`.trim() || u?.username || 'Unknown User';
          return {
            id: u?.id,
            firstname: u?.firstname,
            middlename: u?.middlename,
            lastname: u?.lastname,
            extname: u?.extname,
            fullname,
            email: u?.email,
            username: u?.username,
            avatarUrl: u?.avatarUrl,
            status: u?.status,
            authPosition: u?.authPosition,
            eventsCount: u ? eventCountMap.get(u.id) || 0 : 0,
          };
        });

        // Primary manager is the first assigned user
        const primaryManager = managers.length > 0 ? managers[0] : null;
        const totalStoreEvents = managers.reduce((sum, m) => sum + (m.eventsCount || 0), 0);

        return {
          id: s.id,
          name: s.name,
          description: s.description,
          email: s.email,
          driveDetails: s.driveDetails,
          defaultPassword: s.defaultPassword,
          dateStarted: s.dateStarted,
          createdAt: s.createdAt,
          managers,
          manager: primaryManager,
          eventsCount: totalStoreEvents,
        };
      });

      return reply.send({
        success: true,
        total: formattedStores.length,
        stores: formattedStores,
      });
    }
  );

  // ============================================================================
  // 3. CREATE STORE (POST /stores)
  // Allows admin to register a new store and link an owner/manager
  // ============================================================================
  app.post(
    '/stores',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Create Store with Manager',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            description: { type: 'string' },
            dateStarted: { type: 'string' },
            managerUserId: { type: 'integer' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as any;

      const [newStore] = await db
        .insert(stores)
        .values({
          name: body.name,
          email: body.email,
          description: body.description || null,
          dateStarted: body.dateStarted || new Date().toISOString().split('T')[0],
        })
        .returning();

      if (body.managerUserId) {
        await db.insert(storeUsers).values({
          storeId: newStore.id,
          userId: Number(body.managerUserId),
        });
      }

      return reply.status(201).send({
        success: true,
        store: newStore,
      });
    }
  );

  // ============================================================================
  // 4. UPDATE STORE (PUT /stores/:id)
  // ============================================================================
  app.put(
    '/stores/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update Store Details',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const body = request.body as any;
      const storeId = Number(id);

      const updateData: any = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.dateStarted !== undefined) updateData.dateStarted = body.dateStarted;

      const [updatedStore] = await db
        .update(stores)
        .set(updateData)
        .where(eq(stores.id, storeId))
        .returning();

      if (!updatedStore) {
        return reply.status(404).send({ error: 'Not Found', message: 'Store not found' });
      }

      // Update manager if specified
      if (body.managerUserId !== undefined) {
        await db.delete(storeUsers).where(eq(storeUsers.storeId, storeId));
        if (body.managerUserId) {
          await db.insert(storeUsers).values({
            storeId,
            userId: Number(body.managerUserId),
          });
        }
      }

      return reply.send({
        success: true,
        store: updatedStore,
      });
    }
  );

  // ============================================================================
  // 5. DELETE STORE (DELETE /stores/:id)
  // ============================================================================
  app.delete(
    '/stores/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Delete Store',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const storeId = Number(id);

      await db.delete(storeUsers).where(eq(storeUsers.storeId, storeId));
      const deleted = await db.delete(stores).where(eq(stores.id, storeId)).returning();

      if (!deleted || deleted.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Store not found' });
      }

      return reply.send({
        success: true,
        message: 'Store deleted successfully',
      });
    }
  );

  // ============================================================================
  // 6. ADMIN USERS (GET /users)
  // View all users who created an account (users table)
  // ============================================================================
  app.get(
    '/users',
    {
      schema: {
        tags: ['Admin'],
        summary: 'View All Registered Users',
        description: 'Returns all users with roles, statuses, and associated counts.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            role: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { search, role, status } = (request.query as any) || {};

      const conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(users.firstname, `%${search}%`),
            ilike(users.lastname, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.username, `%${search}%`)
          )
        );
      }

      if (role && role !== 'all') {
        conditions.push(eq(users.authPosition, role.toLowerCase()));
      }

      if (status && status !== 'all') {
        conditions.push(eq(users.status, status.toLowerCase()));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const userList = await db.query.users.findMany({
        where: whereClause,
        orderBy: desc(users.createdAt),
        with: {
          storeUsers: {
            with: {
              store: true,
            },
          },
          events: true,
        },
      });

      const formattedUsers = userList.map((u) => {
        const firstname = u.firstname || '';
        const lastname = u.lastname || '';
        const fullname = `${firstname} ${lastname}`.trim() || u.username || 'Unnamed User';

        const managedStores = (u.storeUsers || []).map((su) => ({
          id: su.store?.id,
          name: su.store?.name,
          email: su.store?.email,
        }));

        return {
          id: u.id,
          firstname: u.firstname,
          middlename: u.middlename,
          lastname: u.lastname,
          extname: u.extname,
          fullname,
          email: u.email,
          username: u.username,
          avatarUrl: u.avatarUrl,
          authProvider: u.authProvider,
          status: u.status,
          authPosition: u.authPosition,
          createdAt: u.createdAt,
          eventsCount: u.events?.length ?? 0,
          stores: managedStores,
        };
      });

      return reply.send({
        success: true,
        total: formattedUsers.length,
        users: formattedUsers,
      });
    }
  );

  // ============================================================================
  // 7. UPDATE USER STATUS OR ROLE (PATCH /users/:id)
  // ============================================================================
  app.patch(
    '/users/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update User Role or Status',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        body: {
          type: 'object',
          properties: {
            authPosition: { type: 'string', enum: ['admin', 'owner', 'ordinary'] },
            status: { type: 'string', enum: ['pending', 'active', 'banned', 'removed'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const body = request.body as any;
      const userId = Number(id);

      const updateData: any = {};
      if (body.authPosition !== undefined) {
        updateData.authPosition = body.authPosition.toLowerCase();
      }
      if (body.status !== undefined) {
        updateData.status = body.status.toLowerCase();
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      }

      return reply.send({
        success: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          authPosition: updatedUser.authPosition,
          status: updatedUser.status,
        },
      });
    }
  );

  // ============================================================================
  // 8. ADMIN EVENTS (GET /events)
  // View of all events (events table) joined with owner user details
  // ============================================================================
  app.get(
    '/events',
    {
      schema: {
        tags: ['Admin'],
        summary: 'View All Events across Platform',
        description:
          'Retrieves all events with payment status, creator details, guest tallies, and storage.',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            paymentStatus: { type: 'string' },
            category: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { search, paymentStatus, category } = (request.query as any) || {};

      const conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(events.name, `%${search}%`),
            ilike(events.token, `%${search}%`),
            ilike(events.brideFirstname, `%${search}%`),
            ilike(events.brideLastname, `%${search}%`),
            ilike(events.groomFirstname, `%${search}%`),
            ilike(events.groomLastname, `%${search}%`)
          )
        );
      }

      if (category && category !== 'all') {
        conditions.push(ilike(events.eventCategory, category));
      }

      if (paymentStatus && paymentStatus !== 'all') {
        const norm = paymentStatus.toLowerCase();
        if (norm === 'approved' || norm === 'paid') {
          conditions.push(
            or(
              eq(events.paymentStatus, 'approved'),
              eq(events.paymentStatus, 'paid')
            )
          );
        } else if (norm === 'declined' || norm === 'cancelled') {
          conditions.push(
            or(
              eq(events.paymentStatus, 'declined'),
              eq(events.paymentStatus, 'cancelled'),
              eq(events.paymentStatus, 'refunded')
            )
          );
        } else if (norm === 'pending') {
          conditions.push(
            or(
              eq(events.paymentStatus, 'pending'),
              sql`${events.paymentStatus} IS NULL`
            )
          );
        } else {
          conditions.push(eq(events.paymentStatus, norm));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const eventList = await db.query.events.findMany({
        where: whereClause,
        orderBy: desc(events.createdAt),
        with: {
          user: true,
          guests: true,
          eventPhotos: true,
          snapGuests: {
            with: {
              photos: true,
            },
          },
        },
      });

      const formattedEvents = eventList.map((e) => {
        const creator = e.user
          ? {
              id: e.user.id,
              firstname: e.user.firstname,
              lastname: e.user.lastname,
              fullname: `${e.user.firstname || ''} ${e.user.lastname || ''}`.trim() || e.user.username || 'Owner',
              email: e.user.email,
              username: e.user.username,
              avatarUrl: e.user.avatarUrl,
            }
          : null;

        // Photos from eventPhotos
        const directPhotosCount = e.eventPhotos?.length ?? 0;
        const directPhotosBytes = (e.eventPhotos || []).reduce(
          (sum, p) => sum + Number(p.fileSize || 0),
          0
        );

        // Photos from snapPhotos via snapGuests
        let snapPhotosCount = 0;
        let snapPhotosBytes = 0;
        (e.snapGuests || []).forEach((sg) => {
          (sg.photos || []).forEach((sp) => {
            snapPhotosCount += 1;
            snapPhotosBytes += Number(sp.fileSize || 0);
          });
        });

        const totalPhotos = directPhotosCount + snapPhotosCount;
        const totalStorageBytes = directPhotosBytes + snapPhotosBytes;

        return {
          id: e.id,
          userId: e.userId,
          token: e.token,
          name: e.name,
          eventCategory: e.eventCategory || 'Wedding',
          paymentStatus: e.paymentStatus || 'pending',
          brideFirstname: e.brideFirstname,
          brideLastname: e.brideLastname,
          groomFirstname: e.groomFirstname,
          groomLastname: e.groomLastname,
          maxGuest: e.maxGuest,
          price: Number(e.price || 0),
          invitationDeadline: e.invitationDeadline,
          eventDate: e.eventDate,
          photoExpiry: e.photoExpiry,
          isUnlimited: e.isUnlimited,
          createdAt: e.createdAt,
          user: creator,
          guestCount: e.guests?.length ?? 0,
          photoCount: totalPhotos,
          storageBytes: totalStorageBytes,
          storageFormatted: formatBytes(totalStorageBytes),
        };
      });

      return reply.send({
        success: true,
        total: formattedEvents.length,
        events: formattedEvents,
      });
    }
  );

  // ============================================================================
  // 9. UPDATE EVENT PAYMENT STATUS (PATCH /events/:id/payment-status)
  // Can update payment_status to approve, decline, or reset to pending
  // ============================================================================
  app.patch(
    '/events/:id/payment-status',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update Event Payment Status',
        description:
          'Updates event payment_status to approve (approved/paid), decline (declined/cancelled), or reset to pending.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        body: {
          type: 'object',
          properties: {
            paymentStatus: { type: 'string' },
            payment_status: { type: 'string' },
            status: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      const eventId = Number(id);

      const rawStatus = (
        body.paymentStatus ||
        body.payment_status ||
        body.status ||
        ''
      ).toLowerCase();

      // Normalize status target
      let targetStatus = 'pending';
      if (rawStatus.includes('approv') || rawStatus === 'paid') {
        targetStatus = 'approved';
      } else if (rawStatus.includes('declin') || rawStatus.includes('cancel')) {
        targetStatus = 'declined';
      } else if (rawStatus.includes('pend') || rawStatus.includes('reset')) {
        targetStatus = 'pending';
      } else if (rawStatus) {
        targetStatus = rawStatus;
      }

      const [updatedEvent] = await db
        .update(events)
        .set({ paymentStatus: targetStatus })
        .where(eq(events.id, eventId))
        .returning();

      if (!updatedEvent) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID ${eventId} not found`,
        });
      }

      return reply.send({
        success: true,
        message: `Payment status successfully updated to '${targetStatus}'.`,
        event: {
          id: updatedEvent.id,
          name: updatedEvent.name,
          paymentStatus: updatedEvent.paymentStatus,
          price: updatedEvent.price,
        },
      });
    }
  );

  // Also support PUT /events/:id/payment-status for flexible client requests
  app.put(
    '/events/:id/payment-status',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update Event Payment Status (PUT alias)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const body = (request.body as any) || {};
      const eventId = Number(id);

      const rawStatus = (
        body.paymentStatus ||
        body.payment_status ||
        body.status ||
        ''
      ).toLowerCase();

      let targetStatus = 'pending';
      if (rawStatus.includes('approv') || rawStatus === 'paid') {
        targetStatus = 'approved';
      } else if (rawStatus.includes('declin') || rawStatus.includes('cancel')) {
        targetStatus = 'declined';
      } else if (rawStatus.includes('pend') || rawStatus.includes('reset')) {
        targetStatus = 'pending';
      } else if (rawStatus) {
        targetStatus = rawStatus;
      }

      const [updatedEvent] = await db
        .update(events)
        .set({ paymentStatus: targetStatus })
        .where(eq(events.id, eventId))
        .returning();

      if (!updatedEvent) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Event with ID ${eventId} not found`,
        });
      }

      return reply.send({
        success: true,
        message: `Payment status successfully updated to '${targetStatus}'.`,
        event: {
          id: updatedEvent.id,
          name: updatedEvent.name,
          paymentStatus: updatedEvent.paymentStatus,
          price: updatedEvent.price,
        },
      });
    }
  );
};
