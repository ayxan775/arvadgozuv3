import { relations, sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const balances = sqliteTable('balances', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentBalance: real('current_balance').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
  actorUserId: text('actor_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  relatedUserId: text('related_user_id').references(() => users.id, { onDelete: 'restrict' }),
  amount: real('amount').notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  note: text('note'),
  description: text('description'),
  receiptUrl: text('receipt_url'),
  sourceType: text('source_type', { enum: ['manual', 'fixed_expense_payment'] }).notNull().default('manual'),
  sourceFixedExpenseId: text('source_fixed_expense_id').references(() => fixedExpenses.id, { onDelete: 'set null' }),
  sourceMonth: text('source_month'),
  rollbackPrevLastPaidMonth: text('rollback_prev_last_paid_month'),
  rollbackPrevLastPaidAmount: real('rollback_prev_last_paid_amount'),
  effectiveAt: integer('effective_at', { mode: 'timestamp_ms' }).notNull(),
  status: text('status', { enum: ['pending', 'synced', 'failed'] }).notNull().default('synced'),
  clientOperationId: text('client_operation_id').unique(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const fixedExpenses = sqliteTable('fixed_expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  baseAmount: real('base_amount').notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  note: text('note'),
  startMonth: text('start_month').notNull(),
  lastPaidMonth: text('last_paid_month'),
  lastPaidAmount: real('last_paid_amount').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const transactionRevisions = sqliteTable('transaction_revisions', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  actionType: text('action_type', { enum: ['create', 'update', 'delete', 'sync'] }).notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  changedBy: text('changed_by').references(() => users.id, { onDelete: 'set null' }),
  changedAt: integer('changed_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const notificationPreferences = sqliteTable('notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  incomeOn: integer('income_on', { mode: 'boolean' }).notNull().default(true),
  expenseOn: integer('expense_on', { mode: 'boolean' }).notNull().default(true),
  transferOn: integer('transfer_on', { mode: 'boolean' }).notNull().default(true),
  updateOn: integer('update_on', { mode: 'boolean' }).notNull().default(true),
  deleteOn: integer('delete_on', { mode: 'boolean' }).notNull().default(true),
});

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const syncQueueMeta = sqliteTable('sync_queue_meta', {
  clientOperationId: text('client_operation_id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  syncedAt: integer('synced_at', { mode: 'timestamp_ms' }),
  result: text('result', { enum: ['success', 'error'] }).notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  role: text('role', { enum: ['user', 'admin'] }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  payloadJson: text('payload_json'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const notificationCenter = sqliteTable('notification_center', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  balance: one(balances, {
    fields: [users.id],
    references: [balances.userId],
  }),
  categories: many(categories),
  sessions: many(sessions),
  transactions: many(transactions),
  fixedExpenses: many(fixedExpenses),
  pushSubscriptions: many(pushSubscriptions),
  notificationPreference: one(notificationPreferences, {
    fields: [users.id],
    references: [notificationPreferences.userId],
  }),
  notifications: many(notificationCenter),
}));
