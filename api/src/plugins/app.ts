import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import fp from 'fastify-plugin';

import { env } from '@/config/env';
import { resolveSession } from '@/modules/auth/service';

export const appPlugin = fp(async (app) => {
  const corsOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.decorateRequest('auth', {
    getter: function () {
      return this._auth ?? {
        isAuthenticated: false,
        userId: null,
        username: null,
        role: null,
      };
    },
    setter: function (val) {
      this._auth = val;
    }
  });

  await app.register(sensible);
  await app.register(cookie, {
    secret: env.SESSION_SECRET,
    hook: 'onRequest',
  });

  const corsOrigin: true | string | string[] =
    env.NODE_ENV === 'development'
      ? true
      : corsOrigins.length === 0
        ? true
        : corsOrigins.length === 1
          ? corsOrigins[0]!
          : corsOrigins;

  const corsOptions = {
    credentials: true,
    origin: corsOrigin,
  };
  await app.register(cors, {
    ...corsOptions,
  });
  await app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 5 * 1024 * 1024,
    },
  });

  app.addHook('onRequest', async (request) => {
    request.auth =
      resolveSession(request.cookies[env.COOKIE_NAME]) ?? {
        isAuthenticated: false,
        userId: null,
        username: null,
        role: null,
      };
  });
});
