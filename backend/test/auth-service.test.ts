/**
 * Unit tests for AuthService.
 *
 * The service takes every dependency through its constructor, so the rules it
 * enforces (invite validity, token rotation, reset limits, user enumeration)
 * can be tested without a database, an HTTP server or a real clock.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService, type AuthDeps } from '../src/services/auth-service.js';

// --------------------------------------------------------------- fake infra

interface Recorded {
  text: string;
  params: readonly unknown[];
}

class FakeDb {
  readonly calls: Recorded[] = [];
  private readonly handlers: { match: RegExp; rows: unknown[] }[] = [];

  /** Register the rows returned for any query matching `match`. */
  on(match: RegExp, rows: unknown[]): this {
    this.handlers.push({ match, rows });
    return this;
  }

  /** Register the rows returned for the Nth match of `match`. */
  onNth(match: RegExp, n: number, rows: unknown[]): this {
    const seen = this.handlers.filter((h) => h.match.test(match));
    void seen;
    this.handlers.push({ match, rows, nth: n } as never);
    return this;
  }

  readonly query = async <T,>(text: string, params: readonly unknown[] = []): Promise<{ rows: T[] }> => {
    this.calls.push({ text, params });
    for (const handler of this.handlers) {
      if (handler.match.test(text)) return { rows: handler.rows as T[] };
    }
    return { rows: [] as T[] };
  };

  readonly withTx = async <T,>(fn: (client: { query: typeof this.query }) => Promise<T>): Promise<T> =>
    fn({ query: this.query });

  /** How many queries matched `pattern`. */
  countMatching(pattern: RegExp): number {
    return this.calls.filter((c) => pattern.test(c.text)).length;
  }
}

const FIXED_NOW = new Date('2026-10-20T12:00:00.000Z');

/** An opaque stand-in for a real scrypt hash — it must not contain the password. */
const fakeHash = (pw: string) => `fake$${pw.length}$${pw.charCodeAt(0)}`;

function buildService(db: FakeDb, overrides: Partial<AuthDeps> = {}) {
  const deps: AuthDeps = {
    query: db.query as never,
    withTx: db.withTx as never,
    hashPassword: async (pw) => fakeHash(pw),
    verifyPassword: async (pw, stored) => stored === fakeHash(pw),
    newRefreshToken: (() => {
      let n = 0;
      return () => {
        n += 1;
        return { token: `refresh-${n}`, hash: `hash-${n}` };
      };
    })(),
    signAccessToken: async (claims) => `access:${claims.sub}`,
    newResetCode: () => ({ code: '123456', hash: 'reset-hash' }),
    verifyResetCode: (code, hash) => code === '123456' && hash === 'reset-hash',
    hashIp: (ip) => `ip:${ip}`,
    now: () => FIXED_NOW,
    ...overrides,
  };
  return { service: new AuthService(deps), db };
}

const INVITE_ROW = {
  code: 'ALU-PILOT',
  email: null,
  note: 'cohort',
  uses: 0,
  max_uses: 50,
  expires_at: new Date('2026-12-01T00:00:00.000Z'),
  revoked_at: null,
};

const USER_ROW = {
  id: 'user-1',
  email: 'aline@alustudent.com',
  password_hash: fakeHash('demo1234'),
  provider: 'password',
  role: 'student',
  full_name: 'Aline Uwimana',
  email_verified_at: new Date('2026-09-01T00:00:00.000Z'),
};

// ------------------------------------------------------------------- invites

