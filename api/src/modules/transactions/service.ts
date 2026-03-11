import { nanoid } from 'nanoid';
import webpush from 'web-push';
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';

import { env } from '@/config/env';

import { db } from '@/db/client';
import {
  auditLogs,
  balances,
  categories,
  fixedExpenses,
  notificationCenter,
  notificationPreferences,
  pushSubscriptions,
  syncQueueMeta,
  transactionRevisions,
  transactions,
  users,
} from '@/db/schema';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

type TransactionInput = {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  note?: string | undefined;
  categoryId?: string | undefined;
  relatedUserId?: string | undefined;
  effectiveAt?: string | undefined;
  actorUserId: string;
  clientOperationId?: string | undefined;
};

type TransactionUpdateInput = {
  amount?: number | undefined;
  note?: string | undefined;
  categoryId?: string | undefined;
  relatedUserId?: string | undefined;
  effectiveAt?: string | undefined;
};

type AuditActor = {
  actorId: string;
  role: 'user' | 'admin';
};

type PersistedTransaction = typeof transactions.$inferSelect;
type InsertBalance = typeof balances.$inferInsert;
type InsertAuditLog = typeof auditLogs.$inferInsert;
type InsertRevision = typeof transactionRevisions.$inferInsert;
type InsertCategory = typeof categories.$inferInsert;
type PersistedFixedExpense = typeof fixedExpenses.$inferSelect;

type FixedExpenseInput = {
  title: string;
  baseAmount: number;
  note?: string | undefined;
  categoryId?: string | undefined;
  userId: string;
};

type FixedExpenseUpdateInput = {
  title?: string | undefined;
  baseAmount?: number | undefined;
  note?: string | undefined;
  categoryId?: string | undefined;
};

function serialize(value: unknown) {
  return JSON.stringify(value ?? null);
}

function getEffectiveTimestamp(effectiveAt?: string) {
  return effectiveAt ? new Date(effectiveAt) : new Date();
}

