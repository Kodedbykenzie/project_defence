import { Contract, JsonRpcProvider } from 'ethers';
import { API_CONFIGURED, API_URL, CHAIN_CONFIGURED, RPC_URL, CONTRACT_ADDRESS } from '../config/chain';
import artifact from '../contracts/ImariCredentialRegistry.json';
import type { Credential, VerificationOutcome } from '../types/platform';

export interface ChainVerification {
  outcome: VerificationOutcome;
  credential?: Credential;
  /** 'api' = asked our backend · 'chain' = read the contract directly · 'local' = prototype data */
  source: 'api' | 'chain' | 'local';
}

/** Verify a credential using the strongest source configured: backend API → direct contract read → local prototype state. */
export async function verifyCredentialLive(
  credentials: Credential[],
  id: string,
  presentedHash?: string,
): Promise<ChainVerification> {
  if (API_CONFIGURED) {
    try {
      const res = await fetch(`${API_URL}/v1/verify/${encodeURIComponent(id.trim())}${presentedHash ? `?hash=${presentedHash}` : ''}`);
      const json = await res.json();
      const c = json.credential;
      return {
        outcome: json.outcome,
        source: 'api',
        credential: c
          ? {
              id: c.id,
              learnerId: c.user_id ?? '',
              learnerName: c.holderName,
              moduleId: c.module_id ?? '',
              competency: c.competency,
              issuedAt: c.issuedAt,
              status: c.status === 'pending' ? 'valid' : c.status,
              verifications: 0,
              hash: c.hash,
              txHash: c.txHash ?? '',
              block: typeof c.block === 'number' ? c.block : Number(c.block ?? 0),
            }
          : undefined,
      };
    } catch {
      // API unreachable — fall through to local state so the demo page never breaks.
    }
  }

  if (CHAIN_CONFIGURED) {
    try {
      const provider = new JsonRpcProvider(RPC_URL);
      const registry = new Contract(CONTRACT_ADDRESS!, artifact.abi, provider);
      const { keccak256, toUtf8Bytes } = await import('ethers');
      const idHash = keccak256(toUtf8Bytes(id.trim().toUpperCase()));
      const [status, matches] = await registry.verify(idHash, presentedHash ?? '0x' + '00'.repeat(32));
      const local = credentials.find((c) => c.id.toUpperCase() === id.trim().toUpperCase());
      const num = Number(status);
      if (num === 0) return { outcome: 'not_found', source: 'chain' };
      if (num === 2) return { outcome: 'revoked', source: 'chain', credential: local };
      if (presentedHash && !matches) return { outcome: 'mismatch', source: 'chain', credential: local };
      return { outcome: 'valid', source: 'chain', credential: local };
    } catch {
      // fall through to local
    }
  }

  // Offline prototype fallback — keep the old local behaviour.
  const { verifyCredential } = await import('./credential');
  const r = verifyCredential(credentials, id, presentedHash);
  return { outcome: r.outcome, credential: r.credential, source: 'local' };
}
