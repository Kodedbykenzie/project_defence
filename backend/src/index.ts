import { buildApp } from './app.js';
import { config, chainMode } from './config.js';
import { closePool, query } from './db.js';

async function main(): Promise<void> {
  const app = await buildApp();

  // Fail fast if the database is unreachable / schema missing.
  try {
    const res = await query<{ n: number }>(
      `select count(*)::int as n from information_schema.tables where table_schema = 'imari'`,
    );
    const tables = res.rows[0]?.n ?? 0;
    if (tables < 20) {
      app.log.error({ tables }, 'imari schema missing — run `npm run db:migrate` first');
      process.exit(1);
    }
  } catch (err) {
    app.log.error({ err }, 'cannot reach PostgreSQL — check DATABASE_URL');
    process.exit(1);
  }

  await app.listen({ port: config.PORT, host: config.HOST });
  app.log.info({ chainMode }, 'credential anchoring mode');

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    await closePool();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
