/**
 * Test environment bootstrap.
 *
 * Loaded through `node --import` so the environment is in place *before* any
 * module reads `config.ts` (which validates its environment at import time).
 *
 *   node --import tsx --import ./test/setup-env.ts --test test/*.test.ts
 */
import 'dotenv/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://User@localhost:5432/imari_test';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-only-jwt-secret-0123456789abcdef0123456789';
process.env.RESET_CODE_PEPPER = process.env.RESET_CODE_PEPPER ?? 'test-only-pepper-0123456789';
process.env.APP_ORIGIN = 'http://localhost:5173';
// The chain is exercised by the blockchain suite and the e2e script; the API
// tests must not depend on a running node.
process.env.SEPOLIA_RPC_URL = '';
process.env.ISSUER_PRIVATE_KEY = '';
process.env.CREDENTIAL_CONTRACT_ADDRESS = '';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
