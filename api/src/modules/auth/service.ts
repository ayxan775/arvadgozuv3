import crypto from 'node:crypto';

import argon2 from 'argon2';
import { and, eq, gt } from 'drizzle-orm';

import { env } from '@/config/env';
import { db } from '@/db/client';
import { sessions, users } from '@/db/schema';
import { generateSessionToken, hashSessionToken } from '@/lib/session';

const SESSION_TTL_MS = env.SESSION_TTL_HOURS * 60 * 60 * 1000;

export async function validateUserCredentials(username: string, password: string) {
  const user = db.select().from(users).where(eq(users.username, username)).get();

  if (!user || !user.isActive) {
    return null;
  }

  const passwordMatches = await argon2.verify(user.passwordHash, password);

  if (!passwordMatches) {
    return null;
  }

  return user;
}

export function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  db.insert(sessions)
    .values({
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      createdAt: now,
      lastSeenAt: now,
      ipAddress,
      userAgent,
    })
    .run();

  return {
    token,
    expiresAt,
  };
}

export function revokeSession(sessionToken: string) {
  const tokenHash = hashSessionToken(sessionToken);

  db.delete(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .run();
}

export function resolveSession(sessionToken: string | undefined) {
  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);

  const row = db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      username: users.username,
      role: users.role,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .get();

  if (!row || !row.isActive) {
    return null;
  }

  db.update(sessions)
    .set({
      lastSeenAt: new Date(),
    })
    .where(eq(sessions.id, row.sessionId))
    .run();

  return {
    isAuthenticated: true,
    userId: row.userId,
    username: row.username,
    role: row.role,
  } as const;
}

export function buildSessionCookieOptions(expiresAt: Date) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    expires: expiresAt,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function buildClearSessionCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}
