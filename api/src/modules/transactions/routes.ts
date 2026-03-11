import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { ensureAuthenticated } from '@/lib/request-guards';
import {
  createFixedExpense,
  createCategory,
  createTransaction,
  deleteFixedExpense,
  deleteTransaction,
  getNotificationPreferences,
  listNotifications,
  clearNotifications,
  listFixedExpenses,
  listTransferUsers,
  listCategories,
  listTransactions,
  payFixedExpense,
  savePushSubscription,
  updateFixedExpense,
  updateNotificationPreferences,
  updateTransaction,
} from '@/modules/transactions/service';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
  categoryId: z.string().optional(),
  relatedUserId: z.string().optional(),
  effectiveAt: z.string().datetime().optional(),
});

const syncBatchSchema = z.object({
  items: z.array(
    z.object({
      clientOperationId: z.string().min(1),
      operation: z.literal('create'),
      payload: transactionSchema,
    }),
  ),
});

const transactionUpdateSchema = transactionSchema.partial().extend({
  note: z.string().max(500).optional(),
});

const categorySchema = z.object({
  name: z.string().min(2).max(80),
});

const fixedExpenseSchema = z.object({
  title: z.string().min(2).max(120),
  baseAmount: z.number().positive(),
  note: z.string().max(500).optional(),
  categoryId: z.string().optional(),
});

const fixedExpenseUpdateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  baseAmount: z.number().positive().optional(),
  note: z.string().max(500).optional(),
  categoryId: z.string().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'Ən az bir sahə yenilənməlidir',
});

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

const notificationPreferencesSchema = z.object({
  incomeOn: z.boolean(),
  expenseOn: z.boolean(),
  transferOn: z.boolean(),
  updateOn: z.boolean(),
  deleteOn: z.boolean(),
});

