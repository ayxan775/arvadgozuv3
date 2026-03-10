import 'dotenv/config';

import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }

  return value;
}, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  COOKIE_NAME: z.string().min(1).default('ortaq_session'),
  SESSION_SECRET: z.string().min(8).default('change-this-session-secret'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(24 * 365).default(24 * 7),
  COOKIE_DOMAIN: optionalNonEmptyString,
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  TRUST_PROXY: booleanFromEnv.default(false),
  SQLITE_DB_PATH: z.string().min(1).default('./api/data/app.db'),
  UPLOAD_DIR: z.string().min(1).default('./api/uploads'),
  BACKUP_DIR: z.string().min(1).default('./api/backups'),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().or(z.string().startsWith('mailto:')).default('mailto:admin@example.com'),
  ALLOW_PROD_SEED: booleanFromEnv.default(false),
  SEED_DEFAULT_PASSWORD: z.string().min(8).default('12345678'),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production') {
    if (value.SESSION_SECRET === 'change-this-session-secret' || value.SESSION_SECRET.length < 32) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SESSION_SECRET must be set to a strong random value with at least 32 characters in production.',
        path: ['SESSION_SECRET'],
      });
    }
  }
});

export const env = envSchema.parse(process.env);

export type AppEnv = typeof env;
