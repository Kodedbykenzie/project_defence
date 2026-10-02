import { keccak256, toUtf8Bytes } from 'ethers';

/**
 * Canonical credential payload & hashes — must match every verifier
 * (see blockchain/README.md § Canonical payload & hashes).
 *   payload     = `${id}|${learnerId}|${moduleId}|${competency}|${issuedAt}`
 *   contentHash = keccak256(utf8(payload))
 *   idHash      = keccak256(utf8(id))
 */
export interface CredentialPayloadParts {
  id: string;
  learnerId: string;
  moduleId: string;
  competency: string;
  /** ISO-8601 UTC with milliseconds — the exact string stored in issued_at. */
  issuedAt: string;
}

export const credentialPayload = (c: CredentialPayloadParts): string =>
  `${c.id}|${c.learnerId}|${c.moduleId}|${c.competency}|${c.issuedAt}`;

export const keccak256Hex = (utf8: string): string => keccak256(toUtf8Bytes(utf8));
export const keccak256Hash = keccak256Hex;

export const contentHash = (c: CredentialPayloadParts): string => keccak256Hex(credentialPayload(c));

export const idHash = (id: string): string => keccak256Hex(id);

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const part = () =>
  Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

/** IMR-XXXX-XXXX — matches ^IMR-[A-Z0-9]{4}-[A-Z0-9]{4}$ */
export const newCredentialId = (): string => `IMR-${part()}-${part()}`;

/** Deterministic stand-in tx hash used when no RPC is configured (dev mode). */
export const simulatedTxHash = (id: string): string => keccak256Hex(`sepolia-tx:${id}`);

export const simulatedBlock = (id: string): number =>
  6_800_000 + (parseInt(keccak256Hex(id).slice(2, 8), 16) % 90_000);
