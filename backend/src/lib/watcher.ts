import 'dotenv/config';
import { Contract, JsonRpcProvider } from 'ethers';
import { chainMode } from '../config.js';
import { query } from '../db.js';
import { anchorOnChain } from '../routes/modules.js';
import { idHash } from './credential.js';
import artifact from '../../../blockchain/exports/ImariCredentialRegistry.json' with { type: 'json' };

/**
 * Chain watcher + retry sweeper.
 *
 * Watcher: subscribes to registry events and reconciles DB rows. The primary
 * write path confirms via tx receipts, so events are the safety net for
 * crashes / dropped receipts / manual revocation from another tool.
 *
 * Retry sweeper: re-anchors credentials that are stuck 'pending' because the
 * original anchor attempt failed (RPC hiccup, node restart, …).
 */
export async function startChainWatcher(): Promise<void> {
  if (chainMode !== 'sepolia') {
    console.log('[watcher] simulate mode — no chain events');
    return;
  }
  const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const contract = new Contract(process.env.CREDENTIAL_CONTRACT_ADDRESS!, artifact.abi, provider);

  const handle = async (idHashHex: string, txHash: string, block: number, status: string) => {
    const rows = await query<{ id: string; status: string }>(`select id, status from credentials`);
    for (const r of rows.rows) {
      if (idHashHex === idHash(r.id) && r.status !== status) {
        console.log(`[watcher] ${r.id}: ${r.status} → ${status} (tx ${txHash})`);
        await query(`update credentials set status = $2, tx_hash = coalesce(tx_hash, $3), block_number = coalesce(block_number, $4) where id = $1`, [r.id, status, txHash, block]);
      }
    }
  };

  contract.on('CredentialIssued', (idHashHex: string, _h: string, _issuedAt: bigint, event: any) => {
    void handle(idHashHex, event.log.transactionHash, event.log.blockNumber, 'valid').catch(console.error);
  });
  contract.on('CredentialRevoked', (idHashHex: string, _revokedAt: bigint, event: any) => {
    void handle(idHashHex, event.log.transactionHash, event.log.blockNumber, 'revoked').catch(console.error);
  });
  contract.on('CredentialReinstated', (idHashHex: string, event: any) => {
    void handle(idHashHex, event.log.transactionHash, event.log.blockNumber, 'valid').catch(console.error);
  });
  console.log('[watcher] subscribed to registry events');
}

export function startRetrySweeper(intervalMs = 30_000): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const stuck = await query<{ id: string; hash: string }>(
        `select id, hash from credentials
          where status = 'pending' and tx_hash is null and issued_at < now() - interval '15 seconds'`,
      );
      for (const row of stuck.rows) {
        console.log(`[retry] re-anchoring ${row.id}…`);
        try {
          if (chainMode === 'sepolia') {
            const a = await anchorOnChain(row.id, row.hash);
            await query(`update credentials set tx_hash = $2, block_number = $3, status = 'valid' where id = $1`, [row.id, a.txHash, a.block]);
          } else {
            // Simulate-mode rows already got simulated tx hashes at insert time.
          }
        } catch (err) {
          console.error(`[retry] ${row.id} failed again:`, (err as Error).message);
        }
      }
    } catch (err) {
      console.error('[retry] sweep failed:', (err as Error).message);
    }
  }, intervalMs);
}
