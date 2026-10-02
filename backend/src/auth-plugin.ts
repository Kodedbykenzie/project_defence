import type { preHandlerHookHandler } from 'fastify';
import { forbidden, unauthorized } from './errors.js';
import { verifyAccessToken, type AccessClaims } from './security.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Present once a valid Bearer token was verified. */
    user?: AccessClaims;
  }
}

/** Parses `Authorization: Bearer <jwt>` and attaches claims. Never rejects. */
export async function attachUser(req: Parameters<preHandlerHookHandler>[0]): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return;
  try {
    req.user = await verifyAccessToken(header.slice(7).trim());
  } catch {
    /* expired / forged token → treated as anonymous; requireAuth will reject */
  }
}

/** 401 unless a valid token was attached. */
export const requireAuth: preHandlerHookHandler = async (req) => {
  if (!req.user) throw unauthorized('UNAUTHORIZED', 'Sign in required.');
};

/** 401 without a token, 403 when the role is not allowed. */
export const requireRole =
  (...roles: ('student' | 'admin' | 'verifier')[]): preHandlerHookHandler =>
  async (req) => {
    if (!req.user) throw unauthorized('UNAUTHORIZED', 'Sign in required.');
    if (!roles.includes(req.user.role)) throw forbidden('FORBIDDEN', 'Insufficient role.');
  };
