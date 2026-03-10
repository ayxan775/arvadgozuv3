import {
  API_ROUTES,
  type AdminSummary,
  type AdminUserItem,
  type AuditLogItem,
  type AuthUser,
  type CategoryItem,
  type CategoryStatItem,
  type CreateCategoryRequest,
  type CreateFixedExpenseRequest,
  type CreateTransactionRequest,
  type UpdateFixedExpenseRequest,
  type FixedExpenseItem,
  type FixedExpensePaymentResult,
  type FixedExpenseSummary,
  type DashboardSummary,
  type LoginRequest,
  type NotificationPreferences,
  type PushSubscriptionRequest,
  type SessionState,
  type TransactionItem,
  type UpdateTransactionRequest,
  type UserStatItem,
} from '@shared/index';

type SerializableBody = Record<string, unknown> | unknown[];
type RequestBody = BodyInit | SerializableBody | undefined;

type TransactionQueryParams = {
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const viteEnv = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string, PROD?: boolean } }).env;
const isProd = viteEnv?.PROD ?? false;
const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultBaseUrl = isProd ? '' : `http://${runtimeHost}:3000`;
const API_BASE_URL = viteEnv?.VITE_API_BASE_URL ?? defaultBaseUrl;

const jsonHeaders = {
  Accept: 'application/json',
} satisfies HeadersInit;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isSerializableBody(body: RequestBody): body is SerializableBody {
  if (!body) {
    return false;
  }

  if (typeof body === 'string') {
    return false;
  }

  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return false;
  }

  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return false;
  }

  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return false;
  }

  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) {
    return false;
  }

  return true;
}

async function request<T>(path: string, init?: Omit<RequestInit, 'body'> & { body?: RequestBody }) {
  const headers = new Headers({
    ...jsonHeaders,
    ...(init?.headers ?? {}),
  });

  let body = init?.body;

  if (isSerializableBody(body)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    body: body ?? null,
    headers,
    credentials: 'include',
  });

  const raw = await response.text();
  const data = raw ? (JSON.parse(raw) as unknown) : undefined;

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function withQuery(path: string, params?: TransactionQueryParams) {
  if (!params) {
    return path;
  }

  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const api = {
  me: () => request<{ user: SessionState }>(API_ROUTES.me),
  login: (payload: LoginRequest) =>
    request<{ user: AuthUser }>(API_ROUTES.login, {
      method: 'POST',
      body: payload as unknown as SerializableBody,
    }),
  logout: () => request<{ success: boolean }>(API_ROUTES.logout, { method: 'POST' }),
  getDashboardSummary: () => request<DashboardSummary>(API_ROUTES.dashboardSummary),
  getDashboardRecent: () => request<{ items: TransactionItem[] }>(API_ROUTES.dashboardRecent),
  getTransactions: (params?: TransactionQueryParams) =>
    request<{ items: TransactionItem[]; meta?: PaginationMeta }>(withQuery(API_ROUTES.transactions, params)),
  createTransaction: (payload: CreateTransactionRequest) =>
    request<{ item: TransactionItem }>(API_ROUTES.transactions, {
      method: 'POST',
      body: payload as unknown as SerializableBody,
    }),
  updateTransaction: (id: string, payload: UpdateTransactionRequest) =>
    request<{ item: TransactionItem }>(`${API_ROUTES.transactions}/${id}`, {
      method: 'PATCH',
      body: payload as unknown as SerializableBody,
    }),
  deleteTransaction: (id: string) =>
    request<{ success: boolean; transactionId: string }>(`${API_ROUTES.transactions}/${id}`, { method: 'DELETE' }),
  createTransfer: (payload: CreateTransactionRequest) =>
    request<{ item: TransactionItem }>(API_ROUTES.transfers, {
      method: 'POST',
      body: payload as unknown as SerializableBody,
    }),
  getTransferUsers: () => request<{ items: AdminUserItem[] }>(API_ROUTES.transferUsers),
  getFixedExpenses: () =>
    request<{ month: string; summary: FixedExpenseSummary; items: FixedExpenseItem[] }>(API_ROUTES.fixedExpenses),
  createFixedExpense: (payload: CreateFixedExpenseRequest) =>
    request<{ item: FixedExpenseItem }>(API_ROUTES.fixedExpenses, {
      method: 'POST',
      body: payload as unknown as SerializableBody,
    }),
  updateFixedExpense: (id: string, payload: UpdateFixedExpenseRequest) =>
    request<{ item: FixedExpenseItem }>(`${API_ROUTES.fixedExpenses}/${id}`, {
      method: 'PATCH',
      body: payload as unknown as SerializableBody,
    }),
  deleteFixedExpense: (id: string) =>
    request<{ success: boolean; fixedExpenseId: string }>(`${API_ROUTES.fixedExpenses}/${id}`, { method: 'DELETE' }),
  payFixedExpense: (id: string) =>
    request<{ item: FixedExpensePaymentResult }>(`${API_ROUTES.fixedExpenses}/${id}/pay`, { method: 'POST' }),
  getCategories: () => request<{ items: CategoryItem[] }>(API_ROUTES.categories),
  createCategory: (payload: CreateCategoryRequest) =>
    request<{ item: CategoryItem }>(API_ROUTES.categories, {
      method: 'POST',
      body: payload as unknown as SerializableBody,
    }),
  getStatsOverview: () => request<DashboardSummary>(API_ROUTES.statsOverview),
  getStatsByCategory: () => request<{ items: CategoryStatItem[] }>(API_ROUTES.statsByCategory),
  getStatsByUser: () => request<{ items: UserStatItem[] }>(API_ROUTES.statsByUser),
  getNotificationPreferences: () => request<NotificationPreferences>(API_ROUTES.notificationPreferences),
  updateNotificationPreferences: (payload: NotificationPreferences) =>
    request<{ success: boolean; preferences: NotificationPreferences }>(API_ROUTES.notificationPreferences, {
      method: 'PUT',
      body: payload as unknown as SerializableBody,
    }),
  subscribePush: (payload: PushSubscriptionRequest) =>
    request<{ success: boolean; subscription: PushSubscriptionRequest }>(API_ROUTES.pushSubscribe, {
      method: 'POST',
      body: payload as unknown as SerializableBody,
    }),
  getAdminSummary: () => request<AdminSummary>(API_ROUTES.adminSummary),
  getAdminUsers: () => request<{ items: AdminUserItem[] }>(API_ROUTES.adminUsers),
  getAdminAuditLogs: () => request<{ items: AuditLogItem[] }>(API_ROUTES.adminAuditLogs),
};
