import { FastifyPluginAsync } from 'fastify';
import { db, pricing } from '../db';
import { asc } from 'drizzle-orm';

export const pricingRoutes: FastifyPluginAsync = async (app) => {
  // 1. LIST PRICING TIERS (GET /api/pricing)
  app.get(
    '/',
    {
      schema: {
        tags: ['Pricing'],
        summary: 'List Pricing Packages',
        description: 'Retrieves all available pricing tiers grouped by group column.',
      },
    },
    async (_request, reply) => {
      try {
        const items = await db.select().from(pricing).orderBy(asc(pricing.id));
        return reply.send({
          success: true,
          pricing: items,
        });
      } catch (err: any) {
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: err.message,
        });
      }
    }
  );
};