function toYearMonth(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function toMonthIndex(value: string) {
  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid year-month value: ${value}`);
  }

  return year * 12 + (month - 1);
}

function calcUnpaidMonths(expense: Pick<PersistedFixedExpense, 'startMonth' | 'lastPaidMonth'>, currentMonth: string) {
  const currentMonthIndex = toMonthIndex(currentMonth);
  const startMonthIndex = toMonthIndex(expense.startMonth);

  if (currentMonthIndex < startMonthIndex) {
    return 0;
  }

  const nextUnpaidMonthIndex = expense.lastPaidMonth ? toMonthIndex(expense.lastPaidMonth) + 1 : startMonthIndex;

  if (nextUnpaidMonthIndex > currentMonthIndex) {
    return 0;
  }

  return currentMonthIndex - nextUnpaidMonthIndex + 1;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function findBalance(tx: any, userId: string) {
  return tx.select().from(balances).where(eq(balances.userId, userId)).get();
}

function ensureBalanceRow(tx: any, userId: string) {
  const row = findBalance(tx, userId);

  if (row) {
    return row;
  }

  const balanceRow: InsertBalance = {
    userId,
    currentBalance: 0,
    updatedAt: new Date(),
  };

  tx.insert(balances)
    .values([balanceRow])
    .run();

  return balanceRow;
}

function adjustBalance(tx: any, userId: string, delta: number) {
  const current = ensureBalanceRow(tx, userId);

  tx.update(balances)
    .set({
      currentBalance: (current.currentBalance ?? 0) + delta,
      updatedAt: new Date(),
    })
    .where(eq(balances.userId, userId))
    .run();
}

function applyTransactionEffect(tx: any, transaction: Pick<PersistedTransaction, 'type' | 'amount' | 'actorUserId' | 'relatedUserId'>, direction: 1 | -1) {
  const signedAmount = transaction.amount * direction;

  if (transaction.type === 'income') {
    adjustBalance(tx, transaction.actorUserId, signedAmount);
    return;
  }

  if (transaction.type === 'expense') {
    adjustBalance(tx, transaction.actorUserId, -signedAmount);
    return;
  }

  if (transaction.relatedUserId) {
    adjustBalance(tx, transaction.actorUserId, -signedAmount);
    adjustBalance(tx, transaction.relatedUserId, signedAmount);
  }
}

function insertAuditLog(tx: any, actor: AuditActor, action: string, entityType: string, entityId: string, payload: unknown) {
  const auditRow: InsertAuditLog = {
    id: nanoid(),
    actorId: actor.actorId,
    role: actor.role,
    action,
    entityType,
    entityId,
    payloadJson: serialize(payload),
    createdAt: new Date(),
  };

  tx.insert(auditLogs)
    .values(auditRow as any)
    .run();
}

function insertRevision(
  tx: any,
  transactionId: string,
  actionType: 'create' | 'update' | 'delete' | 'sync',
  changedBy: string,
  beforeValue: unknown,
  afterValue: unknown,
) {
  const revisionRow: InsertRevision = {
    id: nanoid(),
    transactionId,
    actionType,
    beforeJson: serialize(beforeValue),
    afterJson: serialize(afterValue),
    changedBy,
    changedAt: new Date(),
  };

  tx.insert(transactionRevisions)
    .values(revisionRow as any)
    .run();
}

function getTransactionOrThrow(tx: any, transactionId: string) {
  const existing = tx.select().from(transactions).where(eq(transactions.id, transactionId)).get();

  if (!existing) {
    throw new Error('Transaction not found');
  }

  return existing;
}

function createTransactionInTx(
  tx: any,
  input: TransactionInput,
  actor: AuditActor,
  options?: {
    skipSyncQueue?: boolean;
    noteOverride?: string | null;
    sourceType?: 'manual' | 'fixed_expense_payment';
    sourceFixedExpenseId?: string | null;
    sourceMonth?: string | null;
    rollbackPrevLastPaidMonth?: string | null;
    rollbackPrevLastPaidAmount?: number | null;
  },
) {
  const now = new Date();

  const newTransaction: PersistedTransaction = {
    id: nanoid(),
    type: input.type,
    actorUserId: input.actorUserId,
    relatedUserId: input.relatedUserId ?? null,
    amount: input.amount,
    categoryId: input.categoryId ?? null,
    note: options?.noteOverride ?? input.note ?? null,
    description: null,
    receiptUrl: null,
    sourceType: options?.sourceType ?? 'manual',
    sourceFixedExpenseId: options?.sourceFixedExpenseId ?? null,
    sourceMonth: options?.sourceMonth ?? null,
    rollbackPrevLastPaidMonth: options?.rollbackPrevLastPaidMonth ?? null,
    rollbackPrevLastPaidAmount: options?.rollbackPrevLastPaidAmount ?? null,
    effectiveAt: getEffectiveTimestamp(input.effectiveAt),
    status: 'synced' as const,
    clientOperationId: input.clientOperationId ?? null,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  tx.insert(transactions).values(newTransaction as any).run();

  applyTransactionEffect(
    tx,
    {
      type: newTransaction.type,
      amount: newTransaction.amount,
      actorUserId: newTransaction.actorUserId,
      relatedUserId: newTransaction.relatedUserId ?? null,
    },
    1,
  );

  if (!options?.skipSyncQueue && input.clientOperationId) {
    tx.insert(syncQueueMeta)
      .values({
        clientOperationId: input.clientOperationId,
        userId: input.actorUserId,
        syncedAt: new Date(),
        result: 'success',
      } as any)
      .onConflictDoNothing()
      .run();
  }

  insertRevision(tx, newTransaction.id, 'create', actor.actorId, null, newTransaction);
  insertAuditLog(tx, actor, 'create', 'transaction', newTransaction.id, newTransaction);

  return newTransaction;
}

function mapFixedExpenseWithStatus(expense: PersistedFixedExpense, currentMonth: string) {
  const unpaidMonths = calcUnpaidMonths(expense, currentMonth);
  const dueAmount = roundCurrency(expense.baseAmount * unpaidMonths);

  return {
    ...expense,
    dueAmount,
    unpaidMonths,
    isPaidCurrentMonth: expense.lastPaidMonth === currentMonth,
  };
}

type ListTransactionsParams = {
  actorUserId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
};

export function listTransactions(params: ListTransactionsParams = {}) {
  const conditions = [eq(transactions.isDeleted, false)];

  if (params.actorUserId) {
    conditions.push(eq(transactions.actorUserId, params.actorUserId));
  }

  if (params.from) {
    conditions.push(gte(transactions.effectiveAt, params.from));
  }

  if (params.to) {
    conditions.push(lte(transactions.effectiveAt, params.to));
  }

  const whereClause = and(...conditions);
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const items = db
    .select()
    .from(transactions)
    .where(whereClause)
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  const totalRaw = db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(whereClause)
    .get()?.count;

  const total = Number(totalRaw ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export function listCategories() {
  return db.select().from(categories).where(eq(categories.isActive, true)).all();
}

export function createCategory(name: string, actor: AuditActor) {
  const created: InsertCategory = {
    id: nanoid(),
    name,
    isSystem: false,
    createdBy: actor.actorId,
    isActive: true,
    createdAt: new Date(),
  };

  db.insert(categories).values(created as any).run();
  insertAuditLog(db, actor, 'create', 'category', created.id, created);

  return created;
}

export function listFixedExpenses(userId: string, month = toYearMonth(new Date())) {
  const items = db
    .select()
    .from(fixedExpenses)
    .where(and(eq(fixedExpenses.userId, userId), eq(fixedExpenses.isActive, true)))
    .orderBy(desc(fixedExpenses.createdAt))
    .all()
    .map((item) => mapFixedExpenseWithStatus(item, month));

  const totalBase = roundCurrency(items.reduce((sum, item) => sum + item.baseAmount, 0));
  const totalPaid = roundCurrency(
    items.reduce((sum, item) => sum + (item.lastPaidMonth === month ? item.lastPaidAmount : 0), 0),
  );
  const totalDue = roundCurrency(items.reduce((sum, item) => sum + item.dueAmount, 0));
  const paidCount = items.filter((item) => item.isPaidCurrentMonth).length;

  return {
    month,
    items,
    summary: {
      month,
      totalCount: items.length,
      paidCount,
      totalBase,
      totalPaid,
      totalDue,
    },
  };
}

export function createFixedExpense(input: FixedExpenseInput, actor: AuditActor) {
  const now = new Date();
  const currentMonth = toYearMonth(now);

  const created: PersistedFixedExpense = {
    id: nanoid(),
    userId: input.userId,
    title: input.title.trim(),
    baseAmount: roundCurrency(input.baseAmount),
    categoryId: input.categoryId?.trim() ? input.categoryId.trim() : null,
    note: input.note?.trim() ? input.note.trim() : null,
    startMonth: currentMonth,
    lastPaidMonth: null,
    lastPaidAmount: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(fixedExpenses).values(created as any).run();
  insertAuditLog(db, actor, 'create', 'fixed_expense', created.id, created);

  return mapFixedExpenseWithStatus(created, currentMonth);
}

export function updateFixedExpense(
  fixedExpenseId: string,
  actorUserId: string,
  payload: FixedExpenseUpdateInput,
  actor: AuditActor,
) {
  return db.transaction((tx: any) => {
    const existing = tx.select().from(fixedExpenses).where(eq(fixedExpenses.id, fixedExpenseId)).get();

    if (!existing || !existing.isActive) {
      throw new Error('Fixed expense not found');
    }

    if (existing.userId !== actorUserId && actor.role !== 'admin') {
      throw new Error('You can only edit your own fixed expense');
    }

    const nextTitle = payload.title?.trim();

    if (payload.title !== undefined && !nextTitle) {
      throw new Error('Title is required');
    }

    if (payload.baseAmount !== undefined && (!Number.isFinite(payload.baseAmount) || payload.baseAmount <= 0)) {
      throw new Error('Base amount must be greater than 0');
    }

    const updated = {
      ...existing,
      title: nextTitle ?? existing.title,
      baseAmount: payload.baseAmount !== undefined ? roundCurrency(payload.baseAmount) : existing.baseAmount,
      categoryId:
        payload.categoryId !== undefined
          ? (payload.categoryId.trim() ? payload.categoryId.trim() : null)
          : existing.categoryId,
      note: payload.note !== undefined ? (payload.note.trim() ? payload.note.trim() : null) : existing.note,
      updatedAt: new Date(),
    };

    tx.update(fixedExpenses)
      .set({
        title: updated.title,
        baseAmount: updated.baseAmount,
        categoryId: updated.categoryId,
        note: updated.note,
        updatedAt: updated.updatedAt,
      })
      .where(eq(fixedExpenses.id, existing.id))
      .run();

    insertAuditLog(tx, actor, 'update', 'fixed_expense', existing.id, {
      before: existing,
      after: updated,
    });

    return mapFixedExpenseWithStatus(updated, toYearMonth(new Date()));
  });
}

export function deleteFixedExpense(fixedExpenseId: string, actorUserId: string, actor: AuditActor) {
  return db.transaction((tx: any) => {
    const existing = tx.select().from(fixedExpenses).where(eq(fixedExpenses.id, fixedExpenseId)).get();

    if (!existing || !existing.isActive) {
      throw new Error('Fixed expense not found');
    }

    if (existing.userId !== actorUserId && actor.role !== 'admin') {
      throw new Error('You can only delete your own fixed expense');
    }

    const updatedAt = new Date();

    tx.update(fixedExpenses)
      .set({
        isActive: false,
        updatedAt,
      })
      .where(eq(fixedExpenses.id, existing.id))
      .run();

    insertAuditLog(tx, actor, 'delete', 'fixed_expense', existing.id, {
      before: existing,
      after: {
        ...existing,
        isActive: false,
        updatedAt,
      },
    });

    return existing.id;
  });
}

export function payFixedExpense(fixedExpenseId: string, actorUserId: string, actor: AuditActor) {
  const result = db.transaction((tx: any) => {
    const existing = tx.select().from(fixedExpenses).where(eq(fixedExpenses.id, fixedExpenseId)).get();

    if (!existing || !existing.isActive) {
      throw new Error('Fixed expense not found');
    }

    if (existing.userId !== actorUserId && actor.role !== 'admin') {
      throw new Error('You can only pay your own fixed expense');
    }

    const currentMonth = toYearMonth(new Date());
    const unpaidMonths = calcUnpaidMonths(existing, currentMonth);

    if (unpaidMonths < 1) {
      throw new Error('Bu ay üçün ödəniş artıq edilib');
    }

    const paidAmount = roundCurrency(existing.baseAmount * unpaidMonths);
    const transactionNote =
      unpaidMonths > 1 ? `Sabit xərc: ${existing.title} (${unpaidMonths} ay)` : `Sabit xərc: ${existing.title}`;

    const transaction = createTransactionInTx(
      tx,
      {
        type: 'expense',
        amount: paidAmount,
        note: transactionNote,
        categoryId: existing.categoryId ?? undefined,
        actorUserId: existing.userId,
        effectiveAt: new Date().toISOString(),
      },
      actor,
      {
        skipSyncQueue: true,
        sourceType: 'fixed_expense_payment',
        sourceFixedExpenseId: existing.id,
        sourceMonth: currentMonth,
        rollbackPrevLastPaidMonth: existing.lastPaidMonth,
        rollbackPrevLastPaidAmount: existing.lastPaidAmount,
      },
    );

    const now = new Date();

    tx.update(fixedExpenses)
      .set({
        lastPaidMonth: currentMonth,
        lastPaidAmount: paidAmount,
        updatedAt: now,
      })
      .where(eq(fixedExpenses.id, existing.id))
      .run();

    const updated = tx.select().from(fixedExpenses).where(eq(fixedExpenses.id, existing.id)).get();

    if (!updated) {
      throw new Error('Fixed expense not found');
    }

    insertAuditLog(tx, actor, 'update', 'fixed_expense', existing.id, {
      before: existing,
      after: updated,
      paidAmount,
      unpaidMonths,
      transactionId: transaction.id,
    });

    return {
      fixedExpense: mapFixedExpenseWithStatus(updated, currentMonth),
      transaction,
      paidAmount,
      unpaidMonths,
    };
  });

  const partnerId = getPartnerUserId(actorUserId);
  if (partnerId) {
    void notifyUser(partnerId, {
      type: 'expense',
      title: 'Sabit xərc ödənişi',
      body: `${result.fixedExpense.title}: ${result.paidAmount} AZN`,
      data: { transactionId: result.transaction.id },
    });
  }

  return result;
}

export function createTransaction(input: TransactionInput, actor: AuditActor) {
  const created = db.transaction((tx: any) => {
    if (input.clientOperationId) {
      const existingSync = tx.select().from(syncQueueMeta).where(eq(syncQueueMeta.clientOperationId, input.clientOperationId)).get();

      if (existingSync) {
        const existingTransaction = tx.select().from(transactions).where(eq(transactions.clientOperationId, input.clientOperationId)).get();

        if (existingTransaction) {
          return existingTransaction;
        }
      }
    }
    return createTransactionInTx(tx, input, actor);
  });

  const partnerId = getPartnerUserId(input.actorUserId);
  if (partnerId) {
    void notifyUser(partnerId, {
      type: input.type,
      title: input.type === 'income' ? 'Yeni gəlir' : input.type === 'transfer' ? 'Yeni transfer' : 'Yeni xərc',
      body: `${input.amount} AZN - ${input.note ?? ''}`,
      data: { transactionId: created.id },
    });
  }

  return created;
}

export function updateTransaction(transactionId: string, actorUserId: string, payload: TransactionUpdateInput, actor: AuditActor) {
  const result = db.transaction((tx: any) => {
    const existing = getTransactionOrThrow(tx, transactionId);

    if (existing.actorUserId !== actorUserId && actor.role !== 'admin') {
      throw new Error('You can only edit your own transaction');
    }

    applyTransactionEffect(tx, existing, -1);

    const updated = {
      ...existing,
      amount: payload.amount ?? existing.amount,
      note: payload.note ?? existing.note,
      categoryId: payload.categoryId ?? existing.categoryId,
      relatedUserId: payload.relatedUserId ?? existing.relatedUserId,
      effectiveAt: payload.effectiveAt ? getEffectiveTimestamp(payload.effectiveAt) : existing.effectiveAt,
      updatedAt: new Date(),
    };

    tx.update(transactions)
      .set({
        amount: updated.amount,
        note: updated.note,
        categoryId: updated.categoryId,
        relatedUserId: updated.relatedUserId,
        effectiveAt: updated.effectiveAt,
        updatedAt: updated.updatedAt,
      })
      .where(eq(transactions.id, existing.id))
      .run();

    applyTransactionEffect(tx, updated, 1);
    insertRevision(tx, existing.id, 'update', actor.actorId, existing, updated);
    insertAuditLog(tx, actor, 'update', 'transaction', existing.id, { before: existing, after: updated });

    return updated;
  });

  const partnerId = getPartnerUserId(actorUserId);
  if (partnerId) {
    void notifyUser(partnerId, {
      type: 'update',
      title: 'Yenilənmiş əməliyyat',
      body: `${result.amount} AZN - ${result.note ?? ''}`,
      data: { transactionId: result.id },
    });
  }

  return result;
}

export function deleteTransaction(transactionId: string, actorUserId: string, actor: AuditActor) {
  const result = db.transaction((tx: any) => {
    const existing = getTransactionOrThrow(tx, transactionId);

    if (existing.actorUserId !== actorUserId && actor.role !== 'admin') {
      throw new Error('You can only delete your own transaction');
    }

    if (existing.sourceType === 'fixed_expense_payment' && existing.sourceFixedExpenseId) {
      const linkedFixedExpense = tx.select().from(fixedExpenses).where(eq(fixedExpenses.id, existing.sourceFixedExpenseId)).get();

      if (linkedFixedExpense) {
        tx.update(fixedExpenses)
          .set({
            lastPaidMonth: existing.rollbackPrevLastPaidMonth ?? null,
            lastPaidAmount: existing.rollbackPrevLastPaidAmount ?? 0,
            updatedAt: new Date(),
          })
          .where(eq(fixedExpenses.id, linkedFixedExpense.id))
          .run();

        const restored = tx.select().from(fixedExpenses).where(eq(fixedExpenses.id, linkedFixedExpense.id)).get();

        if (restored) {
          insertAuditLog(tx, actor, 'update', 'fixed_expense', linkedFixedExpense.id, {
            reason: 'rollback_fixed_expense_payment_on_transaction_delete',
            transactionId: existing.id,
            before: linkedFixedExpense,
            after: restored,
          });
        }
      }
    }

    applyTransactionEffect(tx, existing, -1);
    
    const existingId = existing.id;
    const existingAmount = existing.amount;
    const existingNote = existing.note;

    tx.update(transactions)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, existing.id))
      .run();

    insertRevision(tx, existing.id, 'delete', actor.actorId, existing, { ...existing, isDeleted: true });
    insertAuditLog(tx, actor, 'delete', 'transaction', existing.id, existing);

    return { id: existingId, amount: existingAmount, note: existingNote };
  });

  const partnerId = getPartnerUserId(actorUserId);
  if (partnerId) {
    void notifyUser(partnerId, {
      type: 'delete',
      title: 'Silinmiş əməliyyat',
      body: `${result.note ?? ''} (${result.amount} AZN)`,
      data: { transactionId: result.id },
    });
  }

  return result.id;
}

export function getDashboardSummary(userId: string) {
  const balanceRows = db.select().from(balances).all();
  const current = balanceRows.find((item) => item.userId === userId)?.currentBalance ?? 0;
  const partnerBalanceRow = balanceRows.find((item) => item.userId !== userId);
  const partner = partnerBalanceRow?.currentBalance ?? 0;
  const myUsername = db.select({ username: users.username }).from(users).where(eq(users.id, userId)).get()?.username ?? null;
  const partnerUsername = partnerBalanceRow
    ? db.select({ username: users.username }).from(users).where(eq(users.id, partnerBalanceRow.userId)).get()?.username ?? null
    : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayTransactions = db
    .select()
    .from(transactions)
    .where(and(eq(transactions.isDeleted, false), gte(transactions.effectiveAt, todayStart)))
    .all();

  const todayIncome = todayTransactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0);

  const todayExpense = todayTransactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    totalBalance: balanceRows.reduce((sum, item) => sum + item.currentBalance, 0),
    myBalance: current,
    partnerBalance: partner,
    myUsername,
    partnerUsername,
    todayIncome,
    todayExpense,
    pendingSyncCount: db
      .select()
      .from(transactions)
      .where(and(eq(transactions.isDeleted, false), eq(transactions.status, 'pending')))
      .all().length,
  };
}

export function getRecentTransactions() {
  return db.select().from(transactions).where(eq(transactions.isDeleted, false)).orderBy(desc(transactions.createdAt)).limit(10).all();
}

export function getCategoryStats() {
  const rows = db
    .select({
      category: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
      amount: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(transactions.isDeleted, false), eq(transactions.type, 'expense')))
    .groupBy(categories.name)
    .all();

  return rows;
}

export function getUserStats() {
  const rows = db
    .select({
      user: users.username,
      type: transactions.type,
      amount: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .innerJoin(users, eq(users.id, transactions.actorUserId))
    .where(eq(transactions.isDeleted, false))
    .groupBy(users.username, transactions.type)
    .all();

  const grouped = new Map<string, { user: string; income: number; expense: number }>();

  for (const row of rows) {
    const current = grouped.get(row.user) ?? { user: row.user, income: 0, expense: 0 };

    if (row.type === 'income') {
      current.income = row.amount;
    }

    if (row.type === 'expense') {
      current.expense = row.amount;
    }

    grouped.set(row.user, current);
  }

  return Array.from(grouped.values());
}

export function getAdminSummary() {
  return {
    pendingSyncCount: db
      .select()
      .from(transactions)
      .where(and(eq(transactions.isDeleted, false), eq(transactions.status, 'pending')))
      .all().length,
    pushStatus: 'normal',
    activeUsers: db.select().from(users).where(eq(users.isActive, true)).all().length,
  };
}

export function getAdminUsers() {
  return db.select().from(users).all();
}

export function listTransferUsers(currentUserId: string) {
  return db
    .select()
    .from(users)
    .where(and(eq(users.isActive, true), eq(users.role, 'user'), ne(users.id, currentUserId)))
    .all();
}

export function getAuditLogs() {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(50).all();
}

export function getNotificationPreferences(userId: string) {
  return db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).get();
}

export function updateNotificationPreferences(
  userId: string,
  payload: typeof notificationPreferences.$inferInsert,
) {
  db.insert(notificationPreferences)
    .values([{
      userId,
      incomeOn: payload.incomeOn,
      expenseOn: payload.expenseOn,
      transferOn: payload.transferOn,
      updateOn: payload.updateOn,
      deleteOn: payload.deleteOn,
    }])
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: {
        incomeOn: payload.incomeOn,
        expenseOn: payload.expenseOn,
        transferOn: payload.transferOn,
        updateOn: payload.updateOn,
        deleteOn: payload.deleteOn,
      },
    })
    .run();

  return getNotificationPreferences(userId);
}

function getPartnerUserId(userId: string) {
  const otherUser = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isActive, true), ne(users.id, userId)))
    .get();
  return otherUser?.id;
}

export function savePushSubscription(userId: string, subscription: any) {
  db.insert(pushSubscriptions)
    .values({
      id: nanoid(),
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        lastSeenAt: new Date(),
      },
    })
    .run();
}

export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; data?: any; type: 'income' | 'expense' | 'transfer' | 'update' | 'delete' },
) {
  // Check preferences
  const prefs = getNotificationPreferences(userId);
  if (prefs) {
    if (payload.type === 'income' && !prefs.incomeOn) return;
    if (payload.type === 'expense' && !prefs.expenseOn) return;
    if (payload.type === 'transfer' && !prefs.transferOn) return;
    if (payload.type === 'update' && !prefs.updateOn) return;
    if (payload.type === 'delete' && !prefs.deleteOn) return;
  }

  // First, save to notification center
  const notificationId = nanoid();
  db.insert(notificationCenter)
    .values({
      id: notificationId,
      userId,
      type: 'transaction',
      title: payload.title,
      body: payload.body,
      isRead: false,
      createdAt: new Date(),
    })
    .run();

  // Then, send push if subscriptions exist
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return;
  }

  const subs = db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all();
  
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh,
          },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: payload.data,
        })
      );
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is no longer valid
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint)).run();
      } else {
        console.error('Push notification failed', error);
      }
    }
  }
}

export function listNotifications(userId: string) {
  return db
    .select()
    .from(notificationCenter)
    .where(eq(notificationCenter.userId, userId))
    .orderBy(desc(notificationCenter.createdAt))
    .limit(50)
    .all();
}

export function markNotificationAsRead(userId: string, id: string) {
  db.update(notificationCenter)
    .set({ isRead: true })
    .where(and(eq(notificationCenter.id, id), eq(notificationCenter.userId, userId)))
    .run();
}

export function markAllNotificationsAsRead(userId: string) {
  db.update(notificationCenter)
    .set({ isRead: true })
    .where(eq(notificationCenter.userId, userId))
    .run();
}