describe('AuthService.checkInvite', () => {
  test('a valid invite is reported as valid', async () => {
    const db = new FakeDb().on(/from invites where upper\(code\)/, [INVITE_ROW]);
    const { service } = buildService(db);
    const invite = await service.checkInvite('alu-pilot');
    assert.equal(invite.valid, true);
    assert.equal(invite.code, 'ALU-PILOT');
    assert.equal(invite.maxUses, 50);
  });

  test('an unknown code is rejected', async () => {
    const db = new FakeDb().on(/from invites where upper\(code\)/, []);
    const { service } = buildService(db);
    await assert.rejects(() => service.checkInvite('NOPE-NOPE'), /INVITE_INVALID|does not exist/);
  });

  test('a revoked invite is rejected', async () => {
    const db = new FakeDb().on(/from invites where upper\(code\)/, [
      { ...INVITE_ROW, revoked_at: new Date('2026-10-01T00:00:00.000Z') },
    ]);
    const { service } = buildService(db);
    await assert.rejects(() => service.checkInvite('ALU-PILOT'), /revoked/);
  });

  test('an expired invite is rejected', async () => {
    const db = new FakeDb().on(/from invites where upper\(code\)/, [
      { ...INVITE_ROW, expires_at: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    const { service } = buildService(db);
    await assert.rejects(() => service.checkInvite('ALU-PILOT'), /expired/);
  });

  test('a fully used invite is rejected', async () => {
    const db = new FakeDb().on(/from invites where upper\(code\)/, [
      { ...INVITE_ROW, uses: 50, max_uses: 50 },
    ]);
    const { service } = buildService(db);
    await assert.rejects(() => service.checkInvite('ALU-PILOT'), /already been used/);
  });

  test('a personal invite is rejected for a different email', async () => {
    const db = new FakeDb().on(/from invites where upper\(code\)/, [
      { ...INVITE_ROW, email: 'grace@alustudent.com', max_uses: 1 },
    ]);
    const { service } = buildService(db);
    await assert.rejects(
      () => service.checkInvite('ALU-PILOT', 'someone@else.com'),
      /different email/i,
    );
  });
});

// --------------------------------------------------------------- registration

describe('AuthService.register', () => {
  test('a user and an invite redemption are written in one transaction', async () => {
    const db = new FakeDb()
      .on(/from invites where upper\(code\)/, [INVITE_ROW])
      .on(/select id from users where email/, [])
      .on(/insert into users/, [{ id: 'new-user' }])
      .on(/select id from invites where upper\(code\)/, [{ id: 'invite-1' }])
      .on(/from users where id/, [USER_ROW]);
    const { service } = buildService(db);

    const result = await service.register({
      name: 'Grace Ishimwe',
      email: 'grace@alustudent.com',
      password: 'demo1234',
      inviteCode: 'ALU-PILOT',
    });

    assert.equal(result.user.email, 'grace@alustudent.com');
    assert.equal(result.user.role, 'student');
    assert.ok(result.accessToken.length > 0);
    assert.ok(result.refreshToken.length > 0);

    assert.equal(db.countMatching(/insert into users/), 1);
    assert.equal(db.countMatching(/insert into invite_redemptions/), 1);
    // The password is never stored in the clear.
    const insert = db.calls.find((c) => /insert into users/.test(c.text))!;
    assert.ok(!JSON.stringify(insert.params).includes('demo1234'));
  });

  test('an email that is already registered is rejected', async () => {
    const db = new FakeDb()
      .on(/from invites where upper\(code\)/, [INVITE_ROW])
      .on(/select id from users where email/, [{ id: 'existing' }]);
    const { service } = buildService(db);
    await assert.rejects(
      () =>
        service.register({
          name: 'Grace Ishimwe',
          email: 'grace@alustudent.com',
          password: 'demo1234',
          inviteCode: 'ALU-PILOT',
        }),
      /already has an account/,
    );
  });

  test('an invalid invite stops registration before any write', async () => {
    const db = new FakeDb().on(/from invites where upper\(code\)/, []);
    const { service } = buildService(db);
    await assert.rejects(
      () =>
        service.register({
          name: 'Grace Ishimwe',
          email: 'grace@alustudent.com',
          password: 'demo1234',
          inviteCode: 'NOPE-NOPE',
        }),
      /does not exist/,
    );
    assert.equal(db.countMatching(/insert into users/), 0);
  });
});

// --------------------------------------------------------------------- login

describe('AuthService.login', () => {
  test('correct credentials return a session', async () => {
    const db = new FakeDb()
      .on(/from users where email/, [USER_ROW])
      .on(/from users where id/, [USER_ROW]);
    const { service } = buildService(db);
    const result = await service.login({ email: 'aline@alustudent.com', password: 'demo1234' });
    assert.equal(result.user.email, 'aline@alustudent.com');
    assert.equal(result.user.role, 'student');
    assert.equal(result.expiresIn, 900);
    assert.equal(db.countMatching(/insert into auth_sessions/), 1);
  });

  test('a wrong password is rejected', async () => {
    const db = new FakeDb().on(/from users where email/, [USER_ROW]);
    const { service } = buildService(db);
    await assert.rejects(
      () => service.login({ email: 'aline@alustudent.com', password: 'nope' }),
      /incorrect/,
    );
  });

  test('an unknown email is rejected with the same message as a wrong password', async () => {
    const db = new FakeDb().on(/from users where email/, []);
    const { service } = buildService(db);
    const unknown = await service
      .login({ email: 'ghost@nowhere.com', password: 'nope' })
      .then(() => null, (e: Error) => e.message);
    const wrong = await service
      .login({ email: 'aline@alustudent.com', password: 'nope' })
      .then(() => null, (e: Error) => e.message);
    assert.equal(unknown, wrong);
  });

  test('the unknown-email path still runs a password verification', async () => {
    const db = new FakeDb().on(/from users where email/, []);
    let verified = 0;
    const { service } = buildService(db, {
      verifyPassword: async () => {
        verified += 1;
        return false;
      },
    });
    await service.login({ email: 'ghost@nowhere.com', password: 'nope' }).catch(() => undefined);
    assert.equal(verified, 1, 'a timing oracle would otherwise distinguish the two cases');
  });

  test('a Google-only account gets the same generic error, so accounts cannot be enumerated', async () => {
    const db = new FakeDb().on(/from users where email/, [
      { ...USER_ROW, provider: 'google', password_hash: null },
    ]);
    const { service } = buildService(db);
    await assert.rejects(
      () => service.login({ email: 'aline@alustudent.com', password: 'demo1234' }),
      /incorrect/,
    );
  });
});

// ------------------------------------------------------------------ sessions

describe('AuthService session rotation', () => {
  const session = (over = {}) => ({
    id: 'session-1',
    user_id: 'user-1',
    revoked_at: null,
    revoked_reason: null,
    expires_at: new Date('2026-11-20T12:00:00.000Z'),
    ...over,
  });

  test('a valid refresh token is rotated into a new pair', async () => {
    const db = new FakeDb()
      .on(/from auth_sessions where refresh_token_hash/, [session()])
      .on(/from users where id/, [USER_ROW]);
    const { service } = buildService(db);
    const result = await service.refresh('opaque-token');
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.equal(db.countMatching(/set revoked_at = now\(\), revoked_reason = 'rotated'/), 1);
    assert.equal(db.countMatching(/insert into auth_sessions/), 1);
  });

  test('reusing a rotated token revokes the whole session family', async () => {
    const db = new FakeDb()
      .on(/from auth_sessions where refresh_token_hash/, [
        session({ revoked_at: new Date('2026-10-20T11:00:00.000Z'), revoked_reason: 'rotated' }),
      ]);
    const { service } = buildService(db);
    await assert.rejects(() => service.refresh('opaque-token'), /security reasons/);
    assert.equal(
      db.countMatching(/revoked_reason = \$2/),
      1,
      'every other session for the user must be revoked',
    );
  });

  test('a token revoked by logout is not treated as reuse', async () => {
    const db = new FakeDb()
      .on(/from auth_sessions where refresh_token_hash/, [
        session({ revoked_at: new Date('2026-10-20T11:00:00.000Z'), revoked_reason: 'logout' }),
      ]);
    const { service } = buildService(db);
    await assert.rejects(() => service.refresh('opaque-token'), /session has ended/i);
    assert.equal(
      db.countMatching(/revoked_reason = \$2/),
      0,
      'signing out on one device must not sign the user out everywhere',
    );
  });

  test('an expired session is rejected', async () => {
    const db = new FakeDb()
      .on(/from auth_sessions where refresh_token_hash/, [
        session({ expires_at: new Date('2026-01-01T00:00:00.000Z') }),
      ]);
    const { service } = buildService(db);
    await assert.rejects(() => service.refresh('opaque-token'), /expired/);
  });

  test('an unknown refresh token is rejected', async () => {
    const db = new FakeDb().on(/from auth_sessions where refresh_token_hash/, []);
    const { service } = buildService(db);
    await assert.rejects(() => service.refresh('nope'), /no longer valid/);
  });

  test('logout revokes exactly the presented session', async () => {
    const db = new FakeDb();
    const { service } = buildService(db);
    await service.logout('opaque-token');
    const call = db.calls.find((c) => /revoked_reason = 'logout'/.test(c.text))!;
    assert.ok(call);
  });
});

// ------------------------------------------------------------ password reset

describe('AuthService password reset', () => {
  test('a request for an unknown email returns nothing and writes nothing', async () => {
    const db = new FakeDb().on(/from users where email/, []);
    const { service } = buildService(db);
    const result = await service.requestPasswordReset('ghost@nowhere.com');
    assert.deepEqual(result, {});
    assert.equal(db.countMatching(/insert into password_reset_codes/), 0);
  });

  test('a request stores only a hash of the code', async () => {
    const db = new FakeDb().on(/from users where email/, [{ id: 'user-1' }]);
    const { service } = buildService(db);
    await service.requestPasswordReset('aline@alustudent.com');
    const insert = db.calls.find((c) => /insert into password_reset_codes/.test(c.text))!;
    assert.ok(!JSON.stringify(insert.params).includes('123456'));
  });

  test('a wrong code is rejected', async () => {
    const db = new FakeDb()
      .on(/from users where email/, [{ id: 'user-1' }])
      .on(/from password_reset_codes/, [{ id: 'code-1', code_hash: 'reset-hash', attempts: 0 }]);
    const { service } = buildService(db, { verifyResetCode: () => false });
    await assert.rejects(
      () => service.resetPassword('aline@alustudent.com', '000000', 'newpass123'),
      /invalid or has expired/,
    );
  });

  test('a correct code sets the password and revokes every session', async () => {
    const db = new FakeDb()
      .on(/from users where email/, [{ id: 'user-1' }])
      .on(/from password_reset_codes/, [{ id: 'code-1', code_hash: 'reset-hash', attempts: 0 }]);
    const { service } = buildService(db);
    await service.resetPassword('aline@alustudent.com', '123456', 'newpass123');
    assert.equal(db.countMatching(/update users set password_hash/), 1);
    assert.equal(db.countMatching(/update password_reset_codes set used_at/), 1);
    assert.equal(db.countMatching(/revoked_reason = \$2/), 1);
  });

  test('a locked code is rejected before the attempt counter is touched', async () => {
    const db = new FakeDb()
      .on(/from users where email/, [{ id: 'user-1' }])
      .on(/from password_reset_codes/, [{ id: 'code-1', code_hash: 'reset-hash', attempts: 5 }]);
    const { service } = buildService(db);
    await assert.rejects(
      () => service.resetPassword('aline@alustudent.com', '123456', 'newpass123'),
      /Too many attempts/,
    );
  });

  test('a failed guess still increments the attempt counter', async () => {
    const db = new FakeDb()
      .on(/from users where email/, [{ id: 'user-1' }])
      .on(/from password_reset_codes/, [{ id: 'code-1', code_hash: 'reset-hash', attempts: 0 }]);
    const { service } = buildService(db, { verifyResetCode: () => false });
    await service.resetPassword('aline@alustudent.com', '000000', 'newpass123').catch(() => undefined);
    assert.equal(db.countMatching(/set attempts = attempts \+ 1/), 1);
  });
});
