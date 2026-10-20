/**
 * AuthService — registration, login, session rotation and password reset.
 *
 * The class owns every rule that the HTTP layer must not re-implement:
 *   invite redemption (delegated to the DB trigger),
 *   scrypt password verification,
 *   opaque refresh tokens stored only as sha256 hashes,
 *   refresh-token rotation with stolen-token detection,
 *   6-digit reset codes limited to 5 attempts.
 *
 * All I/O goes through injected dependencies so the service can be unit
 * tested without a database, an HTTP server or a real clock.
 */
import { createHash } from 'node:crypto';
import type { AccessClaims } from '../security.js';
import { config } from '../config.js';
import { AppError, badRequest, conflict, notFound, unauthorized } from '../errors.js';

// ---------------------------------------------------------------- contracts

export interface QueryResultLike<T> {
  rows: T[];
}

export interface Queryable {
  <T>(text: string, params?: readonly unknown[]): Promise<QueryResultLike<T>>;
}

export interface TxClient {
  query<T>(text: string, params?: readonly unknown[]): Promise<QueryResultLike<T>>;
}

export interface Transactional {
  <T>(fn: (client: TxClient) => Promise<T>): Promise<T>;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  provider: 'password' | 'google';
  role: 'student' | 'admin' | 'verifier';
  full_name: string;
  email_verified_at: Date | null;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult extends SessionTokens {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'admin' | 'verifier';
    provider: 'password' | 'google';
    emailVerified: boolean;
  };
}

export interface InviteView {
  code: string;
  valid: boolean;
  email: string | null;
  note: string | null;
  uses: number;
  maxUses: number | null;
  expiresAt: string;
}

export interface AuthDeps {
  query: Queryable;
  withTx: Transactional;
  hashPassword: (password: string) => Promise<string>;
  verifyPassword: (password: string, stored: string) => Promise<boolean>;
  newRefreshToken: () => { token: string; hash: string };
  signAccessToken: (claims: AccessClaims) => Promise<string>;
  newResetCode: () => { code: string; hash: string };
  verifyResetCode: (code: string, hash: string) => boolean;
  hashIp: (ip: string) => string;
  now: () => Date;
}

// ------------------------------------------------------------------ service

const ACCESS_TTL_SECONDS = (() => {
  const raw = config.JWT_ACCESS_TTL;
  const m = /^(\d+)([smh])?$/.exec(raw);
  if (!m) return 900;
  const n = Number(m[1]);
  return m[2] === 'h' ? n * 3600 : m[2] === 'm' ? n * 60 : n;
})();

const REFRESH_TTL_MS = config.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const RESET_CODE_TTL_MINUTES = 15;
const MAX_RESET_ATTEMPTS = 5;

export class AuthService {
  private readonly deps: AuthDeps;

  constructor(deps: AuthDeps) {
    this.deps = deps;
  }

  // ------------------------------------------------------------- invitations

  /**
   * Validate an invite code before registration. Mirrors the rules enforced
   * by the redeem_invite() trigger so the UI can fail fast with the same
   * stable error codes.
   */
  async checkInvite(code: string, email?: string): Promise<InviteView> {
    const normalised = code.trim().toUpperCase();
    const { rows } = await this.deps.query<{
      code: string;
      email: string | null;
      note: string | null;
      uses: number;
      max_uses: number | null;
      expires_at: Date;
      revoked_at: Date | null;
    }>(
      `select code, email, note, uses, max_uses, expires_at, revoked_at
         from invites where upper(code) = $1`,
      [normalised],
    );
    const invite = rows[0];
    if (!invite) throw conflict('INVITE_INVALID', 'That invite code does not exist.');

    const now = this.deps.now();
    if (invite.revoked_at) throw conflict('INVITE_REVOKED', 'This invite code was revoked.');
    if (invite.expires_at < now) throw conflict('INVITE_EXPIRED', 'This invite code has expired.');
    if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
      throw conflict('INVITE_USED', 'This invite code has already been used.');
    }
    if (email && invite.email && invite.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw conflict('INVITE_EMAIL_MISMATCH', 'This invite was issued for a different email address.');
    }

