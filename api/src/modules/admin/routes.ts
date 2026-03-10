import type { FastifyPluginAsync } from 'fastify';

import { ensureAdmin } from '@/lib/request-guards';
import { getAdminSummary, getAdminUsers, getAuditLogs } from '@/modules/transactions/service';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/summary', async (request, reply) => {
    const blocked = ensureAdmin(request, reply);

    if (blocked) {
      return blocked;
    }

    return getAdminSummary();
  });

  app.get('/users', async (request, reply) => {
    const blocked = ensureAdmin(request, reply);

    if (blocked) {
      return blocked;
    }

    return {
      items: getAdminUsers().map((item) => ({
        id: item.id,
        username: item.username,
        role: item.role,
        status: item.isActive ? 'active' : 'inactive',
      })),
    };
  });

  app.get('/audit-logs', async (request, reply) => {
    const blocked = ensureAdmin(request, reply);

    if (blocked) {
      return blocked;
    }

    return {
      items: getAuditLogs().map((item) => ({
        id: item.id,
        actor: item.actorId ?? 'system',
        action: item.action,
        entity: item.entityType,
        time: new Date(item.createdAt).toISOString(),
      })),
    };
  });
};
