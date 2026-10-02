import { randomBytes, randomInt, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { SignJWT, jwtVerify } from 'jose';
import { config } from './config.js';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// scrypt — memory-hard password KDF, no native dependencies.
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algo, n, r, p, saltHex, hashHex] = stored.split('$');
    if (algo !== 'scrypt' || !n || !r || !p || !saltHex || !hashHex) return false;
    const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'), Buffer.from(hashHex, 'hex').length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
    return timingSafeEqual(key, Buffer.from(hashHex, 'hex'));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- JWT (HS256)

const secret = new TextEncoder().encode(config.JWT_SECRET);

export interface AccessClaims {
  sub: string;      // user id
  role: 'student' | 'admin' | 'verifier';
  email: string;
  name: string;
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ role: claims.role, email: claims.email, name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setIssuer('imari')
    .setAudience('imari-api')
    .setExpirationTime(config.JWT_ACCESS_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret, { issuer: 'imari', audience: 'imari-api' });
  if (!payload.sub || typeof payload.role !== 'string') throw new Error('bad claims');
  return {
    sub: payload.sub,
    role: payload.role as AccessClaims['role'],
    email: String(payload.email ?? ''),
    name: String(payload.name ?? ''),
  };
}

// ------------------------------------------------- Opaque refresh tokens + reset codes

/** 256-bit opaque refresh token; only its sha256 is stored server-side. */
export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: sha256(token) };
}

export const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

/** 6-digit code, hashed with the pepper — plaintext never leaves this function. */
export function newResetCode(): { code: string; hash: string } {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return { code, hash: sha256(`${code}${config.RESET_CODE_PEPPER}`) };
}

export const verifyResetCode = (code: string, hash: string): boolean =>
  timingSafeEqual(Buffer.from(sha256(`${code}${config.RESET_CODE_PEPPER}`)), Buffer.from(hash));

export const hashIp = (ip: string): string => sha256(`${ip}${config.RESET_CODE_PEPPER}`);
