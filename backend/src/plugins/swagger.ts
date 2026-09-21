import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import { FastifyPluginAsync } from 'fastify';

const swaggerPluginCallback: FastifyPluginAsync = async (app) => {
  // 1. Register OpenAPI/Swagger generation
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'QRchive API',
        description:
          'Comprehensive REST API for QRchive — managing wedding events, guest tables, RSVPs, stores, and platform analytics.',
        version: '1.0.0',
        contact: {
          name: 'QRchive Support',
        },
      },
      servers: [
        {
          url: '/',
          description: 'Current Environment Server',
        },
      ],
      tags: [
        {
          name: 'Authentication',
          description:
            'User registration, credential login, Google OAuth, GitHub OAuth, token refresh, and session management',
        },
        { name: 'Weddings', description: 'Wedding events, event scheduling, and wedding-user coordination' },
        { name: 'Stores', description: 'Store profiles, configurations, and store-user assignments' },
        { name: 'Guests', description: 'Guest lists, RSVP tracking, link lookup, and seating table arrangements' },
        { name: 'Testing', description: 'Testing, service status, and operational health probes' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Provide 5-minute JWT access token: Bearer <token>',
          },
        },
      },
    },
  });

  // 2. Register Scalar API Reference interactive documentation
  await app.register(import('@scalar/fastify-api-reference'), {
    routePrefix: '/reference',
    configuration: {
      pageTitle: 'QRchive API Reference',
      theme: 'purple',
      darkMode: true,
    },
  });

  // Convenient route redirect: /docs -> /reference
  app.get(
    '/docs',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      return reply.redirect('/reference');
    }
  );

  // OpenAPI JSON export endpoint
  app.get(
    '/openapi.json',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      return app.swagger();
    }
  );
};

export const swaggerPlugin = fp(swaggerPluginCallback, {
  name: 'swagger-plugin',
});
