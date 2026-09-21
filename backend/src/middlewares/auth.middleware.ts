import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db, users, User } from '../db';

const JWT_SECRET =
  process.env.JWT_SECRET || 'qrchive-super-secret-jwt-key-change-in-production';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

/**
 * Fastify preHandler hook to verify Bearer JWT access token and attach user to request.
 */
export const authenticate = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Access token required. Format: Authorization: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];
  let decoded: any;

  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err: any) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message:
        err.name === 'TokenExpiredError'
          ? 'Access token has expired. Please refresh.'
          : 'Invalid access token.',
    });
  }

  const userId = Number(decoded.sub);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'User no longer exists.',
    });
  }

  if (user.status === 'banned' || user.status === 'removed') {
    return reply.status(403).send({
      error: 'Forbidden',
      message: `Account is ${user.status}. Access denied.`,
    });
  }

  request.user = user;
};

/**
 * Optional authentication hook: if token is present, verifies it, otherwise allows proceeding unauthenticated.
 */
export const optionalAuthenticate = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = Number(decoded.sub);
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user && user.status !== 'banned' && user.status !== 'removed') {
      request.user = user;
    }
  } catch {
    // If token invalid, proceed unauthenticated
  }
};
