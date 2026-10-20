import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { query, withTx } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  newRefreshToken,
  signAccessToken,
  newResetCode,
  verifyResetCode,
  hashIp,
} from '../security.js';
import { AuthService } from '../services/auth-service.js';

/**
 * HTTP layer for authentication.
 *
 * The route handlers only parse input, call AuthService and shape the
 * response — every rule (invite validity, token rotation, reset limits)
 * lives in the service so it can be unit tested in isolation.
 */

const InviteCheck = z.object({
  code: z.string().min(3).max(64),
  email: z.string().email().max(254).optional(),
});

const RegisterBody = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
  inviteCode: z.string().min(3).max(64),
  university: z.string().max(160).optional(),
  consent: z.boolean().optional(),
});

const LoginBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

const GoogleBody = z.object({
  idToken: z.string().min(20).max(4096),
  inviteCode: z.string().min(3).max(64).optional(),
  university: z.string().max(160).optional(),
});

const RefreshBody = z.object({ refreshToken: z.string().min(10).max(400) });

const ForgotBody = z.object({ email: z.string().email().max(254) });

const ResetBody = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/, 'The reset code is 6 digits.'),
  newPassword: z.string().min(8).max(200),
});

/** Build the service with the production dependencies. */
function buildService(): AuthService {
  return new AuthService({
    query: query as never,
    withTx: withTx as never,
    hashPassword,
    verifyPassword,
    newRefreshToken,
    signAccessToken,
    newResetCode,
    verifyResetCode,
    hashIp,
    now: () => new Date(),
  });
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const service = buildService();

  /** POST /auth/invites/check — validate a code before the student registers. */
  app.post('/invites/check', async (req) => {
    const { code, email } = InviteCheck.parse(req.body);
    return service.checkInvite(code, email);
  });

  /** POST /auth/register — create an account against an invite. */
  app.post('/register', async (req, reply) => {
    const input = RegisterBody.parse(req.body);
    const result = await service.register({
      ...input,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    return reply.code(201).send(result);
  });

  /** POST /auth/login — password sign-in. */
  app.post('/login', async (req) => {
    const input = LoginBody.parse(req.body);
    return service.login({ ...input, userAgent: req.headers['user-agent'], ip: req.ip });
  });

  /** POST /auth/refresh — rotate a refresh token. */
  app.post('/refresh', async (req) => {
    const { refreshToken } = RefreshBody.parse(req.body);
    return service.refresh(refreshToken, req.headers['user-agent'], req.ip);
  });

  /** POST /auth/logout — revoke the presented session. */
  app.post('/logout', async (req, reply) => {
    const { refreshToken } = RefreshBody.parse(req.body);
    await service.logout(refreshToken);
    return reply.code(204).send();
  });

  /** POST /auth/google — sign in with a Google ID token. */
  app.post('/google', async (req) => {
    const input = GoogleBody.parse(req.body);
    return service.loginWithGoogle({
      ...input,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  /**
   * POST /auth/password/forgot — always 204 so the endpoint cannot be used
   * to discover which email addresses have accounts. Outside production the
   * generated code is echoed back because no mail transport is configured.
   */
  app.post('/password/forgot', async (req, reply) => {
    const { email } = ForgotBody.parse(req.body);
    const result = await service.requestPasswordReset(email);
    if (result.code) {
      req.log.info({ email: maskEmail(email) }, 'password reset code issued (dev)');
      return reply.code(200).send({ devCode: result.code });
    }
    return reply.code(204).send();
  });

  /** POST /auth/password/reset — set a new password with a 6-digit code. */
  app.post('/password/reset', async (req, reply) => {
    const input = ResetBody.parse(req.body);
    await service.resetPassword(input.email, input.code, input.newPassword);
    return reply.code(204).send();
  });
}

function maskEmail(email: string): string {
  const [local = '', domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
}
