import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query, setActor, withTx } from '../db.js';
import { conflict, notFound } from '../errors.js';
import { requireRole } from '../auth-plugin.js';

// ------------------------------------------------------------------ shapes

const CreateInvite = z.object({
  email: z.string().trim().toLowerCase().email().optional(),
  note: z.string().max(300).optional(),
  maxUses: z.number().int().min(1).max(10_000).nullable().default(null),
  days: z.number().int().min(1).max(365).default(30),
  prefix: z.string().trim().max(10).regex(/^[A-Z0-9]+$/i).default('ALU'),
});

const PatchInvite = z.object({
  action: z.enum(['revoke', 'extend']),
  days: z.number().int().min(1).max(365).optional(),
});

const LessonIn = z.object({
  title: z.string().min(1).max(200),
  paragraphs: z.array(z.string().max(5000)).max(20),
  example: z.string().max(3000).nullable().optional(),
});

const QuestionIn = z.object({
  prompt: z.string().min(1).max(2000),
  options: z.array(z.string().min(1).max(500)).min(2).max(6),
  answer: z.number().int().min(0),
  explanation: z.string().max(2000).optional(),
});

const SaveModule = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
  domain: z.enum(['budgeting', 'saving', 'debt', 'investing', 'digital']),
  title: z.string().trim().min(3).max(120),
  competency: z.string().min(1).max(200),
  summary: z.string().max(1000).optional().default(''),
  minutes: z.number().int().min(1).max(180),
  passingScore: z.number().int().min(1).max(100),
  published: z.boolean().default(false),
  isStarter: z.boolean().default(false),
  objectives: z.array(z.string().min(1).max(300)).max(20),
  lessons: z.array(LessonIn).min(1).max(20),
  activity: z.object({ title: z.string().min(1).max(200), prompt: z.string().min(1).max(4000) }),
  resources: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        source: z.string().max(200).optional(),
        url: z.string().url().regex(/^https?:\/\//),
      }),
    )
    .max(20)
    .default([]),
  quiz: z.array(QuestionIn).min(1).max(50),
});

const Threshold = z.object({ threshold: z.number().int().min(1).max(100) });

const PatchCredential = z.object({
  status: z.enum(['valid', 'revoked']),
  reason: z.string().max(300).optional(),
});

const InviteAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(prefix: string): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += InviteAlphabet[Math.floor(Math.random() * InviteAlphabet.length)];
  return `${prefix.toUpperCase()}-${s}`;
}

