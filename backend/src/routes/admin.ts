import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query, setActor, withTx } from '../db.js';
import { AppError, badRequest, conflict, notFound } from '../errors.js';
import { requireRole } from '../auth-plugin.js';
import { getChainGateway } from '../services/chain-gateway.js';
import { config } from '../config.js';

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

const DATABASE_TABLES = {
  institutions: { label: 'Institutions', description: 'Universities and learning institutions', columns: ['id', 'slug', 'name', 'country', 'city', 'created_at'] },
  users: { label: 'Users', description: 'Accounts; password hashes and secrets are never shown', columns: ['id', 'email', 'role', 'full_name', 'avatar_url', 'email_verified_at', 'last_login_at', 'created_at', 'updated_at', 'deleted_at'] },
  student_profiles: { label: 'Student profiles', description: 'Learner enrollment and consent details', columns: ['user_id', 'institution_id', 'programme', 'year_of_study', 'research_consent', 'consent_version', 'consent_given_at', 'consent_withdrawn_at', 'onboarded_at', 'created_at', 'updated_at'] },
  user_preferences: { label: 'User preferences', description: 'Language, display, learning and digest preferences', columns: ['user_id', 'language', 'text_size', 'reduce_motion', 'interests', 'goal', 'weekly_time', 'learning_style', 'toasts_enabled', 'email_digest', 'updated_at'] },
  invites: { label: 'Invites', description: 'Invite status, usage and expiry information; redeemable codes are hidden', columns: ['id', 'email', 'note', 'max_uses', 'uses', 'expires_at', 'revoked_at', 'created_by', 'created_at'] },
  invite_redemptions: { label: 'Invite redemptions', description: 'Accounts that redeemed an invite', columns: ['id', 'invite_id', 'user_id', 'redeemed_at'] },
  domains: { label: 'Learning domains', description: 'Financial literacy subject areas', columns: ['id', 'name', 'code', 'description', 'sort_order'] },
  modules: { label: 'Modules', description: 'Learning module catalogue and publication status', columns: ['id', 'slug', 'domain_id', 'title', 'competency', 'summary', 'minutes', 'passing_score', 'published', 'is_starter', 'published_at', 'created_by', 'created_at', 'updated_at'] },
  module_objectives: { label: 'Module objectives', description: 'Learning objectives for each module', columns: ['module_id', 'position', 'text'] },
  lessons: { label: 'Lessons', description: 'Lesson content and examples', columns: ['id', 'module_id', 'position', 'title', 'paragraphs', 'example'] },
  activities: { label: 'Activities', description: 'Practical activities attached to modules', columns: ['module_id', 'title', 'prompt'] },
  module_resources: { label: 'Module resources', description: 'External learning resources', columns: ['id', 'module_id', 'title', 'source', 'url'] },
  questions: { label: 'Questions', description: 'Assessment and quiz prompts; answer keys are hidden', columns: ['id', 'domain_id', 'module_id', 'prompt', 'options', 'position', 'active', 'created_at', 'updated_at'] },
  assessment_attempts: { label: 'Assessment attempts', description: 'Learner diagnostic and post-test attempts', columns: ['id', 'user_id', 'kind', 'total_score', 'threshold_used', 'duration_ms', 'started_at', 'completed_at'] },
  domain_scores: { label: 'Domain scores', description: 'Assessment scores by learning domain', columns: ['attempt_id', 'domain_id', 'correct', 'total', 'score'] },
  recommendations: { label: 'Recommendations', description: 'Modules recommended after assessments', columns: ['id', 'attempt_id', 'user_id', 'module_id', 'domain_id', 'priority', 'domain_score', 'threshold', 'created_at'] },
  module_progress: { label: 'Module progress', description: 'Learner progress through modules', columns: ['user_id', 'module_id', 'status', 'lessons_done', 'best_quiz_score', 'started_at', 'completed_at', 'updated_at'] },
  quiz_attempts: { label: 'Quiz attempts', description: 'Module quiz scores and completion', columns: ['id', 'user_id', 'module_id', 'score', 'passed', 'created_at'] },
  module_feedback: { label: 'Module feedback', description: 'Learner ratings and comments', columns: ['user_id', 'module_id', 'rating', 'comment', 'created_at'] },
  credentials: { label: 'Credentials', description: 'Issued credentials and verification status', columns: ['id', 'user_id', 'module_id', 'competency', 'holder_name', 'chain_id', 'contract_address', 'tx_hash', 'block_number', 'status', 'issued_by', 'issued_at', 'confirmed_at', 'revoked_at', 'revoked_reason'] },
  credential_verifications: { label: 'Credential checks', description: 'Credential verification outcomes; network identifiers are hidden', columns: ['id', 'credential_id', 'presented_id', 'result', 'latency_ms', 'created_at'] },
  notifications: { label: 'Notifications', description: 'Platform and learner notifications', columns: ['id', 'audience', 'recipient_id', 'kind', 'title', 'body', 'link', 'created_at'] },
  notification_reads: { label: 'Notification reads', description: 'Read receipts for notifications', columns: ['notification_id', 'user_id', 'read_at'] },
  event_logs: { label: 'Event log', description: 'Application event names and timing; event payloads are hidden', columns: ['id', 'user_id', 'event', 'success', 'duration_ms', 'created_at'] },
  audit_log: { label: 'Audit log', description: 'Admin changes; detailed diffs are hidden', columns: ['id', 'actor_id', 'table_name', 'row_id', 'action', 'created_at'] },
} as const;

