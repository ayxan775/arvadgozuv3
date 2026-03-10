import fs from 'node:fs';
import path from 'node:path';

import argon2 from 'argon2';
import { nanoid } from 'nanoid';

import { env } from '@/config/env';

import { db, sqlite } from './client.js';
import {
  balances,
  categories,
  notificationPreferences,
  users,
} from './schema.js';

async function seedUsers() {
  const now = new Date();
  const defaultPasswordHash = await argon2.hash(env.SEED_DEFAULT_PASSWORD);

  const seedUsersData = [
    { id: 'seed_vusal', username: 'vusal', role: 'user' as const, currentBalance: 0 },
    { id: 'seed_arzu', username: 'arzu', role: 'user' as const, currentBalance: 0 },
    { id: 'seed_admin', username: 'admin', role: 'admin' as const, currentBalance: 0 },
  ];

  for (const user of seedUsersData) {
    const userRow: typeof users.$inferInsert = {
      id: user.id,
      username: user.username,
      passwordHash: defaultPasswordHash,
      role: user.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    db.insert(users)
      .values([userRow])
      .onConflictDoNothing()
      .run();

    const balanceRow: typeof balances.$inferInsert = {
      userId: user.id,
      currentBalance: user.currentBalance,
      updatedAt: now,
    };

    db.insert(balances)
      .values([balanceRow])
      .onConflictDoNothing()
      .run();

    const preferenceRow: typeof notificationPreferences.$inferInsert = {
      userId: user.id,
      incomeOn: true,
      expenseOn: true,
      transferOn: true,
      updateOn: true,
      deleteOn: true,
    };

    db.insert(notificationPreferences)
      .values([preferenceRow])
      .onConflictDoNothing()
      .run();
  }
}

function seedCategories() {
  const defaultCategories = [
    { id: 'cat_home', name: 'Ev' },
    { id: 'cat_food', name: 'Qida' },
    { id: 'cat_transport', name: 'Nəqliyyat' },
    { id: 'cat_health', name: 'Sağlamlıq' },
    { id: 'cat_child', name: 'Uşaq' },
    { id: 'cat_other', name: 'Digər' },
  ];

  for (const category of defaultCategories) {
    const categoryRow: typeof categories.$inferInsert = {
      id: category.id,
      name: category.name,
      isSystem: true,
      createdBy: 'seed_admin',
      isActive: true,
    };

    db.insert(categories)
      .values([categoryRow])
      .onConflictDoNothing()
      .run();
  }
}

function ensureDirectories() {
  for (const target of [env.UPLOAD_DIR, env.BACKUP_DIR, env.SQLITE_DB_PATH]) {
    const resolved = path.resolve(process.cwd(), target);
    const directory = resolved.endsWith('.db') ? path.dirname(resolved) : resolved;
    fs.mkdirSync(directory, { recursive: true });
  }
}

async function main() {
  if (env.NODE_ENV === 'production' && !env.ALLOW_PROD_SEED) {
    throw new Error('Refusing to run seed in production without ALLOW_PROD_SEED=true.');
  }

  if (env.NODE_ENV === 'production' && env.SEED_DEFAULT_PASSWORD === '12345678') {
    throw new Error('Set a non-default SEED_DEFAULT_PASSWORD before running seed in production.');
  }

  ensureDirectories();
  await seedUsers();
  seedCategories();

  console.info('Seed completed. Default users: faiz / leyla / admin.');
  console.info(`Default password for all seeded users: ${env.SEED_DEFAULT_PASSWORD}`);
  console.info(`SQLite path: ${env.SQLITE_DB_PATH}`);
  console.info(`Seed marker: ${nanoid(8)}`);
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    sqlite.close();
  });
