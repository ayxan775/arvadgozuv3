import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { env } from '@/config/env';
import {
  buildClearSessionCookieOptions,
  buildSessionCookieOptions,
  createSession,
  revokeSession,
  validateUserCredentials,
} from '@/modules/auth/service';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const payload = loginSchema.parse(request.body);
    const user = await validateUserCredentials(payload.username, payload.password);

    if (!user) {
      return reply.code(401).send({
        message: 'Invalid username or password',
      });
    }

    const session = createSession(user.id, request.ip, request.headers['user-agent']);

    reply.setCookie(env.COOKIE_NAME, session.token, buildSessionCookieOptions(session.expiresAt));

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  });

  app.post('/logout', async (request, reply) => {
    const token = request.cookies[env.COOKIE_NAME];

    if (token) {
      revokeSession(token);
    }

    reply.clearCookie(env.COOKIE_NAME, buildClearSessionCookieOptions());

    return {
      success: true,
    };
  });

  app.get('/me', async (request, reply) => {
    if (!request.auth.isAuthenticated) {
      return reply.code(401).send({
        message: 'Not authenticated',
      });
    }

    return {
      user: request.auth,
    };
  });
};