const transactionsQuerySchema = z.object({
  actorUserId: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const transactionRoutes: FastifyPluginAsync = async (app) => {
  app.get('/transactions', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const query = transactionsQuerySchema.parse(request.query ?? {});
    const result = listTransactions({
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {}),
      ...(query.page ? { page: query.page } : {}),
      ...(query.limit ? { limit: query.limit } : {}),
    });

    return {
      items: result.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        effectiveAt: new Date(item.effectiveAt).toISOString(),
        title: item.note ?? item.type,
      })),
      meta: result.meta,
    };
  });

  app.post('/transactions', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = transactionSchema.parse(request.body);

    return reply.code(201).send({
      item: createTransaction(
        {
          ...payload,
          actorUserId: request.auth.userId!,
        },
        {
          actorId: request.auth.userId!,
          role: request.auth.role!,
        },
      ),
    });
  });

  app.patch('/transactions/:id', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = transactionUpdateSchema.parse(request.body);

    return reply.code(200).send({
      item: updateTransaction(
        (request.params as { id: string }).id,
        request.auth.userId!,
        payload,
        {
          actorId: request.auth.userId!,
          role: request.auth.role!,
        },
      ),
    });
  });

  app.delete('/transactions/:id', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return reply.code(200).send({
      success: true,
      transactionId: deleteTransaction((request.params as { id: string }).id, request.auth.userId!, {
        actorId: request.auth.userId!,
        role: request.auth.role!,
      }),
    });
  });

  app.post('/transfers', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = transactionSchema.extend({
      type: z.literal('transfer'),
      relatedUserId: z.string().min(1),
    }).parse(request.body);

    return reply.code(201).send({
      item: createTransaction(
        {
          ...payload,
          actorUserId: request.auth.userId!,
        },
        {
          actorId: request.auth.userId!,
          role: request.auth.role!,
        },
      ),
    });
  });

  app.get('/transfer-users', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return {
      items: listTransferUsers(request.auth.userId!).map((item) => ({
        id: item.id,
        username: item.username,
        role: item.role,
        status: item.isActive ? 'active' : 'inactive',
      })),
    };
  });

  app.get('/fixed-expenses', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const result = listFixedExpenses(request.auth.userId!);

    return {
      month: result.month,
      summary: result.summary,
      items: result.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
      })),
    };
  });

  app.post('/fixed-expenses', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = fixedExpenseSchema.parse(request.body);
    const item = createFixedExpense(
      {
        ...payload,
        userId: request.auth.userId!,
      },
      {
        actorId: request.auth.userId!,
        role: request.auth.role!,
      },
    );

    return reply.code(201).send({
      item: {
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
      },
    });
  });

  app.patch('/fixed-expenses/:id', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = fixedExpenseUpdateSchema.parse(request.body);
    const item = updateFixedExpense(
      (request.params as { id: string }).id,
      request.auth.userId!,
      payload,
      {
        actorId: request.auth.userId!,
        role: request.auth.role!,
      },
    );

    return reply.code(200).send({
      item: {
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
      },
    });
  });

  app.delete('/fixed-expenses/:id', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return reply.code(200).send({
      success: true,
      fixedExpenseId: deleteFixedExpense((request.params as { id: string }).id, request.auth.userId!, {
        actorId: request.auth.userId!,
        role: request.auth.role!,
      }),
    });
  });

  app.post('/fixed-expenses/:id/pay', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const result = payFixedExpense((request.params as { id: string }).id, request.auth.userId!, {
      actorId: request.auth.userId!,
      role: request.auth.role!,
    });

    return reply.code(200).send({
      item: {
        ...result,
        fixedExpense: {
          ...result.fixedExpense,
          createdAt: new Date(result.fixedExpense.createdAt).toISOString(),
          updatedAt: new Date(result.fixedExpense.updatedAt).toISOString(),
        },
        transaction: {
          ...result.transaction,
          createdAt: new Date(result.transaction.createdAt).toISOString(),
          effectiveAt: new Date(result.transaction.effectiveAt).toISOString(),
          title: result.transaction.note ?? result.transaction.type,
        },
      },
    });
  });

  app.get('/categories', async (_request) => {
    return {
      items: listCategories(),
    };
  });

  app.post('/categories', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = categorySchema.parse(request.body);

    return reply.code(201).send({
      item: createCategory(payload.name, {
        actorId: request.auth.userId!,
        role: request.auth.role!,
      }),
    });
  });

  app.post('/sync/batch', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = syncBatchSchema.parse(request.body);

    return reply.code(202).send({
      received: payload.items.length,
      status: 'accepted',
      items: payload.items.map((item) =>
        createTransaction(
          {
            ...item.payload,
            actorUserId: request.auth.userId!,
            clientOperationId: item.clientOperationId,
          },
          {
            actorId: request.auth.userId!,
            role: request.auth.role!,
          },
        ),
      ),
    });
  });

  app.get('/notification-preferences', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    return (
      getNotificationPreferences(request.auth.userId!) ?? {
        incomeOn: true,
        expenseOn: true,
        transferOn: true,
        updateOn: true,
        deleteOn: true,
      }
    );
  });

  app.put('/notification-preferences', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = notificationPreferencesSchema.parse(request.body);

    return reply.code(200).send({
      success: true,
      preferences: updateNotificationPreferences(request.auth.userId!, {
        userId: request.auth.userId!,
        ...payload,
      }),
    });
  });

  app.post('/push/subscribe', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const payload = pushSubscriptionSchema.parse(request.body);

    savePushSubscription(request.auth.userId!, payload);
    
    return reply.code(201).send({
      success: true,
      subscription: payload,
    });
  });

  app.get('/notifications', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    const items = listNotifications(request.auth.userId!);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
      })),
    };
  });

  app.post('/notifications/clear', async (request, reply) => {
    const blocked = ensureAuthenticated(request, reply);

    if (blocked) {
      return blocked;
    }

    clearNotifications(request.auth.userId!);

    return { success: true };
  });
};
