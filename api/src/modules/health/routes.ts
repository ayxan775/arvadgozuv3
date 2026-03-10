import fs from 'node:fs';
import path from 'node:path';

import type { FastifyPluginAsync } from 'fastify';

import { env } from '@/config/env';
import { sqlite } from '@/db/client';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    const databaseOk = Boolean(sqlite.prepare('select 1 as ok').get());

    return {
      status: 'ok',
      service: 'ortaq-maliyye-api',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database: databaseOk ? 'ok' : 'error',
      },
      now: new Date().toISOString(),
    };
  });

  app.get('/ready', async (_request, reply) => {
    let database = false;
    let storage = false;

    try {
      database = Boolean(sqlite.prepare('select 1 as ok').get());
    } catch {
      database = false;
    }

    try {
      for (const target of [env.UPLOAD_DIR, env.BACKUP_DIR, env.SQLITE_DB_PATH]) {
        const resolved = path.resolve(process.cwd(), target);
        const directory = resolved.endsWith('.db') ? path.dirname(resolved) : resolved;
        fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
      }

      storage = true;
    } catch {
      storage = false;
    }

    const ready = database && storage;

    return reply.code(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'not_ready',
      service: 'ortaq-maliyye-api',
      environment: env.NODE_ENV,
      checks: {
        database,
        storage,
      },
      now: new Date().toISOString(),
    });
  });
};
