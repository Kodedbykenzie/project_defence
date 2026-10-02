import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query } from '../db.js';
import { contentHash } from '../lib/credential.js';
import { hashIp } from '../security.js';

const VerifyParams = z.object({ credentialId: z.string().min(4).max(40) });
const VerifyQuery = z.object({ hash: z.string().max(80).optional() });

type Outcome = 'valid' | 'revoked' | 'mismatch' | 'not_found';

/**
 * Public credential verification (openapi.yaml § /verify/{credentialId}).
 * Reads the DB, recomputes the canonical keccak256 hash, optionally compares
 * a presented hash, and logs every check to credential_verifications (Table 7).
 */
export async function credentialRoutes(app: FastifyInstance): Promise<void> {
  app.get('/verify/:credentialId', async (req) => {
    const started = process.hrtime.bigint();
    const { credentialId } = VerifyParams.parse(req.params);
    const { hash: presented } = VerifyQuery.parse(req.query);
    const presentedNorm = presented?.trim().toLowerCase();

    const row = await one<{
      id: string;
      user_id: string;
      module_id: string;
      competency: string;
      holder_name: string;
      hash: string;
      tx_hash: string | null;
      block_number: number | null;
      status: 'pending' | 'valid' | 'revoked';
      issued_at: Date;
    }>(
      `select id, user_id, module_id, competency, holder_name, hash, tx_hash, block_number, status, issued_at
         from credentials where upper(id) = upper($1)`,
      [credentialId.trim()],
    );

    let outcome: Outcome = 'not_found';
    let credential: Record<string, unknown> | undefined;

    if (!row) {
      outcome = 'not_found';
    } else if (row.status === 'pending') {
      // Not anchored yet → behaves like "unknown" to the public.
      outcome = 'not_found';
    } else {
      const recomputed = contentHash({
        id: row.id,
        learnerId: row.user_id,
        moduleId: row.module_id,
        competency: row.competency,
        issuedAt: row.issued_at.toISOString(),
      });
      const hashOk = recomputed.toLowerCase() === row.hash.toLowerCase();
      const presentedOk = !presentedNorm || presentedNorm === row.hash.toLowerCase();

      outcome = !hashOk || !presentedOk ? 'mismatch' : row.status === 'revoked' ? 'revoked' : 'valid';

      credential = {
        id: row.id,
        competency: row.competency,
        holderName: row.holder_name,
        hash: row.hash,
        txHash: row.tx_hash,
        block: row.block_number,
        status: row.status,
        issuedAt: row.issued_at.toISOString(),
      };
    }

    const latencyMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
    // Fire-and-forget; the public page must not wait on analytics.
    void query(
      `insert into credential_verifications
         (credential_id, presented_id, presented_hash, result, latency_ms, ip_hash)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        row?.id ?? null,
        credentialId.trim(),
        presentedNorm ?? null,
        outcome,
        latencyMs,
        hashIp(req.ip),
      ],
    ).catch(() => {});

    return { outcome, credential, latencyMs };
  });

  // GET /verify — search by holder name or partial id (landing page lookup)
  app.get('/verify', async (req) => {
    const { q } = z.object({ q: z.string().min(2).max(80).optional() }).parse(req.query);
    if (!q) return { results: [] };
    const { rows } = await query<{
      id: string;
      competency: string;
      holder_name: string;
      status: string;
      issued_at: Date;
    }>(
      `select id, competency, holder_name, status, issued_at
         from credentials
        where status <> 'pending' and (id ilike $1 or holder_name ilike $1)
        order by issued_at desc limit 10`,
      [`%${q}%`],
    );
    return {
      results: rows.map((r) => ({
        id: r.id,
        competency: r.competency,
        holderName: r.holder_name,
        status: r.status,
        issuedAt: r.issued_at.toISOString(),
      })),
    };
  });
}
