import Fastify from 'fastify';

import { env } from '@/config/env';
import { authRoutes } from '@/modules/auth/routes';
import { adminRoutes } from '@/modules/admin/routes';
import { dashboardRoutes } from '@/modules/dashboard/routes';
import { healthRoutes } from '@/modules/health/routes';
import { statsRoutes } from '@/modules/stats/routes';
import { transactionRoutes } from '@/modules/transactions/routes';
import { appPlugin } from '@/plugins/app';

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: env.TRUST_PROXY,
  });

  await app.register(appPlugin);
  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });
  await app.register(transactionRoutes);
  await app.register(statsRoutes);
  await app.register(adminRoutes, { prefix: '/admin' });

  app.get('/', async () => {
    return {
      name: 'Ortaq Maliyyə API',
      version: '0.1.0',
      docs: {
        health: '/health',
        readiness: '/ready',
      },
    };
  });

  return app;
}
