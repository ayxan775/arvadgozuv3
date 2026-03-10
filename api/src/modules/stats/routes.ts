import type { FastifyPluginAsync } from 'fastify';

import { ensureAuthenticated } from '@/lib/request-guards';
import { getCategoryStats, getDashboardSummary, getUserStats } from '@/modules/transactions/service';

export const statsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stats/overview', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return getDashboardSummary(request.auth.userId!);
  });

  app.get('/stats/by-category', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return {
      items: getCategoryStats(),
    };
  });

  app.get('/stats/by-user', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return {
      items: getUserStats(),
    };
  });
};
