import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  APP_ORIGIN: z.string().default('http://localhost:5173'),
  RESET_CODE_PEPPER: z.string().min(8),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  SEPOLIA_RPC_URL: z.string().optional().default(''),
  ISSUER_PRIVATE_KEY: z.string().optional().default(''),
  CREDENTIAL_CONTRACT_ADDRESS: z.string().optional().default(''),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

/** Real chain anchoring only when all three pieces are configured. */
export const chainMode: 'sepolia' | 'simulate' =
  config.SEPOLIA_RPC_URL && config.ISSUER_PRIVATE_KEY && config.CREDENTIAL_CONTRACT_ADDRESS
    ? 'sepolia'
    : 'simulate';

export const isProd = config.NODE_ENV === 'production';
