import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { env } from '@/config/env';

import * as schema from './schema.js';

const dbFilePath = path.resolve(process.cwd(), env.SQLITE_DB_PATH);
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export const sqlite = new Database(dbFilePath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

export type AppDatabase = typeof db;