// ------------------------------------------------------------------ routes

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireRole('admin'));

  // ---------------------------------------------------------------- invites

  // GET /admin/invites — list with redemption history (InvitesAdmin page)
  app.get('/invites', async () => {
    const { rows } = await query<{
      id: string;
      code: string;
      email: string | null;
      note: string | null;
      max_uses: number | null;
      uses: number;
      expires_at: Date;
      revoked_at: Date | null;
      created_at: Date;
      redeemed_by: { id: string; name: string; at: string }[] | null;
    }>(
      `select i.id, i.code, i.email, i.note, i.max_uses, i.uses, i.expires_at,
              i.revoked_at, i.created_at,
              coalesce((
                select json_agg(json_build_object(
                         'id', u.id, 'name', u.full_name, 'at', ir.redeemed_at
                       ) order by ir.redeemed_at)
                  from invite_redemptions ir join users u on u.id = ir.user_id
                 where ir.invite_id = i.id
              ), '[]') as redeemed_by
         from invites i
        order by i.created_at desc`,
    );
    return rows.map((i) => ({
      id: i.id,
      code: i.code,
      email: i.email,
      note: i.note,
      maxUses: i.max_uses,
      uses: i.uses,
      createdAt: i.created_at.toISOString(),
      expiresAt: i.expires_at.toISOString(),
      revoked: i.revoked_at !== null,
      redeemedBy: i.redeemed_by ?? [],
      status: i.revoked_at
        ? 'revoked'
        : i.max_uses !== null && i.uses >= i.max_uses
          ? 'used'
          : i.expires_at < new Date()
            ? 'expired'
            : 'active',
    }));
  });

  // POST /admin/invites — create (audited by the audit_invites trigger)
  app.post('/invites', async (req, reply) => {
    const input = CreateInvite.parse(req.body);
    const prefix = (input.email?.split('@')[1]?.split('.')[0]?.toUpperCase() ?? input.prefix)
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10) || 'ALU';

    // Personal invites are single-use (DB constraint email → max_uses = 1).
    const maxUses = input.email ? 1 : input.maxUses;

    let code = randomCode(prefix);
    for (let i = 0; i < 5; i++) {
      const clash = await one(`select 1 from invites where code = $1`, [code]);
      if (!clash) break;
      code = randomCode(prefix);
    }

    const row = await withTx(async (client) => {
      await setActor(client, req.user!.sub);
      const { rows } = await client.query<{
        id: string;
        code: string;
        email: string | null;
        note: string | null;
        max_uses: number | null;
        uses: number;
        expires_at: Date;
        revoked_at: Date | null;
        created_at: Date;
      }>(
        `insert into invites (code, email, note, max_uses, expires_at, created_by)
         values ($1, $2, $3, $4, now() + ($5 || ' days')::interval, $6)
         returning id, code, email, note, max_uses, uses, expires_at, revoked_at, created_at`,
        [code, input.email ?? null, input.note ?? null, maxUses, String(input.days), req.user!.sub],
      );
      return rows[0]!;
    });

    // Notify admins that the invite was created (matches frontend seed events).
    await query(
      `insert into notifications (audience, kind, title, body, link)
       values ('admins', 'invite', $1, $2, '/admin/invites')`,
      [`Invite ${row.code} created`, input.email ?? input.note ?? 'Open invite'],
    );

    return reply.code(201).send({
      id: row.id,
      code: row.code,
      email: row.email,
      note: row.note,
      maxUses: row.max_uses,
      uses: row.uses,
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.toISOString(),
      revoked: false,
      redeemedBy: [],
      status: 'active',
    });
  });

  // PATCH /admin/invites/:id — revoke / extend
  app.patch<{ Params: { id: string } }>('/invites/:id', async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const { action, days } = PatchInvite.parse(req.body);

    const row = await withTx(async (client) => {
      await setActor(client, req.user!.sub);
      const { rows } = await client.query<{ id: string; revoked_at: Date | null; expires_at: Date }>(
        action === 'revoke'
          ? `update invites set revoked_at = coalesce(revoked_at, now()) where id = $1
             returning id, revoked_at, expires_at`
          : `update invites set expires_at = greatest(now(), expires_at) + ($2 || ' days')::interval
             where id = $1 returning id, revoked_at, expires_at`,
        action === 'revoke' ? [id] : [id, String(days ?? 30)],
      );
      return rows[0];
    });
    if (!row) throw notFound('INVITE_NOT_FOUND');

    return { id: row.id, revoked: row.revoked_at !== null, expiresAt: row.expires_at.toISOString() };
  });

  // ---------------------------------------------------------------- students

  // GET /admin/students — roster with latest scores (StudentsAdmin page)
  app.get('/students', async () => {
    const { rows } = await query<{
      id: string;
      full_name: string;
      email: string;
      joined_at: Date;
      onboarded_at: Date | null;
      institution: string | null;
      attempts: number;
      last_score: number | null;
      pre_score: number | null;
      post_score: number | null;
      completed_modules: number;
      credentials: number;
    }>(
      `select u.id, u.full_name, u.email, u.created_at as joined_at, sp.onboarded_at,
              i.name as institution,
              count(distinct aa.id) filter (where aa.completed_at is not null) as attempts,
              max(aa.total_score) filter (where aa.completed_at is not null) as last_score,
              min(aa.total_score) filter (where aa.kind = 'pre'  and aa.completed_at is not null) as pre_score,
              max(aa.total_score) filter (where aa.kind = 'post' and aa.completed_at is not null) as post_score,
              count(distinct mp.module_id) filter (where mp.status = 'completed') as completed_modules,
              count(distinct c.id) as credentials
         from users u
         left join student_profiles sp on sp.user_id = u.id
         left join institutions i on i.id = sp.institution_id
         left join assessment_attempts aa on aa.user_id = u.id
         left join module_progress mp on mp.user_id = u.id
         left join credentials c on c.user_id = u.id
        where u.role = 'student' and u.deleted_at is null
        group by u.id, sp.onboarded_at, i.name
        order by u.created_at desc`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.full_name,
      email: r.email,
      institution: r.institution,
      joinedAt: r.joined_at.toISOString(),
      onboarded: r.onboarded_at !== null,
      attempts: r.attempts,
      lastScore: r.last_score,
      preScore: r.pre_score,
      postScore: r.post_score,
      gain: r.pre_score !== null && r.post_score !== null ? r.post_score - r.pre_score : null,
      completedModules: r.completed_modules,
      credentials: r.credentials,
    }));
  });

  // ---------------------------------------------------------------- courses

  // POST /admin/modules — create (slug minted by DB trigger if omitted)
  app.post('/modules', async (req, reply) => {
    const input = SaveModule.parse(req.body);
    const slug = await saveModule(input, req.user!.sub, null);
    return reply.code(201).send({ slug });
  });

  // PUT /admin/modules/:slug — full editor save (transactional replace)
  app.put<{ Params: { slug: string } }>('/modules/:slug', async (req) => {
    const { slug } = z.object({ slug: z.string().min(1).max(120) }).parse(req.params);
    const input = SaveModule.parse(req.body);
    const target = await one<{ id: string }>(
      `select id from modules where slug = $1 or id::text = $1`,
      [slug],
    );
    if (!target) throw notFound('MODULE_NOT_FOUND');
    const newSlug = await saveModule(input, req.user!.sub, target.id);
    return { slug: newSlug };
  });

  // ---------------------------------------------------------------- settings

  // PUT /admin/settings/threshold — recommendation threshold (audited)
  app.put('/settings/threshold', async (req) => {
    const { threshold } = Threshold.parse(req.body);
    await withTx(async (client) => {
      await setActor(client, req.user!.sub);
      await client.query(
        `insert into platform_settings (key, value, updated_by)
         values ('recommendation.threshold', $1, $2)
         on conflict (key) do update set value = $1, updated_by = $2, updated_at = now()`,
        [JSON.stringify(String(threshold)), req.user!.sub],
      );
    });
    return { threshold };
  });

  // GET /admin/settings — all platform settings
  app.get('/settings', async () => {
    const { rows } = await query<{ key: string; value: unknown; updated_at: Date }>(
      `select key, value, updated_at from platform_settings order by key`,
    );
    return Object.fromEntries(
      rows.map((r) => [r.key, { value: r.value, updatedAt: r.updated_at.toISOString() }]),
    );
  });

  // ------------------------------------------------------------- credentials

  // GET /admin/credentials — full register (CredentialsAdmin page)
  app.get('/credentials', async () => {
    const { rows } = await query<{
      id: string;
      holder_name: string;
      user_email: string;
      module_title: string;
      module_slug: string;
      competency: string;
      status: string;
      hash: string;
      tx_hash: string | null;
      block_number: number | null;
      issued_at: Date;
      revoked_at: Date | null;
      revoked_reason: string | null;
      verifications: number;
    }>(
      `select c.id, c.holder_name, u.email as user_email,
              m.title as module_title, m.slug as module_slug,
              c.competency, c.status, c.hash, c.tx_hash, c.block_number,
              c.issued_at, c.revoked_at, c.revoked_reason,
              (select count(*)::int from credential_verifications cv where cv.credential_id = c.id) as verifications
         from credentials c
         join users u on u.id = c.user_id
         join modules m on m.id = c.module_id
        order by c.issued_at desc`,
    );
    return rows.map((r) => ({
      id: r.id,
      holderName: r.holder_name,
      email: r.user_email,
      moduleTitle: r.module_title,
      moduleSlug: r.module_slug,
      competency: r.competency,
      status: r.status,
      hash: r.hash,
      txHash: r.tx_hash,
      block: r.block_number,
      issuedAt: r.issued_at.toISOString(),
      revokedAt: r.revoked_at?.toISOString() ?? null,
      revokedReason: r.revoked_reason,
      verifications: r.verifications,
    }));
  });

  // PATCH /admin/credentials/:id — revoke / reinstate (DB + chain)
  app.patch<{ Params: { id: string } }>('/credentials/:id', async (req) => {
    const { id } = z.object({ id: z.string().min(4).max(40) }).parse(req.params);
    const { status, reason } = PatchCredential.parse(req.body);

    const target = await one<{ id: string; status: string }>(
      `select id, status from credentials where upper(id) = upper($1)`,
      [id.trim()],
    );
    if (!target) throw notFound('CREDENTIAL_NOT_FOUND');

    // Chain first when configured: status only flips on-chain success so the
    // DB never claims something the registry disagrees with.
    const { chainMode } = await import('../config.js');
    if (chainMode === 'sepolia') {
      try {
        const { ethers } = await import('ethers');
        const { SEPOLIA_RPC_URL, ISSUER_PRIVATE_KEY, CREDENTIAL_CONTRACT_ADDRESS } = process.env;
        const signer = new ethers.Wallet(ISSUER_PRIVATE_KEY!, new ethers.JsonRpcProvider(SEPOLIA_RPC_URL));
        const registry: any = new ethers.Contract(
          CREDENTIAL_CONTRACT_ADDRESS!,
          ['function revoke(bytes32)', 'function reinstate(bytes32)'],
          signer,
        );
        const { idHash } = await import('../lib/credential.js');
        const tx = status === 'revoked' ? await registry.revoke(idHash(target.id)) : await registry.reinstate(idHash(target.id));
        await tx.wait();
      } catch (err) {
        req.log.error({ err, id }, 'chain status change failed');
        throw conflict('CHAIN_ERROR', 'Could not update the on-chain status.');
      }
    }

    await withTx(async (client) => {
      await setActor(client, req.user!.sub);
      const { rows } = await client.query<{ status: string }>(
        `update credentials set status = $2, revoked_reason = $3 where upper(id) = upper($1) returning status`,
        [id.trim(), status, status === 'revoked' ? reason ?? 'Revoked by administrator' : null],
      );
      if (!rows[0]) throw notFound('CREDENTIAL_NOT_FOUND');
    });

    return { id: target.id, status };
  });

  // ---------------------------------------------------------------- metrics

  // GET /admin/metrics — evaluation views (Table 7)
  app.get('/metrics', async () => {
    const [gain, accuracy, health, totals] = await Promise.all([
      query<{ user_id: string; pre_score: number; post_score: number; gain: number }>(
        `select user_id, pre_score, post_score, gain from v_knowledge_gain`,
      ),
      query<{ accuracy_pct: number | null; mean_relevance: number | null; total: number }>(
        `select accuracy_pct, mean_relevance, total from v_recommendation_accuracy`,
      ),
      query<{
        valid: number;
        revoked: number;
        pending: number;
        checks: number;
        verify_success_pct: number | null;
      }>(`select valid, revoked, pending, checks, verify_success_pct from v_credential_health`),
      one<{
        students: number;
        attempts: number;
        modules: number;
        credentials: number;
        invites_active: number;
        mean_duration_ms: number | null;
      }>(
        `select
           (select count(*) from users where role = 'student' and deleted_at is null)::int as students,
           (select count(*) from assessment_attempts where completed_at is not null)::int as attempts,
           (select count(*) from modules where published)::int as modules,
           (select count(*) from credentials)::int as credentials,
           (select count(*) from invites where revoked_at is null and expires_at > now())::int as invites_active,
           (select avg(duration_ms)::int from assessment_attempts where duration_ms is not null) as mean_duration_ms`,
      ),
    ]);

    const gains = gain.rows.map((g) => g.gain);
    const avg = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : null;
    const gainsPositive = gains.filter((g) => g > 0).length;

    return {
      knowledgeGain: {
        learners: gains.length,
        meanGain: avg !== null ? Number(avg.toFixed(1)) : null,
        improved: gainsPositive,
        improvedPct: gains.length ? Math.round((gainsPositive / gains.length) * 100) : null,
        pairs: gain.rows,
      },
      recommendationAccuracy: {
        accuracyPct: accuracy.rows[0]?.accuracy_pct ?? null,
        meanRelevance: accuracy.rows[0]?.mean_relevance ?? null,
        total: accuracy.rows[0]?.total ?? 0,
      },
      credentialHealth: {
        valid: health.rows[0]?.valid ?? 0,
        revoked: health.rows[0]?.revoked ?? 0,
        pending: health.rows[0]?.pending ?? 0,
        checks: health.rows[0]?.checks ?? 0,
        verifySuccessPct: health.rows[0]?.verify_success_pct ?? null,
      },
      totals: totals ?? {
        students: 0,
        attempts: 0,
        modules: 0,
        credentials: 0,
        invites_active: 0,
        mean_duration_ms: null,
      },
      taskCompletion: {
        meanDurationMs: totals?.mean_duration_ms ?? null,
        attempts: totals?.attempts ?? 0,
      },
    };
  });

  // GET /admin/events — recent defect-log rows (FR11)
  app.get('/events', async (req) => {
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(req.query);
    const { rows } = await query<{
      id: number;
      user_id: string | null;
      event: string;
      success: boolean;
      duration_ms: number | null;
      props: unknown;
      created_at: Date;
    }>(
      `select id, user_id, event, success, duration_ms, props, created_at
         from event_logs order by id desc limit $1`,
      [limit],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      event: r.event,
      success: r.success,
      durationMs: r.duration_ms,
      props: r.props,
      at: r.created_at.toISOString(),
    }));
  });
}

