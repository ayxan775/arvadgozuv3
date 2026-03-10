import 'fastify';

import type { UserRole } from '@shared/index';

declare module 'fastify' {
  interface FastifyRequest {
    _auth?: {
      isAuthenticated: boolean;
      userId: string | null;
      username: string | null;
      role: UserRole | null;
    };
    auth: {
      isAuthenticated: boolean;
      userId: string | null;
      username: string | null;
      role: UserRole | null;
    };
  }
}

export {};
