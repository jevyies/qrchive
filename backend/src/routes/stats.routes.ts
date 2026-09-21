import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';

export const statsRoutes: FastifyPluginAsync = async (app) => {
  // Database connectivity check & sample stats
  app.get(
    '/stats',
    {
      schema: {
        tags: ['Testing'],
        summary: 'Database Connectivity and Record Statistics',
        description:
          'Queries Postgres through Drizzle ORM to verify connection health and retrieve sample counts.',
        response: {
          200: {
            description: 'Database query successfully executed',
            type: 'object',
            properties: {
              status: { type: 'string', example: 'connected' },
              usersCount: { type: 'integer', example: 1 },
            },
            required: ['status'],
          },
          '5xx': {
            description: 'Database or server error occurred',
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              status: { type: 'string', example: 'error' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const users = await db.query.users.findMany({ limit: 1 });
        return {
          status: 'connected',
          usersCount: users.length,
        };
      } catch (err: any) {
        app.log.error(err);
        return reply.status(500).send({
          status: 'error',
          statusCode: 500,
          message: err.message,
        });
      }
    }
  );
};
