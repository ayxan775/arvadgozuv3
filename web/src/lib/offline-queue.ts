import { openDB } from 'idb';

import type { CreateTransactionRequest, SyncStatus, TransactionType, UpdateTransactionRequest } from '@shared/index';

type OfflineOperationType = 'create' | 'update' | 'delete';

export type OfflineQueueItem = {
  id: string;
  clientOperationId: string;
  operation: OfflineOperationType;
  transactionType?: TransactionType;
  transactionId?: string;
  payload: CreateTransactionRequest | UpdateTransactionRequest | { id: string };
  status: SyncStatus;
  createdAt: string;
  retryCount: number;
  lastError?: string;
};

const DB_NAME = 'ortaq-maliyye-offline';
const STORE_NAME = 'queue';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

export async function enqueueOfflineItem(item: OfflineQueueItem) {
  const db = await getDb();
  await db.put(STORE_NAME, item);
  return item;
}

export async function listOfflineItems() {
  const db = await getDb();
  return db.getAll(STORE_NAME) as Promise<OfflineQueueItem[]>;
}

export async function updateOfflineItem(id: string, updates: Partial<OfflineQueueItem>) {
  const db = await getDb();
  const existing = (await db.get(STORE_NAME, id)) as OfflineQueueItem | undefined;

  if (!existing) {
    return null;
  }

  const next = { ...existing, ...updates };
  await db.put(STORE_NAME, next);
  return next;
}

export async function removeOfflineItem(id: string) {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export async function clearOfflineQueue() {
  const db = await getDb();
  await db.clear(STORE_NAME);
}
