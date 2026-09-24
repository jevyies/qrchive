import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, snapPhotos } from '../db';
import { R2Service } from '../services/r2.service';

export const imageResizeRoutes: FastifyPluginAsync = async (app) => {
  const handleImageResize = async (request: FastifyRequest, reply: FastifyReply) => {
    let rawPath = (request.params as any)['*'] || '';
    rawPath = rawPath.replace(/^\/+/, '');

    if (!rawPath) {
      return reply.status(400).send({ error: 'Missing image path' });
    }

    let storageKey = '';

    // Check if the path targets /api/photos/view/<storageKey>
    if (rawPath.startsWith('api/photos/view/')) {
      storageKey = rawPath.replace(/^api\/photos\/view\//, '');
    } else if (rawPath.startsWith('view/')) {
      storageKey = rawPath.replace(/^view\//, '');
    } else if (rawPath.includes('api/photos/') && rawPath.endsWith('/file')) {
      const match = rawPath.match(/api\/photos\/(\d+)\/file/);
      if (match) {
        const photoId = Number(match[1]);
        const photo = await db.query.snapPhotos.findFirst({
          where: eq(snapPhotos.id, photoId),
        });
        if (photo?.storageKey) {
          storageKey = photo.storageKey;
        }
      }
    } else {
      storageKey = rawPath;
    }

    if (storageKey) {
      try {
        const { buffer, contentType, eTag } = await R2Service.getObjectBuffer(storageKey);
        reply.header('Content-Type', contentType || 'image/jpeg');
        if (eTag) reply.header('ETag', eTag);
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
        return reply.send(buffer);
      } catch (err: any) {
        request.log.warn(
          { err: err.message, storageKey, rawPath },
          '[ImageResize] R2 buffer fetch failed, redirecting to raw path'
        );
      }
    }

    // Fallback: redirect to original underlying path
    return reply.redirect(`/${rawPath}`, 302);
  };

  // Register on root /cdn-cgi/image/:options/*
  app.get('/cdn-cgi/image/:options/*', handleImageResize);

  // Register on root /image/:options/*
  app.get('/image/:options/*', handleImageResize);
};
