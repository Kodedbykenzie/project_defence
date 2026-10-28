import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  // Every session resolves bare table names into the imari schema. Set at
  // connection time via the libpq `options` parameter rather than a query on
  // the `connect` event: a query there races with the first caller's query on
  // the same client (pg warns "client is already executing a query").
  options: '-c search_path=imari,public',
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error:', err.message);
});

export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}

export async function one<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const res = await query<T>(text, params);
  return res.rows[0] ?? null;
}

/**
 * Run `fn` inside a transaction. If the callback throws, the transaction is
 * rolled back and the original error (including SQLSTATE P0001 business
 * errors raised by triggers) is rethrown for the error mapper.
 */
export async function withTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    try {
      await client.query('rollback');
    } catch {
      /* connection already broken; original error wins */
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Stamp the acting user onto the session so audit_log rows written by the
 * audit_row() trigger record who did it (mirrors Supabase's JWT claim).
 * Must be called inside a transaction (local setting, three-arg set_config).
 */
export async function setActor(client: pg.PoolClient, userId: string | null): Promise<void> {
  await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
}

/** Same, but on the shared pool outside an explicit transaction. */
export async function setActorGlobal(userId: string | null): Promise<void> {
  await query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
