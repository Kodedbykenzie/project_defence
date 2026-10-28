/**
 * Contract tests for the endpoints added on top of the original API:
 * `GET /v1/me` (the signed-in profile) and the per-question feedback returned
 * by `POST /v1/modules/:slug/quiz`.
 *
 * Same conventions as `api.test.ts`: the real Fastify app is injected against
 * the isolated `imari_test` database, so routing, auth, zod, SQL and the
 * database triggers are all exercised.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { FastifyInstance } from 'fastify';
import { ensureTestDatabase, truncateApplicationTables, seedTestContent } from './helpers/test-db.js';

let app: FastifyInstance;
let moduleId: string;
let studentToken: string;

const STUDENT = {
  name: 'Contract Student',
  email: 'contract.student@test.rw',
  password: 'demo1234',
};

const ADMIN = {
  name: 'Contract Admin',
  email: 'contract.admin@test.rw',
  password: 'demo1234',
};

const auth = () => ({ authorization: `Bearer ${studentToken}` });

before(async () => {
  await ensureTestDatabase();
  await truncateApplicationTables();
  ({ moduleId } = await seedTestContent());

  const { buildApp } = await import('../src/app.js');
  app = await buildApp();
  await app.ready();

  // A learner with an invite, so the profile and preference rows exist.
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    payload: {
      name: STUDENT.name,
      email: STUDENT.email,
      password: STUDENT.password,
      inviteCode: 'TEST-CODE',
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  studentToken = res.json().accessToken;

  // An admin has no student_profiles row (the trigger only creates one for
  // students), so the profile must degrade to nulls.
  const { hashPassword } = await import('../src/security.js');
  const { query } = await import('../src/db.js');
  await query(
    `insert into imari.users (email, password_hash, provider, role, full_name, email_verified_at)
     values ($1, $2, 'password', 'admin', $3, now())
     on conflict (email) do update set password_hash = excluded.password_hash, role = 'admin'`,
    [ADMIN.email, await hashPassword(ADMIN.password), ADMIN.name],
  );
});

after(async () => {
  await app?.close();
  const { closePool } = await import('../src/db.js');
  await closePool();
});

// ------------------------------------------------------------------ GET /me

describe('GET /v1/me', () => {
  test('the profile route requires a token', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().code, 'UNAUTHORIZED');
  });

  test('a forged token is rejected', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer not.a.jwt' },
    });
    assert.equal(res.statusCode, 401);
  });

  test('it returns the user, their preferences and their profile', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: auth() });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();

    assert.match(body.user.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    assert.equal(body.user.email, STUDENT.email);
    assert.equal(body.user.name, STUDENT.name);
    assert.equal(body.user.role, 'student');
    assert.equal(body.user.provider, 'password');
    assert.equal(body.user.emailVerified, true);

    assert.equal(body.preferences.language, 'en');
    assert.equal(body.preferences.textSize, 'md');
    assert.equal(body.preferences.reduceMotion, false);
    assert.equal(body.preferences.railOpen, true);
    assert.deepEqual(body.preferences.interests, []);
    assert.equal(body.preferences.goal, null);
    assert.equal(body.preferences.weeklyTime, null);
    assert.equal(body.preferences.learningStyle, null);
    assert.equal(body.preferences.toastsEnabled, true);
    assert.deepEqual(body.preferences.mutedKinds, []);
    assert.equal(body.preferences.emailDigest, 'weekly');

    assert.equal(body.profile.university, null);
    assert.equal(body.profile.programme, null);
    assert.equal(body.profile.researchConsent, false);
    assert.equal(body.profile.consentVersion, null);
    assert.equal(body.profile.onboardedAt, null);
  });

  test('it reflects the preferences that were saved', async () => {
    const saved = await app.inject({
      method: 'PUT',
      url: '/v1/me/preferences',
      headers: auth(),
      payload: { language: 'rw', textSize: 'lg', learningStyle: 'visual', toasts: false },
    });
    assert.equal(saved.statusCode, 200, saved.body);

    const res = await app.inject({ method: 'GET', url: '/v1/me', headers: auth() });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.preferences.language, 'rw');
    assert.equal(body.preferences.textSize, 'lg');
    assert.equal(body.preferences.learningStyle, 'visual');
    assert.equal(body.preferences.toastsEnabled, false);
  });

  test('an account without a student profile gets an empty profile', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: ADMIN.email, password: ADMIN.password },
    });
    assert.equal(login.statusCode, 200, login.body);
    const token = login.json().accessToken;

    const res = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();

    assert.equal(body.user.role, 'admin');
    assert.equal(body.user.provider, 'password');
    assert.equal(body.user.emailVerified, true);

    // The preferences row is created by the DB trigger for every account.
    assert.equal(body.preferences.language, 'en');
    assert.equal(body.preferences.toastsEnabled, true);
    assert.deepEqual(body.preferences.mutedKinds, []);

    // No student_profiles row → every profile value is null / false.
    assert.equal(body.profile.university, null);
    assert.equal(body.profile.programme, null);
    assert.equal(body.profile.researchConsent, false);
    assert.equal(body.profile.consentVersion, null);
    assert.equal(body.profile.onboardedAt, null);
  });
});

// ------------------------------------------------------------ quiz feedback

describe('per-question quiz feedback', () => {
  /** The graded questions, in the order the server sees them. */
  async function gradedQuestions() {
    const { query } = await import('../src/db.js');
    const { rows } = await query<{ id: string; answer_index: number }>(
      `select id, answer_index from imari.questions
        where module_id = $1 and active order by position, id`,
      [moduleId],
    );
    return rows;
  }

  test('the response reports one result per question, in order', async () => {
    const questions = await gradedQuestions();
    assert.equal(questions.length, 2);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/quiz',
      headers: auth(),
      payload: { answers: [questions[0]!.answer_index, questions[1]!.answer_index] },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();

    // The existing fields are untouched.
    assert.equal(body.score, 100);
    assert.equal(body.passed, true);
    assert.equal(body.correct, 2);
    assert.equal(body.total, 2);
    assert.equal(body.passingScore, 67);

    assert.equal(body.results.length, questions.length);
    assert.deepEqual(
      body.results.map((r: { questionId: string }) => r.questionId),
      questions.map((q) => q.id),
    );
    body.results.forEach((r: any, i: number) => {
      assert.equal(r.correct, true);
      assert.equal(r.selected, questions[i]!.answer_index);
      assert.equal(r.answer, questions[i]!.answer_index);
      assert.equal(typeof r.explanation, 'string');
    });
  });

  test('the results line up with the quiz the client displayed', async () => {
    const questions = await gradedQuestions();
    const module_ = await app.inject({
      method: 'GET',
      url: '/v1/modules/test-module',
      headers: auth(),
    });
    assert.equal(module_.statusCode, 200);
    const displayed = module_.json().quiz.map((q: { id: string }) => q.id);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/quiz',
      headers: auth(),
      payload: { answers: [questions[0]!.answer_index, questions[1]!.answer_index] },
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(
      res.json().results.map((r: { questionId: string }) => r.questionId),
      displayed,
    );
  });

  test('a wrong answer is reported with the right answer index', async () => {
    const questions = await gradedQuestions();
    const wrong = questions.map((q) => (q.answer_index + 1) % 4);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/quiz',
      headers: auth(),
      payload: { answers: wrong },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();

    assert.equal(body.score, 0);
    assert.equal(body.passed, false);
    assert.equal(body.correct, 0);
    assert.equal(body.results.length, questions.length);
    body.results.forEach((r: any, i: number) => {
      assert.equal(r.correct, false);
      assert.equal(r.selected, wrong[i]);
      assert.equal(r.answer, questions[i]!.answer_index);
    });
  });

  test('a question that was not answered reports a null selection', async () => {
    const questions = await gradedQuestions();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/modules/test-module/quiz',
      headers: auth(),
      payload: { answers: [questions[0]!.answer_index] },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();

    assert.equal(body.results.length, 2);
    assert.equal(body.results[0].selected, questions[0]!.answer_index);
    assert.equal(body.results[0].correct, true);
    assert.equal(body.results[1].selected, null);
    assert.equal(body.results[1].correct, false);
    assert.equal(body.results[1].answer, questions[1]!.answer_index);
  });

  test('the student view of a module still hides the answer key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/modules/test-module',
      headers: auth(),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.quiz.length, 2);
    assert.ok(
      body.quiz.every(
        (q: any) => q.answer === undefined && q.answer_index === undefined && q.explanation === undefined,
      ),
    );
  });
});
