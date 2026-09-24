import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyWebsocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { client, initDbTables } from './db';
import { swaggerPlugin } from './plugins/swagger';
import { appRoutes } from './routes';

dotenv.config();

export const buildApp = async () => {
  // Ensure runtime database tables and indexes exist
  await initDbTables();

  const app = Fastify({
    logger: {
      level:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    },
    ajv: {
      customOptions: {
        strict: false,
      },
    },
  });

  // 1. Configure CORS for web frontend clients (e.g. Railway, Vercel, localhost)
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 2. Register Cookie Parser & Session Cookie support
  await app.register(fastifyCookie, {
    secret:
      process.env.COOKIE_SECRET ||
      'qrchive-cookie-signature-secret-key-at-least-32-chars',
    parseOptions: {},
  });

  // 3. Register Multipart Form Support (Photo Chunks & Direct Uploads)
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB chunk or file limit
      fieldSize: 10 * 1024 * 1024, // 10MB limit for text fields (including thumbnailBase64)
    },
  });

  // 4. Register OpenAPI Swagger & Scalar API Reference
  await app.register(swaggerPlugin);

  // 5. Register WebSocket Plugin
  await app.register(fastifyWebsocket);

  // 6. Register Modular Route Groups
  await app.register(appRoutes);

  // 5. Register Global Error Handler
  app.setErrorHandler((error: any, request, reply) => {
    const statusCode = error?.statusCode || 500;
    if (statusCode >= 500) {
      request.log.error(error);
      return reply.status(500).send({
        message: 'Server Error',
      });
    }

    return reply.status(statusCode).send({
      error: error?.name || 'Error',
      message: error?.message || 'Request failed',
    });
  });

  return app;
};

const start = async () => {
  let app: FastifyInstance | null = null;
  try {
    app = await buildApp();

    // Graceful shutdown handling for Railway containers
    const gracefulShutdown = async (signal: string) => {
      if (!app) return;
      app.log.info(`Received ${signal}, closing server and database connection gracefully...`);
      try {
        await app.close();
        await client.end();
        app.log.info('Graceful shutdown completed.');
        process.exit(0);
      } catch (err) {
        app.log.error(err, 'Error during graceful shutdown:');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Railway automatically provides PORT in environment variables
    const port = Number(process.env.PORT) || 3001;
    // Fastify MUST bind to 0.0.0.0 for containerized platforms like Railway
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server listening on http://0.0.0.0:${port}`);
    console.log(`📖 Scalar API Reference available at http://localhost:${port}/reference`);
  } catch (err) {
    if (app) {
      app.log.error(err);
    } else {
      console.error(err);
    }
    process.exit(1);
  }
};

// Start the server when executed directly
if (require.main === module) {
  start();
}
