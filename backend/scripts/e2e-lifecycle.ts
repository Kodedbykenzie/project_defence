/**
 * End-to-end credential lifecycle check.
 *
 * Drives the running stack through the whole blockchain story:
 *   register → complete a module → issue → verify → tamper → revoke →
 *   verify → reinstate → verify
 *
 * Every verification step reports which source answered (`chain` or `db`),
 * so the script proves that the registry — not just the database — is the
 * authority on a credential's validity.
 *
 *   node --import tsx scripts/e2e-lifecycle.ts [baseUrl]
 */
import { query } from '../src/db.js';

const BASE = (process.argv[2] ?? 'http://127.0.0.1:4000/v1').replace(/\/$/, '');

const GREEN = '[32m';
const RED = '[31m';
const DIM = '[2m';
const BOLD = '[1m';
const OFF = '[0m';

let failures = 0;

function check(label: string, ok: boolean, detail = '') {
  const mark = ok ? `${GREEN}✔${OFF}` : `${RED}✘${OFF}`;
  console.log(`  ${mark} ${label}${detail ? ` ${DIM}${detail}${OFF}` : ''}`);
  if (!ok) failures += 1;
}

async function api(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<{ status: number; body: any }> {
  const { token, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((rest.headers as Record<string, string>) ?? {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const stamp = Date.now();
const studentEmail = `e2e.${stamp}@alustudent.com`;

async function main() {
  console.log(`\n${BOLD}Imari — credential lifecycle end-to-end${OFF} ${DIM}${BASE}${OFF}\n`);

  // ---------------------------------------------------------------- 1. auth
  console.log(`${BOLD}1. Authentication${OFF}`);
  const reg = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Learner',
      email: studentEmail,
      password: 'demo1234',
      inviteCode: 'ALU-PILOT',
      university: 'African Leadership University',
      consent: true,
    }),
  });
  check('register with an invite code', reg.status === 201, `HTTP ${reg.status}`);
  if (reg.status !== 201) {
    console.log(`    ${RED}${JSON.stringify(reg.body)}${OFF}`);
    process.exit(1);
  }
  const token: string = reg.body.accessToken;
  check('an access token is returned', typeof token === 'string' && token.length > 20);
  check('the refresh token is opaque', /^[A-Za-z0-9_-]{40,}$/.test(reg.body.refreshToken));

  const dup = await api('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Learner',
      email: studentEmail,
      password: 'demo1234',
      inviteCode: 'ALU-PILOT',
    }),
  });
  check('registering the same email again is rejected', dup.status === 409, `HTTP ${dup.status}`);

  const badLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: studentEmail, password: 'wrong-password' }),
  });
  check('a wrong password is rejected', badLogin.status === 401, `HTTP ${badLogin.status}`);

  // ------------------------------------------------------------- 2. modules
  console.log(`\n${BOLD}2. Learning & eligibility${OFF}`);
  const modules = await api('/modules', { token });
  check('the module catalogue loads', modules.status === 200 && modules.body.length > 0, `${modules.body?.length} modules`);

  const target = modules.body.find((m: any) => m.slug === 'borrowing-wisely') ?? modules.body[0];

  const early = await api(`/modules/${target.slug}/credential`, {
    method: 'POST',
    token,
    body: JSON.stringify({ learnerId: reg.body.user.id, learnerName: 'E2E Learner' }),
  });
  check(
    'issuing before the criteria are met is blocked',
    early.status === 409,
    `HTTP ${early.status} ${early.body?.code ?? ''}`,
  );

  // Fetch the module detail first: the student view hides the answer key, so
  // the harness reads the correct answers straight from the database — a test
  // is allowed to cheat where a learner may not.
  const detail = await api(`/modules/${target.slug}`, { token });
  const quiz = detail.body.quiz ?? [];
  const { rows: answerRows } = await query<{ answer_index: number }>(
    `select answer_index from questions where module_id = $1 and active order by position, id`,
    [target.id],
  );
  const answers = answerRows.map((r) => r.answer_index);
  check('the student API hides the answer key', quiz.every((q: any) => q.answer === undefined));

  // Complete every lesson, the activity and a passing quiz.
  const lessonTotal = (detail.body.lessons ?? []).length || 3;
  for (let i = 0; i < lessonTotal; i += 1) {
    const r = await api(`/modules/${target.slug}/lessons/${i}/complete`, { method: 'POST', token });
    check(`lesson ${i + 1}/${lessonTotal} marked complete`, r.status === 200, `HTTP ${r.status}`);
  }
  await api(`/modules/${target.slug}/activity`, {
    method: 'POST',
    token,
    body: JSON.stringify({ response: 'Track every borrowing RWF and its cost before taking more credit.' }),
  });
  const quizRes = await api(`/modules/${target.slug}/quiz`, {
    method: 'POST',
    token,
    body: JSON.stringify({ answers }),
  });
  check(
    'a quiz attempt is scored server-side',
    typeof quizRes.body?.score === 'number',
    `score ${quizRes.body?.score}% pass=${quizRes.body?.passed}`,
  );

  // ------------------------------------------------------------ 3. issuance
  console.log(`\n${BOLD}3. Blockchain issuance${OFF}`);
  const issued = await api(`/modules/${target.slug}/credential`, {
    method: 'POST',
    token,
    body: JSON.stringify({ learnerId: reg.body.user.id, learnerName: 'E2E Learner' }),
  });
  check('a credential is issued once the criteria are met', issued.status === 201, `HTTP ${issued.status}`);
  if (issued.status !== 201) {
    console.log(`    ${RED}${JSON.stringify(issued.body)}${OFF}`);
    process.exit(1);
  }
  const cid: string = issued.body.id;
  const hash: string = issued.body.hash;
  check('the credential has an IMR- id', /^IMR-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cid), cid);
  check('the credential carries a keccak256 content hash', /^0x[0-9a-f]{64}$/.test(hash));
  check('a transaction hash was recorded', typeof issued.body.txHash === 'string' && issued.body.txHash.length === 66);

  // ---------------------------------------------------------- 4. verification
  console.log(`\n${BOLD}4. Verification${OFF}`);
  const v1 = await api(`/verify/${cid}`);
  check('the credential verifies as valid', v1.body?.outcome === 'valid', `outcome=${v1.body?.outcome}`);
  check('the answer came from the chain', v1.body?.source === 'chain', `source=${v1.body?.source}`);
  check('the latency is reported', typeof v1.body?.latencyMs === 'number', `${v1.body?.latencyMs} ms`);

  const v2 = await api(`/verify/${cid}?hash=0x${'a'.repeat(64)}`);
  check('a tampered hash is rejected', v2.body?.outcome === 'mismatch', `outcome=${v2.body?.outcome}`);

  const v3 = await api('/verify/IMR-ZZZZ-ZZZZ');
  check('an unknown credential is not found', v3.body?.outcome === 'not_found', `outcome=${v3.body?.outcome}`);

  // ------------------------------------------------------------ 5. revocation
  console.log(`\n${BOLD}5. Revocation${OFF}`);
  const admin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@imari.rw', password: 'demo1234' }),
  });
  const adminToken: string = admin.body?.accessToken;
  check('the admin can sign in', typeof adminToken === 'string');

  const revoked = await api(`/admin/credentials/${cid}`, {
    method: 'PATCH',
    token: adminToken,
    body: JSON.stringify({ status: 'revoked', reason: 'end-to-end demo' }),
  });
  check('an admin can revoke a credential', revoked.status === 200, `HTTP ${revoked.status}`);

  const v4 = await api(`/verify/${cid}`);
  check('a revoked credential fails verification', v4.body?.outcome === 'revoked', `outcome=${v4.body?.outcome}`);

  const reinstated = await api(`/admin/credentials/${cid}`, {
    method: 'PATCH',
    token: adminToken,
    body: JSON.stringify({ status: 'valid' }),
  });
  check('an admin can reinstate a credential', reinstated.status === 200, `HTTP ${reinstated.status}`);

  const v5 = await api(`/verify/${cid}`);
  check('a reinstated credential verifies again', v5.body?.outcome === 'valid', `outcome=${v5.body?.outcome}`);

  // ------------------------------------------------------- 6. authorisation
  console.log(`\n${BOLD}6. Access control${OFF}`);
  const noAuth = await api('/modules');
  check('an unauthenticated request is rejected', noAuth.status === 401, `HTTP ${noAuth.status}`);

  const studentAsAdmin = await api('/admin/credentials', { token });
  check('a student cannot read the admin credential register', studentAsAdmin.status === 403, `HTTP ${studentAsAdmin.status}`);

  console.log(
    failures === 0
      ? `\n${GREEN}${BOLD}All checks passed.${OFF} Credential ${cid}\n`
      : `\n${RED}${BOLD}${failures} check(s) failed.${OFF} Credential ${cid}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`${RED}script error:${OFF}`, err);
  process.exit(1);
});
