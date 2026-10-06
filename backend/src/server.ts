import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyWebsocket from '@fastify/websocket';
import dns from 'node:dns';
import dotenv from 'dotenv';
import { client, initDbTables } from './db';
import { swaggerPlugin } from './plugins/swagger';
import { appRoutes } from './routes';
import { emailWorker, photoUploadWorker, guestCreationWorker, zipArchiveWorker, backgroundUploadWorker } from './queues';

// Ensure reliable DNS resolution on systems where Node defaults to localhost loopback (127.0.0.1)
try {
  const currentServers = dns.getServers();
  if (!currentServers.length || (currentServers.length === 1 && currentServers[0] === '127.0.0.1')) {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  }
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if restricted
}

dotenv.config();

export const buildApp = async () => {
  // Ensure runtime database tables and indexes exist
  await initDbTables();

  const app = Fastify({
    bodyLimit: 100 * 1024 * 1024, // 100MB payload limit for high-res photo uploads and base64 backgrounds
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
      fileSize: 100 * 1024 * 1024, // 100MB chunk or file limit
      fieldSize: 100 * 1024 * 1024, // 100MB limit for text fields (including thumbnailBase64)
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
        await Promise.allSettled([
          emailWorker.close(),
          photoUploadWorker.close(),
          guestCreationWorker.close(),
          zipArchiveWorker.close(),
          backgroundUploadWorker.close(),
        ]);
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
