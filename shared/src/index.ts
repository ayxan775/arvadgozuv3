export const APP_NAME = 'Ortaq Maliyyə' as const;

export const ROUTES = {
  login: '/login',
  dashboard: '/',
  transactions: '/transactions',
  fixedExpenses: '/fixed-expenses',
  transactionNew: '/transactions/new',
  transactionNewIncome: '/transactions/new/income',
  transactionNewExpense: '/transactions/new/expense',
  transactionNewTransfer: '/transactions/new/transfer',
  stats: '/stats',
  notifications: '/notifications',
  notificationSettings: '/notification-settings',
  profile: '/profile',
  admin: '/admin',
} as const;

export const API_ROUTES = {
  me: '/auth/me',
  login: '/auth/login',
  logout: '/auth/logout',
  dashboardSummary: '/dashboard/summary',
  dashboardRecent: '/dashboard/recent',
  transactions: '/transactions',
  transfers: '/transfers',
  transferUsers: '/transfer-users',
  fixedExpenses: '/fixed-expenses',
  categories: '/categories',
  statsOverview: '/stats/overview',
  statsByCategory: '/stats/by-category',
  statsByUser: '/stats/by-user',
  notificationPreferences: '/notification-preferences',
  pushSubscribe: '/push/subscribe',
  syncBatch: '/sync/batch',
  adminSummary: '/admin/summary',
  adminUsers: '/admin/users',
  adminAuditLogs: '/admin/audit-logs',
} as const;

export type UserRole = 'user' | 'admin';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'synced';

export type EntityStatus = 'active' | 'inactive';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'sync'
  | 'login'
  | 'admin_action';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface SessionState {
  isAuthenticated: boolean;
  userId: string | null;
  username: string | null;
  role: UserRole | null;
}

export interface DashboardSummary {
  totalBalance: number;
  myBalance: number;
  partnerBalance: number;
  myUsername: string | null;
  partnerUsername: string | null;
  todayIncome: number;
  todayExpense: number;
  pendingSyncCount: number;
}

export interface TransactionItem {
  id: string;
  type: TransactionType;
  amount: number;
  note?: string;
  title?: string;
  counterparty?: string;
  categoryId?: string;
  actorUserId?: string;
  relatedUserId?: string;
  effectiveAt?: string;
  createdAt?: string;
  status: SyncStatus;
}

export interface FixedExpenseItem {
  id: string;
  title: string;
  baseAmount: number;
  dueAmount: number;
  unpaidMonths: number;
  lastPaidAmount: number;
  isPaidCurrentMonth: boolean;
  startMonth: string;
  lastPaidMonth?: string;
  note?: string;
  categoryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FixedExpenseSummary {
  month: string;
  totalCount: number;
  paidCount: number;
  totalBase: number;
  totalPaid: number;
  totalDue: number;
}

export interface FixedExpensePaymentResult {
  fixedExpense: FixedExpenseItem;
  transaction: TransactionItem;
  paidAmount: number;
  unpaidMonths: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  createdBy?: string;
}

export interface NotificationPreferences {
  incomeOn: boolean;
  expenseOn: boolean;
  transferOn: boolean;
  updateOn: boolean;
  deleteOn: boolean;
}

export interface CategoryStatItem {
  category: string;
  amount: number;
}

export interface UserStatItem {
  user: string;
  income: number;
  expense: number;
}

export interface AdminSummary {
  pendingSyncCount: number;
  pushStatus: string;
  activeUsers: number;
}

export interface AdminUserItem {
  id: string;
  username: string;
  role: UserRole;
  status: EntityStatus;
}

export interface AuditLogItem {
  id: string;
  actor: string;
  action: AuditAction;
  entity: string;
  time?: string;
}

export interface ApiSuccess<T> {
  item?: T;
  items?: T[];
  user?: AuthUser | SessionState;
  success?: boolean;
  message?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  amount: number;
  note?: string;
  categoryId?: string;
  relatedUserId?: string;
  effectiveAt?: string;
}

export interface CreateFixedExpenseRequest {
  title: string;
  baseAmount: number;
  note?: string;
  categoryId?: string;
}

export interface UpdateFixedExpenseRequest {
  title?: string;
  baseAmount?: number;
  note?: string;
  categoryId?: string;
}

export interface UpdateTransactionRequest {
  amount?: number;
  note?: string;
  categoryId?: string;
  relatedUserId?: string;
  effectiveAt?: string;
}

export interface CreateCategoryRequest {
  name: string;
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface PushSubscriptionRequest {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}
