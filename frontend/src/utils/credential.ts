import { keccak256, toUtf8Bytes } from 'ethers';
import type { Credential, SeedCredential, VerificationOutcome } from '../types/platform';

/** 256-bit fingerprint used in offline prototype mode for simulated tx hashes. */
function offlineFingerprint(input: string) {
  return keccak256(toUtf8Bytes(`imari-offline:${input}`)).slice(2);
}

export function credentialPayload(c: Pick<SeedCredential, 'id' | 'learnerId' | 'moduleId' | 'competency' | 'issuedAt'>) {
  return `${c.id}|${c.learnerId}|${c.moduleId}|${c.competency}|${c.issuedAt}`;
}

/** Canonical on-chain content hash — identical formula to backend src/chain.ts */
export const credentialHash = (c: Pick<SeedCredential, 'id' | 'learnerId' | 'moduleId' | 'competency' | 'issuedAt'>) =>
  keccak256(toUtf8Bytes(credentialPayload(c)));

/** Offline-mode placeholders — real values come from the backend / chain receipt. */
export const txHashFor = (id: string) => `0x${offlineFingerprint(`sepolia-tx:${id}`)}`;

export const blockFor = (id: string) => 6_800_000 + (parseInt(offlineFingerprint(id).slice(0, 6), 16) % 90_000);

export function newCredentialId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `IMR-${part()}-${part()}`;
}

export function hydrateCredential(c: SeedCredential): Credential {
  return { ...c, hash: credentialHash(c), txHash: txHashFor(c.id), block: blockFor(c.id) };
}

export function verifyCredential(credentials: Credential[], id: string, presentedHash?: string) {
  const credential = credentials.find((c) => c.id.toUpperCase() === id.trim().toUpperCase());
  if (!credential) return { outcome: 'not_found' as VerificationOutcome, credential: undefined };
  const recomputed = credentialHash(credential);
  const presented = presentedHash?.trim().toLowerCase();
  if (recomputed !== credential.hash || presented && presented !== credential.hash.toLowerCase()) {
    return { outcome: 'mismatch' as VerificationOutcome, credential };
  }
  if (credential.status === 'revoked') return { outcome: 'revoked' as VerificationOutcome, credential };
  return { outcome: 'valid' as VerificationOutcome, credential };
}

export const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

export const etherscanTx = (tx: string) => `https://sepolia.etherscan.io/tx/${tx}`;