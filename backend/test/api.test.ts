/**
 * Integration tests for the HTTP API.
 *
 * These run the real Fastify app against an isolated `imari_test` database
 * using Fastify's `inject()`, so every layer is exercised: routing, the
 * zod validation, the auth plugin, the SQL, the database triggers and the
 * error handler.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { ensureTestDatabase, truncateApplicationTables, seedTestContent } from './helpers/test-db.js';

let app: FastifyInstance;
let moduleId: string;

const ADMIN = { email: 'admin@imari.rw', password: 'demo1234' };

async function signIn(email: string, password: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email, password },
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json().accessToken;
}

before(async () => {
  await ensureTestDatabase();
  await truncateApplicationTables();
  ({ moduleId } = await seedTestContent());

  const { buildApp } = await import('../src/app.js');
  app = await buildApp();
  await app.ready();

  // An admin account, created directly so the test does not depend on the
  // invite flow to obtain admin rights.
  const { hashPassword } = await import('../src/security.js');
  const { query } = await import('../src/db.js');
  const hash = await hashPassword(ADMIN.password);
  await query(
    `insert into imari.users (email, password_hash, provider, role, full_name, email_verified_at)
     values ($1, $2, 'password', 'admin', 'Test Admin', now())
     on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin'`,
    [ADMIN.email, hash],
  );
});

after(async () => {
  await app?.close();
  const { closePool } = await import('../src/db.js');
  await closePool();
});

// ------------------------------------------------------------------- basics

describe('service endpoints', () => {
  test('GET /health reports that the service is up', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().status, 'ok');
  });

  test('GET /ready reports that the database is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().status, 'ready');
  });

  test('an unknown route answers 404 with the API error shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/does-not-exist' });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().code, 'NOT_FOUND');
  });

  test('an invalid payload answers 422 with field-level details', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'not-an-email', password: 123 },
    });
    assert.equal(res.statusCode, 422);
    const body = res.json();
    assert.equal(body.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(body.details));
    assert.ok(body.details.some((d: any) => d.path === 'email'));
  });
});

// --------------------------------------------------------------------- auth

describe('authentication', () => {
  test('registering with a valid invite creates an account and a session', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        name: 'Test Student',
        email: 'student@test.rw',
        password: 'demo1234',
        inviteCode: 'TEST-CODE',
      },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json();
    assert.equal(body.user.email, 'student@test.rw');
    assert.equal(body.user.role, 'student');
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
  });

  test('registering with an unknown invite is refused', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        name: 'Test Student',
        email: 'other@test.rw',
        password: 'demo1234',
        inviteCode: 'NOPE-NOPE',
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().code, 'INVITE_INVALID');
  });

  test('registering with an exhausted invite is refused', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        name: 'Test Student',
        email: 'used@test.rw',
        password: 'demo1234',
        inviteCode: 'USED-CODE',
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().code, 'INVITE_USED');
  });

  test('registering with an expired invite is refused', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        name: 'Test Student',
        email: 'expired@test.rw',
        password: 'demo1234',
        inviteCode: 'EXPIRED-CODE',
      },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().code, 'INVITE_EXPIRED');
  });

  test('a short password is refused by validation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { name: 'Test Student', email: 'short@test.rw', password: 'abc', inviteCode: 'TEST-CODE' },
    });
    assert.equal(res.statusCode, 422);
  });

  test('a protected route rejects an anonymous request', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/modules' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().code, 'UNAUTHORIZED');
  });

  test('a forged token is rejected', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/modules',
      headers: { authorization: 'Bearer not.a.jwt' },
    });
    assert.equal(res.statusCode, 401);
  });

  test('a refresh token can be rotated', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'student@test.rw', password: 'demo1234' },
    });
    assert.equal(login.statusCode, 200, login.body);
    const first = login.json().refreshToken;

    const rotated = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: first },
    });
    assert.equal(rotated.statusCode, 200);
    assert.notEqual(rotated.json().refreshToken, first);

    // The old token must not work twice.
    const replay = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: { refreshToken: first },
    });
    assert.equal(replay.statusCode, 401);
    assert.equal(replay.json().code, 'REFRESH_REUSED');
  });
});

// ------------------------------------------------------------------ modules

describe('modules and progress', () => {
  test('a student sees published modules with their progress', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({ method: 'GET', url: '/v1/modules', headers: { authorization: `Bearer ${token}` } });
    assert.equal(res.statusCode, 200);
    const modules = res.json();
    assert.equal(modules.length, 1);
    assert.equal(modules[0].slug, 'test-module');
    assert.equal(modules[0].progress.status, 'not_started');
  });

  test('the student view of a module hides the answer key', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/modules/test-module',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.quiz.length, 2);
    assert.ok(body.quiz.every((q: any) => q.answer === undefined && q.answer_index === undefined));
  });

  test('the admin view of a module includes the answer key', async () => {
    const token = await signIn(ADMIN.email, ADMIN.password);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/modules/test-module',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(body.quiz.every((q: any) => typeof q.answer === 'number'));
  });

  test('completing a lesson, the activity and a passing quiz marks the module complete', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const h = { authorization: `Bearer ${token}` };

    await app.inject({ method: 'POST', url: '/v1/modules/test-module/lessons/0/complete', headers: h });
    await app.inject({ method: 'POST', url: '/v1/modules/test-module/lessons/1/complete', headers: h });
    const activity = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/activity',
      headers: h,
      payload: { response: 'I owe 20,000 RWF at 18%.' },
    });
    assert.equal(activity.statusCode, 200);

    const quiz = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/quiz',
      headers: h,
      payload: { answers: [1, 1] },
    });
    assert.equal(quiz.statusCode, 200);
    assert.equal(quiz.json().score, 100);
    assert.equal(quiz.json().passed, true);

    const res = await app.inject({ method: 'GET', url: '/v1/modules/test-module', headers: h });
    assert.equal(res.json().progress.status, 'completed');
  });

  test('a wrong quiz submission is scored, not rejected', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/quiz',
      headers: { authorization: `Bearer ${token}` },
      payload: { answers: [0, 0] },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().score, 0);
    assert.equal(res.json().passed, false);
  });

  test('a module that does not exist answers 404', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/modules/no-such-module',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().code, 'MODULE_NOT_FOUND');
  });
});

// ----------------------------------------------------------------- assessment

describe('assessment and recommendations', () => {
  test('the diagnostic lists the active items without their answers', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/assessment/diagnostic',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.questions.length, 5);
    assert.ok(body.questions.every((q: any) => q.answer_index === undefined));
  });

  test('submitting an attempt is scored server-side and produces recommendations', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const { query } = await import('../src/db.js');
    const { rows } = await query<{ id: string }>(
      `select id from imari.questions where module_id is null and active order by position, id`,
    );
    const answers = Object.fromEntries(rows.map((r) => [r.id, 0]));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/assessment/attempts',
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: 'pre', answers },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();
    assert.equal(body.total, 100);
    assert.equal(body.threshold, 60);
    assert.equal(body.domainScores.length, 5);
    // Every domain scored 100%, so nothing is below the threshold.
    assert.equal(body.recommendations.length, 0);
    assert.equal(typeof body.recommendationMs, 'number');
  });

  test('a weak domain produces a recommendation', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const { query } = await import('../src/db.js');
    const { rows } = await query<{ id: string }>(
      `select id from imari.questions where module_id is null and active order by position, id`,
    );
    // Answer every domain wrongly except the one our module belongs to.
    const answers = Object.fromEntries(rows.map((r) => [r.id, 1]));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/assessment/attempts',
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: 'post', answers },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();
    assert.equal(body.total, 0);
    assert.ok(body.recommendations.length >= 1);
    assert.equal(body.recommendations[0].moduleSlug, 'test-module');
    assert.equal(body.recommendations[0].priority, 1);
    assert.match(body.recommendations[0].reason, /below the 60% threshold/);
  });

  test('an answer for a question outside the diagnostic is rejected', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/assessment/attempts',
      headers: { authorization: `Bearer ${token}` },
      payload: { kind: 'pre', answers: { '00000000-0000-0000-0000-000000000000': 0 } },
    });
    assert.equal(res.statusCode, 422);
    assert.equal(res.json().code, 'UNKNOWN_QUESTION');
  });
});

// ---------------------------------------------------------------- credentials

describe('credential issuance and verification', () => {
  /** Register a throwaway learner and return its access token. */
  async function freshLearner(email: string): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { name: 'Throwaway Learner', email, password: 'demo1234', inviteCode: 'TEST-CODE' },
    });
    assert.equal(res.statusCode, 201, res.body);
    return res.json().accessToken;
  }

  test('a credential cannot be issued before the criteria are met', async () => {
    const token = await freshLearner('noprogress@test.rw');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/credential',
      headers: { authorization: `Bearer ${token}` },
      payload: { learnerName: 'Throwaway Learner' },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().code, 'COMPETENCY_NOT_MET');
  });

  test('a credential can be issued once the criteria are met', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/credential',
      headers: { authorization: `Bearer ${token}` },
      payload: { learnerName: 'Test Student' },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json();
    assert.match(body.id, /^IMR-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.match(body.hash, /^0x[0-9a-f]{64}$/);
    // The chain is not configured in the test environment, so the row stays
    // pending until the retry sweeper anchors it.
    assert.ok(['pending', 'valid'].includes(body.status));
  });

  test('a credential cannot be issued twice for the same module', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/credential',
      headers: { authorization: `Bearer ${token}` },
      payload: { learnerName: 'Test Student' },
    });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().code, 'CREDENTIAL_EXISTS');
  });

  test('verifying an unknown credential answers not_found', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/verify/IMR-ZZZZ-ZZZZ' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().outcome, 'not_found');
  });

  test('a valid credential verifies, and a wrong hash is a mismatch', async () => {
    const { query } = await import('../src/db.js');
    // The test environment has no chain, so the issued row is still pending.
    // Mark it anchored so the public verification path can be exercised.
    await query(`update imari.credentials set status = 'valid' where status = 'pending'`);
    const { rows } = await query<{ id: string; hash: string }>(
      `select id, hash from imari.credentials where status = 'valid' limit 1`,
    );
    const credential = rows[0]!;

    const ok = await app.inject({ method: 'GET', url: `/v1/verify/${credential.id}` });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.json().outcome, 'valid');

    const wrong = await app.inject({
      method: 'GET',
      url: `/v1/verify/${credential.id}?hash=0x${'a'.repeat(64)}`,
    });
    assert.equal(wrong.statusCode, 200);
    assert.equal(wrong.json().outcome, 'mismatch');
  });

  test('every verification is logged for the evaluation metrics', async () => {
    const { query } = await import('../src/db.js');
    const { rows } = await query<{ n: number }>(
      `select count(*)::int as n from imari.credential_verifications`,
    );
    assert.ok(rows[0]!.n > 0);
  });
});

// ------------------------------------------------------------- access control

describe('role based access control', () => {
  test('a student cannot read the admin credential register', async () => {
    const token = await signIn('student@test.rw', 'demo1234');
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/credentials',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().code, 'FORBIDDEN');
  });

  test('an admin can read the evaluation metrics', async () => {
    const token = await signIn(ADMIN.email, ADMIN.password);
    const res = await app.inject({
      method: 'GET',
      url: '/v1/admin/metrics',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok('recommendationAccuracy' in body);
    assert.ok('credentialHealth' in body);
  });
});
