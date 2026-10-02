/**
 * Applies database/migrations/*.sql in order, tracked in schema_migrations.
 * Creates the auth.uid() stub first when running outside Supabase (0004 needs it).
 *
 *   npm run db:migrate
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', '..', 'database', 'migrations');

/** Plain-Postgres stand-in for Supabase's auth.uid() — 0004 policies call it. */
const AUTH_STUB = `
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
`;

async function main(): Promise<void> {
  const client = new pg.Client({ connectionString: config.DATABASE_URL });
  await client.connect();
  try {
    await client.query('create extension if not exists pgcrypto');
    await client.query('create extension if not exists citext');
    await client.query('create extension if not exists pg_trgm');
    await client.query(AUTH_STUB);
    await client.query(`
      create table if not exists schema_migrations (
        filename text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const done = await client.query(`select 1 from schema_migrations where filename = $1`, [file]);
      if (done.rowCount) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(migrationsDir, file), 'utf8');
      try {
        await client.query('begin');
        await client.query(sql);
        await client.query(`insert into schema_migrations (filename) values ($1)`, [file]);
        await client.query('commit');
        console.log(`  ✓ ${file}`);
      } catch (err) {
        await client.query('rollback');
        throw new Error(`${file} failed: ${(err as Error).message}`);
      }
    }
    console.log('Migrations complete.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
