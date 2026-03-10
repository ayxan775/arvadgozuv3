import type { FastifyPluginAsync } from 'fastify';

import { ensureAuthenticated } from '@/lib/request-guards';
import { getDashboardSummary, getRecentTransactions } from '@/modules/transactions/service';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/summary', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return getDashboardSummary(request.auth.userId!);
  });

  app.get('/recent', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return {
      items: getRecentTransactions().map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        effectiveAt: new Date(item.effectiveAt).toISOString(),
        title: item.note ?? item.type,
      })),
    };
  });
};