    return {
      code: invite.code,
      valid: true,
      email: invite.email,
      note: invite.note,
      uses: invite.uses,
      maxUses: invite.max_uses,
      expiresAt: invite.expires_at.toISOString(),
    };
  }

  // -------------------------------------------------------------- registration

  /**
   * Create an account. The user row and the invite redemption are written in
   * one transaction: the redeem_invite() trigger validates the code and
   * increments its use counter, and a rejected code rolls the user back.
   */
  async register(input: {
    name: string;
    email: string;
    password: string;
    inviteCode: string;
    university?: string;
    consent?: boolean;
    userAgent?: string;
    ip?: string;
  }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const code = input.inviteCode.trim().toUpperCase();

    // Fail fast with the friendly message before touching the database.
    await this.checkInvite(code, email);

    const passwordHash = await this.deps.hashPassword(input.password);

    const created = await this.deps.withTx(async (client) => {
      const existing = await client.query<{ id: string }>(
        `select id from users where email = $1`,
        [email],
      );
      if (existing.rows[0]) throw conflict('EMAIL_TAKEN', 'This email already has an account.');

      const { rows } = await client.query<{ id: string }>(
        `insert into users (email, password_hash, provider, role, full_name, email_verified_at)
         values ($1, $2, 'password', 'student', $3, now())
         returning id`,
        [email, passwordHash, name],
      );
      const userId = rows[0]!.id;

      const invite = await client.query<{ id: string }>(
        `select id from invites where upper(code) = $1`,
        [code],
      );
      if (!invite.rows[0]) throw conflict('INVITE_INVALID', 'That invite code does not exist.');

      // The trigger validates the invite and increments `uses`.
      await client.query(
        `insert into invite_redemptions (invite_id, user_id) values ($1, $2)`,
        [invite.rows[0]!.id, userId],
      );

      if (input.university) {
        await client.query(
          `update student_profiles sp
              set institution_id = (select id from institutions where lower(name) = lower($2) limit 1)
            where sp.user_id = $1`,
          [userId, input.university],
        );
      }

      if (input.consent) {
        await client.query(
          `update student_profiles
              set research_consent = true,
                  consent_version = $2,
                  consent_given_at = now()
            where user_id = $1`,
          [userId, '2026-09'],
        );
      }

      return { id: userId, email, name, role: 'student' as const, provider: 'password' as const };
    });

    const tokens = await this.createSession(created.id, input.userAgent, input.ip);
    return {
      ...tokens,
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
        provider: created.provider,
        emailVerified: true,
      },
    };
  }

  // -------------------------------------------------------------------- login

  async login(input: {
    email: string;
    password: string;
    userAgent?: string;
    ip?: string;
  }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    const { rows } = await this.deps.query<UserRow>(
      `select id, email, password_hash, provider, role, full_name, email_verified_at
         from users where email = $1 and deleted_at is null`,
      [email],
    );
    const user = rows[0];

    // Always run a verification so a missing account and a wrong password
    // take comparable time (no user enumeration by timing).
    const stored = user?.password_hash ?? DUMMY_HASH;
    const ok = await this.deps.verifyPassword(input.password, stored);

    if (!user || !ok) throw unauthorized('INVALID_CREDENTIALS', 'Email or password is incorrect.');
    if (user.provider === 'google') {
      throw conflict('GOOGLE_ACCOUNT', 'This account signs in with Google.');
    }

    await this.deps.query(`update users set last_login_at = now() where id = $1`, [user.id]);

    const tokens = await this.createSession(user.id, input.userAgent, input.ip);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        provider: user.provider,
        emailVerified: Boolean(user.email_verified_at),
      },
    };
  }

  // ----------------------------------------------------------------- sessions

  /**
   * Rotate a refresh token. The presented token is revoked and replaced.
   * If the token is unknown but matches a revoked row, every session for that
   * user is revoked (stolen-token reuse detection).
   */
  async refresh(refreshToken: string, userAgent?: string, ip?: string): Promise<SessionTokens> {
    const hash = sha256(refreshToken);
    const now = this.deps.now();

    const { rows } = await this.deps.query<{
      id: string;
      user_id: string;
      revoked_at: Date | null;
      revoked_reason: string | null;
      expires_at: Date;
    }>(
      `select id, user_id, revoked_at, revoked_reason, expires_at
         from auth_sessions where refresh_token_hash = $1`,
      [hash],
    );
    const session = rows[0];

    if (!session) throw unauthorized('INVALID_REFRESH', 'Your session is no longer valid.');
    if (session.revoked_at) {
      // Only a *rotated* token presented twice is theft. A token revoked by an
      // explicit logout or a password change is simply finished — treating it
      // as reuse would sign the user out of every other device.
      if (session.revoked_reason === 'rotated') {
        await this.revokeAllForUser(session.user_id, 'reuse_detected');
        throw unauthorized('REFRESH_REUSED', 'Your session was revoked for security reasons.');
      }
      throw unauthorized('SESSION_ENDED', 'Your session has ended. Please sign in again.');
    }
    if (session.expires_at < now) {
      throw unauthorized('REFRESH_EXPIRED', 'Your session has expired.');
    }

    await this.deps.query(
      `update auth_sessions set revoked_at = now(), revoked_reason = 'rotated', last_used_at = now()
         where id = $1`,
      [session.id],
    );

    const tokens = await this.createSession(session.user_id, userAgent, ip);
    return tokens;
  }

  /** Revoke a single session (logout). */
  async logout(refreshToken: string): Promise<void> {
    const hash = sha256(refreshToken);
    await this.deps.query(
      `update auth_sessions set revoked_at = now(), revoked_reason = 'logout'
         where refresh_token_hash = $1 and revoked_at is null`,
      [hash],
    );
  }

  /** Revoke every active session for a user (password change, reuse detection). */
  async revokeAllForUser(userId: string, reason = 'logout'): Promise<void> {
    await this.deps.query(
      `update auth_sessions set revoked_at = now(), revoked_reason = $2
         where user_id = $1 and revoked_at is null`,
      [userId, reason],
    );
  }

  private async createSession(
    userId: string,
    userAgent?: string,
    ip?: string,
  ): Promise<SessionTokens> {
    const { token, hash } = this.deps.newRefreshToken();
    const expiresAt = new Date(this.deps.now().getTime() + REFRESH_TTL_MS);
    await this.deps.query(
      `insert into auth_sessions (user_id, refresh_token_hash, user_agent, ip_hash, expires_at)
       values ($1, $2, $3, $4, $5)`,
      [userId, hash, userAgent ?? null, ip ? this.deps.hashIp(ip) : null, expiresAt],
    );
    const { rows } = await this.deps.query<UserRow>(
      `select id, email, password_hash, provider, role, full_name, email_verified_at
         from users where id = $1`,
      [userId],
    );
    const user = rows[0]!;
    const accessToken = await this.deps.signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.full_name,
    });
    return { accessToken, refreshToken: token, expiresIn: ACCESS_TTL_SECONDS };
  }

  // ---------------------------------------------------------- password reset

  /**
   * Start the reset flow. The response is identical whether or not the email
   * exists, so the endpoint cannot be used to enumerate accounts.
   * The code is returned only outside production, where there is no mail
   * transport wired up yet.
   */
  async requestPasswordReset(email: string): Promise<{ code?: string }> {
    const { rows } = await this.deps.query<{ id: string }>(
      `select id from users where email = $1 and deleted_at is null`,
      [email.trim().toLowerCase()],
    );
    const user = rows[0];
    if (!user) return {};

    const { code, hash } = this.deps.newResetCode();
    await this.deps.query(
      `insert into password_reset_codes (user_id, code_hash, expires_at)
       values ($1, $2, now() + ($3 || ' minutes')::interval)`,
      [user.id, hash, String(RESET_CODE_TTL_MINUTES)],
    );
    // A real deployment would e-mail the code here.
    return config.NODE_ENV === 'production' ? {} : { code };
  }

  /** Complete the reset flow: verify the code, set the new password, revoke sessions. */
  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const { rows: userRows } = await this.deps.query<{ id: string }>(
      `select id from users where email = $1 and deleted_at is null`,
      [email.trim().toLowerCase()],
    );
    const user = userRows[0];
    if (!user) throw notFound('USER_NOT_FOUND', 'No account for that email address.');

    const { rows: codeRows } = await this.deps.query<{ id: string; code_hash: string; attempts: number }>(
      `select id, code_hash, attempts
         from password_reset_codes
        where user_id = $1 and used_at is null and expires_at > now()
        order by created_at desc
        limit 1`,
      [user.id],
    );
    const record = codeRows[0];
    if (!record) throw badRequest('RESET_CODE_INVALID', 'That reset code is invalid or has expired.');

    if (record.attempts >= MAX_RESET_ATTEMPTS) {
      throw badRequest('RESET_CODE_LOCKED', 'Too many attempts. Request a new reset code.');
    }

    // Count the attempt before verifying so a brute-forcer is throttled even
    // when the guess is wrong.
    await this.deps.query(
      `update password_reset_codes set attempts = attempts + 1 where id = $1`,
      [record.id],
    );

    if (!this.deps.verifyResetCode(code, record.code_hash)) {
      throw badRequest('RESET_CODE_INVALID', 'That reset code is invalid or has expired.');
    }

    const passwordHash = await this.deps.hashPassword(newPassword);
    await this.deps.withTx(async (client) => {
      await client.query(`update users set password_hash = $2 where id = $1`, [user.id, passwordHash]);
      await client.query(`update password_reset_codes set used_at = now() where id = $1`, [record.id]);
    });
    // A password change invalidates every existing session.
    await this.revokeAllForUser(user.id, 'password_changed');
  }

  // ------------------------------------------------------------------- google

  /**
   * Sign in with a Google ID token. The token is verified against Google's
   * JWKS (audience = GOOGLE_CLIENT_ID). New accounts still require an invite.
   */
  async loginWithGoogle(input: {
    idToken: string;
    inviteCode?: string;
    university?: string;
    userAgent?: string;
    ip?: string;
  }): Promise<AuthResult> {
    if (!config.GOOGLE_CLIENT_ID) {
      throw conflict('GOOGLE_DISABLED', 'Google sign-in is not enabled on this deployment.');
    }
    const profile = await verifyGoogleIdToken(input.idToken, config.GOOGLE_CLIENT_ID);
    const email = profile.email.toLowerCase();

    const { rows } = await this.deps.query<UserRow>(
      `select id, email, password_hash, provider, role, full_name, email_verified_at
         from users where email = $1 and deleted_at is null`,
      [email],
    );
    let user = rows[0];

    if (!user) {
      const inviteCode = input.inviteCode?.trim().toUpperCase();
      if (!inviteCode) {
        throw conflict('NEEDS_INVITE', 'Join with an invite code to create a Google account.');
      }
      await this.checkInvite(inviteCode, email);
      const created = await this.deps.withTx(async (client) => {
        const { rows: createdRows } = await client.query<{ id: string }>(
          `insert into users (email, password_hash, provider, role, full_name, email_verified_at)
           values ($1, null, 'google', 'student', $2, now())
           returning id`,
          [email, profile.name],
        );
        const userId = createdRows[0]!.id;
        const invite = await client.query<{ id: string }>(
          `select id from invites where upper(code) = $1`,
          [inviteCode],
        );
        await client.query(
          `insert into invite_redemptions (invite_id, user_id) values ($1, $2)`,
          [invite.rows[0]!.id, userId],
        );
        return { id: userId };
      });
      user = {
        id: created.id,
        email,
        password_hash: null,
        provider: 'google',
        role: 'student',
        full_name: profile.name,
        email_verified_at: new Date(),
      };
    }

    await this.deps.query(`update users set last_login_at = now() where id = $1`, [user.id]);
    const tokens = await this.createSession(user.id, input.userAgent, input.ip);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        provider: user.provider,
        emailVerified: Boolean(user.email_verified_at),
      },
    };
  }
}

// ------------------------------------------------------------------ helpers

/** sha256 hex — kept local so the service has no hidden module state. */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * A valid scrypt hash of a random string. Verifying against it keeps the
 * "unknown email" path as expensive as the "wrong password" path.
 */
const DUMMY_HASH =
  'scrypt$16384$8$1$2f8a1b6c9d0e3f4a5b6c7d8e9f0a1b2c$' +
  'a'.repeat(128);

/** Verify a Google ID token against Google's published JWKS. */
async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<{ email: string; name: string }> {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });
  const email = String(payload.email ?? '');
  if (!email) throw unauthorized('GOOGLE_TOKEN_INVALID', 'That Google account has no email address.');
  if (payload.email_verified === false) {
    throw unauthorized('GOOGLE_TOKEN_INVALID', 'That Google account email is not verified.');
  }
  return { email, name: String(payload.name ?? email.split('@')[0] ?? 'Learner') };
}

export { AppError };
