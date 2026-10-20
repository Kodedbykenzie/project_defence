/**
 * Creates and prepares the isolated `imari_test` database.
 *
 * The integration tests must never touch the development database, so they
 * run against a separate one that is migrated and seeded on demand.
 */
import { Client } from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// backend/test/helpers → backend/test → backend → repository root
const repoRoot = join(here, '..', '..', '..');

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://User@localhost:5432/imari_test';

/** Strip the database name off a connection URL. */
function adminUrl(url: string): string {
  const u = new URL(url);
  u.pathname = '/postgres';
  return u.toString();
}

function databaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, '') || 'imari_test';
}

async function databaseExists(name: string): Promise<boolean> {
  const client = new Client({ connectionString: adminUrl(TEST_DATABASE_URL) });
  await client.connect();
  try {
    const { rows } = await client.query('select 1 from pg_database where datname = $1', [name]);
    return rows.length > 0;
  } finally {
    await client.end();
  }
}

let prepared = false;

/** Create, migrate and seed the test database. Safe to call from every file. */
export async function ensureTestDatabase(): Promise<void> {
  if (prepared) return;
  const name = databaseName(TEST_DATABASE_URL);

  if (!(await databaseExists(name))) {
    const admin = new Client({ connectionString: adminUrl(TEST_DATABASE_URL) });
    await admin.connect();
    try {
      await admin.query(`create database "${name}"`);
    } finally {
      await admin.end();
    }
  }

  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query('create extension if not exists pgcrypto');
    await client.query('create extension if not exists citext');
    await client.query('create extension if not exists pg_trgm');
    await client.query(`create schema if not exists auth`);
    await client.query(`
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$
    `);

    // The migrations are not idempotent (`create type` has no IF NOT EXISTS
    // and `create trigger` fails on a duplicate), so they are tracked the
    // same way backend/scripts/migrate.ts tracks them — in `public`, because
    // that script creates the table before any migration sets a search_path.
    await client.query(`
      create table if not exists public.schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const migrationsDir = join(repoRoot, 'database', 'migrations');
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const { rows } = await client.query('select 1 from public.schema_migrations where filename = $1', [file]);
      if (rows.length) continue;
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into public.schema_migrations (filename) values ($1)', [file]);
        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }

    const seedFile = join(repoRoot, 'database', 'seed', '0001_reference_data.sql');
    await client.query(readFileSync(seedFile, 'utf8'));
  } finally {
    await client.end();
  }

  prepared = true;
}

/** Remove rows created by a test run, keeping the reference data intact. */
export async function truncateApplicationTables(): Promise<void> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      truncate table
        imari.credential_verifications, imari.credentials, imari.quiz_attempts,
        imari.module_progress, imari.module_feedback, imari.recommendations,
        imari.attempt_answers, imari.domain_scores, imari.assessment_attempts,
        imari.audit_log, imari.event_logs, imari.notifications,
        imari.notification_reads, imari.invite_redemptions, imari.invites,
        imari.cookie_consents, imari.password_reset_codes, imari.auth_sessions,
        imari.user_preferences, imari.student_profiles, imari.users,
        imari.module_resources, imari.questions, imari.activities, imari.lessons,
        imari.module_objectives, imari.modules
      restart identity cascade
    `);
  } finally {
    await client.end();
  }
}

/**
 * Insert a small, fully-known body of learning content.
 *
 * Tests assert on exact scores, so the content is fixed here rather than
 * taken from the demo seed: one module, two lessons, one activity and two
 * quiz items with known answer indices.
 */
export async function seedTestContent(): Promise<{ moduleId: string }> {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query(`set search_path = imari, public`);
    const { rows } = await client.query<{ id: string }>(
      `insert into modules (slug, domain_id, title, competency, summary, minutes,
                            passing_score, published, is_starter)
       values ('test-module', 'debt', 'Test borrowing module', 'Responsible borrowing',
               'A fixture module used by the integration tests.', 10, 67, true, false)
       returning id`,
    );
    const moduleId = rows[0]!.id;

    await client.query(
      `insert into module_objectives (module_id, position, text) values ($1, 0, 'Understand the cost of credit')`,
      [moduleId],
    );
    await client.query(
      `insert into lessons (module_id, position, title, paragraphs, example)
       values ($1, 0, 'First lesson', ARRAY['Interest is the price of borrowing.'], 'A 10,000 RWF loan at 12% a year costs 1,200 RWF in interest.'),
              ($1, 1, 'Second lesson', ARRAY['Compare the annual percentage rate, not just the monthly instalment.'], NULL)`,
      [moduleId],
    );
    await client.query(
      `insert into activities (module_id, title, prompt) values ($1, 'Budget exercise', 'List every loan you owe and its rate.')`,
      [moduleId],
    );
    await client.query(
      `insert into questions (domain_id, module_id, prompt, options, answer_index, explanation, position)
       values ('debt', $1, 'What does APR include?', '["Interest only","Interest plus fees","Principal only","Taxes only"]', 1, 'The annual percentage rate bundles interest and fees.', 0),
              ('debt', $1, 'A 10,000 RWF loan at 12% a year costs how much in interest?', '["100 RWF","1,200 RWF","12,000 RWF","120 RWF"]', 1, '10,000 x 0.12 = 1,200.', 1)`,
      [moduleId],
    );

    // A diagnostic item per domain so the assessment can be scored.
    for (const [i, domain] of ['budgeting', 'saving', 'debt', 'investing', 'digital'].entries()) {
      await client.query(
        `insert into questions (domain_id, module_id, prompt, options, answer_index, explanation, position)
         values ($1, null, $2, $3, 0, 'For testing.', $4)`,
        [domain, `Diagnostic item for ${domain}`, '["Correct","Wrong"]', i],
      );
    }

    await client.query(
      `insert into invites (code, email, note, max_uses, uses, expires_at)
       values ('TEST-CODE', null, 'integration test', 10, 0, now() + interval '30 days'),
              ('USED-CODE', null, 'exhausted', 1, 1, now() + interval '30 days'),
              ('EXPIRED-CODE', null, 'expired', 10, 0, now() - interval '1 day')`,
    );

    return { moduleId };
  } finally {
    await client.end();
  }
}
