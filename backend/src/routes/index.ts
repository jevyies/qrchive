import { FastifyPluginAsync } from 'fastify';
import { testingRoutes } from './testing.routes';
import { statsRoutes } from './stats.routes';
import { authenticationRoutes } from './authentication.routes';
import { weddingRoutes } from './weddings.routes';
import { storeRoutes } from './stores.routes';
import { guestRoutes } from './guests.routes';

export const appRoutes: FastifyPluginAsync = async (app) => {
  // Register testing / system routes at root
  await app.register(testingRoutes);

  // Register stats routes with /api prefix
  await app.register(statsRoutes, { prefix: '/api' });

  // Register authentication routes with /api/auth prefix
  await app.register(authenticationRoutes, { prefix: '/api/auth' });

  // Register weddings routes with /api/weddings prefix
  await app.register(weddingRoutes, { prefix: '/api/weddings' });

  // Register stores routes with /api/stores prefix
  await app.register(storeRoutes, { prefix: '/api/stores' });

  // Register guests and guest tables routes with /api/guests prefix
  await app.register(guestRoutes, { prefix: '/api/guests' });
};

export * from './authentication.routes';
export * from './stats.routes';
export * from './testing.routes';
export * from './weddings.routes';
export * from './stores.routes';
export * from './guests.routes';
