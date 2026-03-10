import type { FastifyReply, FastifyRequest } from 'fastify';

export function ensureAuthenticated(request: FastifyRequest, reply: FastifyReply) {
  if (!request.auth.isAuthenticated) {
    return reply.code(401).send({
      message: 'Authentication required',
    });
  }

  return null;
}

export function ensureAdmin(request: FastifyRequest, reply: FastifyReply) {
  const unauthenticated = ensureAuthenticated(request, reply);

  if (unauthenticated) {
    return unauthenticated;
  }

  if (request.auth.role !== 'admin') {
    return reply.code(403).send({
      message: 'Admin access required',
    });
  }

  return null;
}