// ------------------------------------------------------------------ helpers

/** Full transactional module save; returns the final slug. */
async function saveModule(
  input: z.infer<typeof SaveModule>,
  actorId: string,
  existingId: string | null,
): Promise<string> {
  if (input.quiz.some((q) => q.answer >= q.options.length)) {
    throw conflict('ANSWER_OUT_OF_RANGE', 'A quiz answer index exceeds the option count.');
  }

  return withTx(async (client) => {
    await setActor(client, actorId);

    let moduleId = existingId;
    if (moduleId) {
      const { rows } = await client.query<{ id: string }>(
        `update modules set domain_id = $2, title = $3, competency = $4, summary = $5,
                minutes = $6, passing_score = $7, published = $8, is_starter = $9
          where id = $1 returning id`,
        [moduleId, input.domain, input.title, input.competency, input.summary,
         input.minutes, input.passingScore, input.published, input.isStarter],
      );
      if (!rows[0]) throw notFound('MODULE_NOT_FOUND');
    } else {
      const { rows } = await client.query<{ id: string }>(
        `insert into modules (slug, domain_id, title, competency, summary, minutes,
                              passing_score, published, is_starter, created_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning id`,
        [
          input.slug ?? '', input.domain, input.title, input.competency, input.summary,
          input.minutes, input.passingScore, input.published, input.isStarter, actorId,
        ],
      );
      moduleId = rows[0]!.id;
    }

    // Replace children wholesale — the editor is a full-document form.
    await client.query(`delete from module_objectives where module_id = $1`, [moduleId]);
    await client.query(
      `insert into module_objectives (module_id, position, text)
       select $1, ordinality, t from unnest($2::text[]) with ordinality`,
      [moduleId, input.objectives],
    );

    await client.query(`delete from lessons where module_id = $1`, [moduleId]);
    for (let i = 0; i < input.lessons.length; i++) {
      const l = input.lessons[i]!;
      await client.query(
        `insert into lessons (module_id, position, title, paragraphs, example)
         values ($1, $2, $3, $4, $5)`,
        [moduleId, i, l.title, l.paragraphs, l.example ?? null],
      );
    }

    await client.query(
      `insert into activities (module_id, title, prompt) values ($1, $2, $3)
       on conflict (module_id) do update set title = $2, prompt = $3`,
      [moduleId, input.activity.title, input.activity.prompt],
    );

    await client.query(`delete from module_resources where module_id = $1`, [moduleId]);
    for (const r of input.resources) {
      await client.query(
        `insert into module_resources (module_id, title, source, url) values ($1, $2, $3, $4)`,
        [moduleId, r.title, r.source ?? null, r.url],
      );
    }

    // Replace module quiz questions (attempt history references diagnostic items only).
    await client.query(`delete from questions where module_id = $1`, [moduleId]);
    for (let i = 0; i < input.quiz.length; i++) {
      const q = input.quiz[i]!;
      await client.query(
        `insert into questions (domain_id, module_id, prompt, options, answer_index, explanation, position)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [input.domain, moduleId, q.prompt, JSON.stringify(q.options), q.answer, q.explanation ?? null, i],
      );
    }

    const slug = await client.query<{ slug: string }>(`select slug from modules where id = $1`, [moduleId]);
    return slug.rows[0]!.slug;
  });
}
