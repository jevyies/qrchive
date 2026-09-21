import { FastifyPluginAsync } from 'fastify';

export const testingRoutes: FastifyPluginAsync = async (app) => {
  // Service root endpoint
  app.get(
    '/',
    {
      schema: {
        tags: ['Testing'],
        summary: 'Service Root',
        description: 'Returns service identification, current operational status, environment name, and ISO timestamp.',
        response: {
          200: {
            description: 'Service status payload',
            type: 'object',
            properties: {
              service: { type: 'string', example: 'qrchive-backend' },
              status: { type: 'string', example: 'online' },
              environment: { type: 'string', example: 'development' },
              timestamp: { type: 'string', format: 'date-time' },
            },
            required: ['service', 'status', 'environment', 'timestamp'],
          },
        },
      },
    },
    async (request, reply) => {
      return {
        service: 'qrchive-backend',
        status: 'online',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      };
    }
  );

  // Health check endpoint for Railway deployment monitoring
  app.get(
    '/health',
    {
      schema: {
        tags: ['Testing'],
        summary: 'Health Check',
        description: 'Healthcheck endpoint used by container orchestrators (e.g. Railway) to verify uptime.',
        response: {
          200: {
            description: 'Health check OK',
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
              service: { type: 'string', example: 'qrchive-backend' },
            },
            required: ['status', 'timestamp', 'service'],
          },
        },
      },
    },
    async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'qrchive-backend',
      };
    }
  );
};