const DatabaseRowsQuery = z.object({
  table: z.string().min(1),
  column: z.string().optional(),
  value: z.string().max(200).optional(),
  match: z.enum(['contains', 'equals']).default('contains'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

function randomCode(prefix: string): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += InviteAlphabet[Math.floor(Math.random() * InviteAlphabet.length)];
  return `${prefix.toUpperCase()}-${s}`;
}

// ------------------------------------------------------------------ routes

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireRole('admin'));

  app.get('/database/tables', async () => ({
    tables: Object.entries(DATABASE_TABLES).map(([name, info]) => ({ name, ...info })),
    readOnly: true,
    maxRows: 100,
  }));

  app.get('/database/rows', async (req) => {
    const input = DatabaseRowsQuery.parse(req.query);
    const tableName = input.table as keyof typeof DATABASE_TABLES;
    const table = DATABASE_TABLES[tableName];
    if (!table) throw badRequest('DATABASE_TABLE_NOT_ALLOWED', 'Choose a table from the approved list.');

    const params: unknown[] = [];
    let where = '';
    if (input.value?.trim()) {
      if (!input.column || !(table.columns as readonly string[]).includes(input.column)) {
        throw badRequest('DATABASE_COLUMN_NOT_ALLOWED', 'Choose a visible column for filtering.');
      }
      params.push(input.value.trim());
      const filter = input.match === 'equals'
        ? `lower("${input.column}"::text) = lower($1)`
        : `position(lower($1) in lower("${input.column}"::text)) > 0`;
      where = `where ${filter}`;
    }

    params.push(input.limit + 1, input.offset);
    const columns = table.columns.map((column) => `"${column}"`).join(', ');
    const result = await query(
      `select ${columns} from "imari"."${tableName}" ${where} order by ${table.columns.includes('created_at' as never) ? '"created_at" desc' : `"${table.columns[0]}"`} limit $${params.length - 1} offset $${params.length}`,
      params,
    );
    const hasMore = result.rows.length > input.limit;
    return { table: tableName, columns: table.columns, rows: result.rows.slice(0, input.limit), hasMore, limit: input.limit, offset: input.offset };
  });

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

    // Chain first: the status only flips on-chain once the transaction is
    // confirmed, so the database never claims something the registry
    // disagrees with.
    const gateway = getChainGateway();
    if (gateway.mode === 'sepolia') {
      try {
        try {
          const tx =
            status === 'revoked'
              ? await gateway.revoke(target.id)
              : await gateway.reinstate(target.id);
          await tx;
        } catch (chainErr) {
          // The chain may already be in the desired state (e.g. an earlier
          // request anchored it but the DB write rolled back). Reconcile
          // against the contract instead of guessing.
          const onChain = await gateway.read(target.id);
          const onChainStatus = onChain?.status ?? 'none';
          if (onChainStatus !== status) {
            req.log.error({ err: chainErr, id }, 'chain status change failed');
            throw conflict('CHAIN_ERROR', 'Could not update the on-chain status.');
          }
          req.log.warn({ id, status }, 'chain already in desired state — reconciling DB');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
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

  // ------------------------------------------------------------- students/:id

  // GET /admin/students/:id — complete learner record for the admin side sheet.
  app.get<{ Params: { id: string } }>('/students/:id', async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

    const student = await one<{
      id: string;
      email: string;
      full_name: string;
      created_at: Date;
      last_login_at: Date | null;
      university: string | null;
      programme: string | null;
      onboarded_at: Date | null;
    }>(
      `select u.id, u.email, u.full_name, u.created_at, u.last_login_at,
              i.name as university, sp.programme, sp.onboarded_at
         from users u
         left join student_profiles sp on sp.user_id = u.id
         left join institutions i on i.id = sp.institution_id
        where u.id = $1 and u.deleted_at is null`,
      [id],
    );
    if (!student) throw notFound('STUDENT_NOT_FOUND');

    const progress = await query<{
      slug: string;
      title: string;
      domain_name: string;
      status: string;
      lessons_done: number;
      lessons_total: number;
      best_quiz_score: number | null;
      activity_done: boolean;
      completed_at: Date | null;
      updated_at: Date;
    }>(
      `select m.slug, m.title, d.name as domain_name, mp.status,
              cardinality(mp.lessons_done) as lessons_done,
              (select count(*)::int from lessons l where l.module_id = m.id) as lessons_total,
              mp.best_quiz_score,
              (mp.activity_response is not null) as activity_done,
              mp.completed_at, mp.updated_at
         from module_progress mp
         join modules m on m.id = mp.module_id
         join domains d on d.id = m.domain_id
        where mp.user_id = $1
        order by mp.updated_at desc`,
      [id],
    );

    const credentials = await query<{
      id: string;
      competency: string;
      status: string;
      tx_hash: string | null;
      issued_at: Date;
      module_title: string;
    }>(
      `select c.id, c.competency, c.status, c.tx_hash, c.issued_at, m.title as module_title
         from credentials c
         join modules m on m.id = c.module_id
        where c.user_id = $1
        order by c.issued_at desc`,
      [id],
    );

    const attempts = await query<{
      id: string;
      kind: string;
      total_score: number;
      threshold_used: number;
      duration_ms: number | null;
      completed_at: Date;
    }>(
      `select id, kind, total_score, threshold_used, duration_ms, completed_at
         from assessment_attempts
        where user_id = $1 and completed_at is not null
        order by completed_at desc
        limit 5`,
      [id],
    );

    const latestAttempt = attempts.rows[0];
    const domainScores = latestAttempt
      ? (
          await query<{ domain_id: string; name: string; correct: number; total: number }>(
            `select ds.domain_id, d.name, ds.correct, ds.total
               from domain_scores ds
               join domains d on d.id = ds.domain_id
              where ds.attempt_id = $1
              order by d.sort_order`,
            [latestAttempt.id],
          )
        ).rows
      : [];

    const activity = await one<{
      events: number;
      failures: number;
      last_active: Date | null;
      quizzes: number;
      passed: number;
      feedback: number;
    }>(
      `select
         (select count(*)::int from event_logs where user_id = $1) as events,
         (select count(*)::int from event_logs where user_id = $1 and not success) as failures,
         (select max(created_at) from event_logs where user_id = $1) as last_active,
         (select count(*)::int from quiz_attempts where user_id = $1) as quizzes,
         (select count(*)::int from quiz_attempts where user_id = $1 and passed) as passed,
         (select count(*)::int from module_feedback where user_id = $1) as feedback`,
      [id],
    );

    const completed = progress.rows.filter((p) => p.status === 'completed').length;
    const latestScore = latestAttempt?.total_score ?? null;
    const lastActive = activity?.last_active ?? null;
    const idleDays = lastActive
      ? Math.floor((Date.now() - lastActive.getTime()) / 86_400_000)
      : null;

    const reasons: string[] = [];
    if (progress.rows.length === 0 && attempts.rows.length === 0) {
      reasons.push('No learning activity yet');
    }
    if (latestScore !== null && latestScore < 50) {
      reasons.push(`Latest diagnostic scored ${latestScore}%`);
    }
    if (progress.rows.length > 0 && completed === 0) {
      reasons.push('Started modules but completed none');
    }
    if (idleDays !== null && idleDays >= 14) {
      reasons.push(`No activity for ${idleDays} days`);
    }

    return {
      id: student.id,
      name: student.full_name,
      email: student.email,
      university: student.university,
      programme: student.programme,
      joinedAt: student.created_at.toISOString(),
      lastLoginAt: student.last_login_at?.toISOString() ?? null,
      onboardedAt: student.onboarded_at?.toISOString() ?? null,
      summary: {
        modulesStarted: progress.rows.length,
        modulesCompleted: completed,
        credentials: credentials.rows.length,
        attempts: attempts.rows.length,
        latestScore,
        lastActiveAt: lastActive?.toISOString() ?? null,
        idleDays,
      },
      risk: {
        level: reasons.length >= 2 ? 'high' : reasons.length === 1 ? 'medium' : 'low',
        reasons,
        idleDays,
      },
      progress: progress.rows.map((p) => ({
        slug: p.slug,
        title: p.title,
        domain: p.domain_name,
        status: p.status,
        lessonsDone: p.lessons_done,
        lessonsTotal: p.lessons_total,
        bestQuizScore: p.best_quiz_score,
        activitySubmitted: p.activity_done,
        completedAt: p.completed_at?.toISOString() ?? null,
        updatedAt: p.updated_at.toISOString(),
      })),
      credentials: credentials.rows.map((c) => ({
        id: c.id,
        moduleTitle: c.module_title,
        competency: c.competency,
        status: c.status,
        txHash: c.tx_hash,
        issuedAt: c.issued_at.toISOString(),
      })),
      assessment: {
        attempts: attempts.rows.map((a) => ({
          id: a.id,
          kind: a.kind,
          totalScore: a.total_score,
          thresholdUsed: a.threshold_used,
          durationMs: a.duration_ms,
          completedAt: a.completed_at.toISOString(),
        })),
        latestDomainScores: domainScores.map((d) => ({
          domain: d.domain_id,
          name: d.name,
          correct: d.correct,
          total: d.total,
          score: Math.round((d.correct / Math.max(d.total, 1)) * 100),
        })),
      },
      activity: {
        events: activity?.events ?? 0,
        failures: activity?.failures ?? 0,
        quizAttempts: activity?.quizzes ?? 0,
        quizzesPassed: activity?.passed ?? 0,
        feedbackGiven: activity?.feedback ?? 0,
      },
    };
  });

  // --------------------------------------------------------- recommendations

  // GET /admin/recommendations — recommendation audit (accuracy + relevance)
  app.get('/recommendations', async (req) => {
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(200).default(50) })
      .parse(req.query);

    const [summary, byDomain, recent] = await Promise.all([
      one<{ total: number; correct: number; rated: number; avg_relevance: string | null }>(
        `select count(*)::int as total,
                count(*) filter (where is_correct)::int as correct,
                count(*) filter (where relevance is not null)::int as rated,
                round(avg(relevance)::numeric, 2) as avg_relevance
           from recommendations`,
      ),
      query<{
        domain_id: string;
        name: string;
        total: number;
        correct: number;
        avg_score: number | null;
      }>(
        `select r.domain_id, d.name, count(*)::int as total,
                count(*) filter (where r.is_correct)::int as correct,
                round(avg(r.domain_score))::int as avg_score
           from recommendations r
           join domains d on d.id = r.domain_id
          group by r.domain_id, d.name
          order by total desc`,
      ),
      query<{
        id: string;
        priority: number;
        domain_id: string;
        domain_name: string;
        domain_score: number;
        threshold: number;
        reason: string;
        is_correct: boolean | null;
        relevance: number | null;
        created_at: Date;
        full_name: string;
        email: string;
        slug: string;
        title: string;
      }>(
        `select r.id, r.priority, r.domain_id, d.name as domain_name,
                r.domain_score, r.threshold, r.reason, r.is_correct, r.relevance,
                r.created_at, u.full_name, u.email, m.slug, m.title
           from recommendations r
           join domains d on d.id = r.domain_id
           join users u on u.id = r.user_id
           join modules m on m.id = r.module_id
          order by r.created_at desc
          limit $1`,
        [limit],
      ),
    ]);

    const total = summary?.total ?? 0;
    const correct = summary?.correct ?? 0;
    const avgRelevance = summary?.avg_relevance !== null && summary?.avg_relevance !== undefined
      ? Number(summary.avg_relevance)
      : null;

    return {
      summary: {
        total,
        correct,
        incorrect: total - correct,
        accuracyPct: total ? Math.round((correct / total) * 100) : null,
        avgRelevance,
        rated: summary?.rated ?? 0,
      },
      byDomain: byDomain.rows.map((d) => ({
        domain: d.domain_id,
        name: d.name,
        total: d.total,
        correct: d.correct,
        accuracyPct: d.total ? Math.round((d.correct / d.total) * 100) : null,
        avgDomainScore: d.avg_score,
      })),
      recent: recent.rows.map((r) => ({
        id: r.id,
        learner: r.full_name,
        email: r.email,
        moduleSlug: r.slug,
        moduleTitle: r.title,
        domain: r.domain_id,
        domainName: r.domain_name,
        priority: r.priority,
        domainScore: r.domain_score,
        threshold: r.threshold,
        reason: r.reason,
        isCorrect: r.is_correct,
        relevance: r.relevance,
        createdAt: r.created_at.toISOString(),
      })),
    };
  });

  // ------------------------------------------------------------- broadcast

  // POST /admin/notifications/broadcast — announcement to a role or everyone.
  app.post('/notifications/broadcast', async (req, reply) => {
    const input = z
      .object({
        audience: z
          .array(z.enum(['student', 'students', 'admin', 'admins']))
          .min(1)
          .max(2)
          .default(['students']),
        kind: z
          .enum(['credential', 'invite', 'student', 'assessment', 'course', 'system'])
          .default('system'),
        title: z.string().trim().min(1).max(200),
        body: z.string().max(2000).optional(),
        link: z.string().max(500).optional(),
      })
      .parse(req.body);

    const audiences = [
      ...new Set(input.audience.map((a) => (a.startsWith('student') ? 'students' : 'admins'))),
    ] as Array<'students' | 'admins'>;

    let created = 0;
    for (const audience of audiences) {
      await query(
        `insert into notifications (audience, kind, title, body, link)
         values ($1, $2, $3, $4, $5)`,
        [audience, input.kind, input.title, input.body ?? null, input.link ?? null],
      );
      created += 1;
    }

    req.log.info({ created, audiences, kind: input.kind }, 'notification broadcast');
    return reply
      .code(201)
      .send({ created, audience: audiences, kind: input.kind, title: input.title });
  });

  // --------------------------------------------------------------- reports

  // GET /admin/reports/export?type=roster|credentials|engagement — CSV download
  app.get('/reports/export', async (req, reply) => {
    const { type } = z
      .object({
        type: z.enum(['roster', 'credentials', 'engagement']).default('roster'),
      })
      .parse(req.query);

    let header: string[] = [];
    let rows: Array<Array<string | number | null>> = [];

    if (type === 'roster') {
      header = ['email', 'name', 'university', 'joined_at', 'modules_started', 'modules_completed', 'credentials', 'best_quiz_score'];
      const { rows: data } = await query<{
        email: string;
        name: string;
        university: string | null;
        created_at: Date;
        started: number;
        completed: number;
        credentials: number;
        best_quiz: number | null;
      }>(
        `select u.email, u.full_name as name, i.name as university, u.created_at,
                (select count(*)::int from module_progress mp where mp.user_id = u.id) as started,
                (select count(*)::int from module_progress mp where mp.user_id = u.id and mp.status = 'completed') as completed,
                (select count(*)::int from credentials c where c.user_id = u.id and c.status <> 'revoked') as credentials,
                (select max(mp.best_quiz_score) from module_progress mp where mp.user_id = u.id) as best_quiz
           from users u
           left join student_profiles sp on sp.user_id = u.id
           left join institutions i on i.id = sp.institution_id
          where u.role = 'student' and u.deleted_at is null
          order by u.created_at`,
      );
      rows = data.map((r) => [
        r.email, r.name, r.university, r.created_at.toISOString(),
        r.started, r.completed, r.credentials, r.best_quiz,
      ]);
    } else if (type === 'credentials') {
      header = ['id', 'holder_name', 'email', 'module', 'competency', 'status', 'issued_at', 'chain_id', 'tx_hash'];
      const { rows: data } = await query<{
        id: string;
        holder_name: string;
        email: string;
        title: string;
        competency: string;
        status: string;
        issued_at: Date;
        chain_id: number;
        tx_hash: string | null;
      }>(
        `select c.id, c.holder_name, u.email, m.title, c.competency, c.status,
                c.issued_at, c.chain_id, c.tx_hash
           from credentials c
           join users u on u.id = c.user_id
           join modules m on m.id = c.module_id
          order by c.issued_at desc`,
      );
      rows = data.map((r) => [
        r.id, r.holder_name, r.email, r.title, r.competency, r.status,
        r.issued_at.toISOString(), r.chain_id, r.tx_hash,
      ]);
    } else {
      header = ['email', 'name', 'events', 'failures', 'quiz_attempts', 'feedback', 'last_active_at'];
      const { rows: data } = await query<{
        email: string;
        name: string;
        events: number;
        failures: number;
        quizzes: number;
        feedback: number;
        last_active: Date | null;
      }>(
        `select u.email, u.full_name as name,
                (select count(*)::int from event_logs e where e.user_id = u.id) as events,
                (select count(*)::int from event_logs e where e.user_id = u.id and not e.success) as failures,
                (select count(*)::int from quiz_attempts q where q.user_id = u.id) as quizzes,
                (select count(*)::int from module_feedback f where f.user_id = u.id) as feedback,
                (select max(e.created_at) from event_logs e where e.user_id = u.id) as last_active
           from users u
          where u.role = 'student' and u.deleted_at is null
          order by u.created_at`,
      );
      rows = data.map((r) => [
        r.email, r.name, r.events, r.failures, r.quizzes, r.feedback,
        r.last_active?.toISOString() ?? null,
      ]);
    }

    const csv = [header, ...rows].map((line) => line.map(csvCell).join(',')).join('\r\n');
    return reply
      .header('content-type', 'text/csv; charset=utf-8')
      .header('content-disposition', `attachment; filename="imari-${type}.csv"`)
      .send(`${csv}\r\n`);
  });

  // ------------------------------------------------------------ health-check

  // GET /admin/health-check — database, auth, chain and queue indicators.
  app.get('/health-check', async (req) => {
    const dbStart = Date.now();
    let databaseOk = true;
    try {
      await query('select 1');
    } catch (err) {
      databaseOk = false;
      req.log.error({ err }, 'health-check: database unreachable');
    }
    const dbLatency = Date.now() - dbStart;

    let pendingCredentials = 0;
    try {
      const row = await one<{ n: number }>(
        `select count(*)::int as n from credentials where status = 'pending'`,
      );
      pendingCredentials = row?.n ?? 0;
    } catch {
      pendingCredentials = -1;
    }

    const gateway = getChainGateway();
    const checks = {
      database: { ok: databaseOk, latencyMs: dbLatency },
      auth: {
        ok: Boolean(config.JWT_SECRET),
        googleEnabled: Boolean(config.GOOGLE_CLIENT_ID),
      },
      chain: {
        ok: gateway.mode === 'simulate' || Boolean(config.SEPOLIA_RPC_URL),
        mode: gateway.mode,
        chainId: gateway.chainId,
        contract: gateway.contractAddress ?? null,
      },
      queue: { ok: pendingCredentials === 0, pendingCredentials: Math.max(pendingCredentials, 0) },
    };

    const ok = Object.values(checks).every((c) => c.ok);
    return {
      status: ok ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    };
  });
}

/** RFC 4180 cell: quote when needed, double embedded quotes. */
function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
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
       select $1, u.ord, u.text from unnest($2::text[]) with ordinality as u(text, ord)`,
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
