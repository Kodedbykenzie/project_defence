import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, type ZodIssue } from 'zod';

/** Application error carrying the API error code from openapi.yaml. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
  }
}

export const notFound = (code = 'NOT_FOUND', message?: string) =>
  new AppError(404, code, message);
export const badRequest = (code: string, message?: string) =>
  new AppError(422, code, message);
export const conflict = (code: string, message?: string) => new AppError(409, code, message);
export const unauthorized = (code = 'UNAUTHORIZED', message?: string) =>
  new AppError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message?: string) =>
  new AppError(403, code, message);

interface PgError {
  code?: string;
  constraint?: string;
  message?: string;
}

/** Triggers raise SQLSTATE P0001 with stable messages (INVITE_EXPIRED, …). */
function mapPgError(err: PgError): AppError | null {
  if (err.code === 'P0001') {
    // Business rule enforced by a DB trigger → 409 with the stable code.
    const code = (err.message ?? 'CONFLICT').trim();
    return conflict(code, humanise(code));
  }
  if (err.code === '23505') {
    switch (err.constraint) {
      case 'users_email_key':
        return conflict('EMAIL_TAKEN', 'This email already has an account.');
      case 'invites_code_key':
        return conflict('INVITE_CODE_EXISTS');
      case 'credentials_user_id_module_id_key':
        return conflict('CREDENTIAL_EXISTS', 'A credential was already issued for this module.');
      case 'credentials_pkey':
        return conflict('CREDENTIAL_ID_EXISTS');
      default:
        return conflict('DUPLICATE');
    }
  }
  if (err.code === '23514') return badRequest('CONSTRAINT_VIOLATION', err.constraint);
  if (err.code === '23503') return badRequest('REFERENCE_MISSING', err.constraint);
  if (err.code === '40001' || err.code === '40P01')
    return new AppError(503, 'CONFLICT_RETRY', 'Please retry.');
  return null;
}

function humanise(code: string): string {
  const map: Record<string, string> = {
    INVITE_EXPIRED: 'This invite code has expired.',
    INVITE_REVOKED: 'This invite code was revoked.',
    INVITE_USED: 'This invite code has already been used.',
    INVITE_EMAIL_MISMATCH: 'This invite was issued for a different email address.',
    COMPETENCY_NOT_MET: 'Complete every lesson, the activity and a passing quiz first.',
    CREDENTIAL_IMMUTABLE: 'Credential hashes cannot be changed.',
  };
  return map[code] ?? code;
}

function zodDetails(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((i: ZodIssue) => ({ path: i.path.join('.'), message: i.message }));
}

export function errorHandler(
  err: FastifyError | AppError | ZodError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  // 1. Our own errors
  if (err instanceof AppError) {
    reply.code(err.statusCode).send({ code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }
  // 2. Zod validation
  if (err instanceof ZodError) {
    reply.code(422).send({ code: 'VALIDATION_ERROR', message: 'Request failed validation.', details: zodDetails(err) });
    return;
  }
  const pgErr = err as unknown as PgError;
  // 3. Database business rules & constraints
  const mapped = mapPgError(pgErr);
  if (mapped) {
    reply.code(mapped.statusCode).send({ code: mapped.code, message: mapped.message });
    return;
  }
  const fastifyErr = err as FastifyError;
  // 4. Fastify built-ins (bad JSON, payload too large, rate limit)
  if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
    const code =
      fastifyErr.statusCode === 429 ? 'RATE_LIMITED'
      : fastifyErr.statusCode === 413 ? 'PAYLOAD_TOO_LARGE'
      : 'BAD_REQUEST';
    reply.code(fastifyErr.statusCode).send({ code, message: fastifyErr.message });
    return;
  }
  // 5. Unknown → 500, log, and record in the evaluation defect log (fire & forget)
  req.log.error({ err, reqId: req.id }, 'unhandled error');
  void import('./db.js')
    .then(({ query }) =>
      query(
        `insert into event_logs (user_id, event, success, props)
         values (null, $1, false, $2)`,
        [
          `http.${req.routeOptions?.url ?? 'unknown'}`,
          JSON.stringify({ path: req.url, message: (err as Error).message, reqId: req.id }),
        ],
      ),
    )
    .catch(() => {});
  reply.code(500).send({ code: 'INTERNAL', message: 'Something went wrong.' });
}
