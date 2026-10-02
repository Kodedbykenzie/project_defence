import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, one, withTx } from '../db.js';
import { conflict, notFound } from '../errors.js';
import { requireAuth, requireRole } from '../auth-plugin.js';
import { idHash, contentHash, newCredentialId, simulatedBlock, simulatedTxHash } from '../lib/credential.js';
import { chainMode } from '../config.js';

// ------------------------------------------------------------------ shapes

const SlugParam = z.object({ slug: z.string().min(1).max(120) });
const LessonParam = SlugParam.extend({ index: z.coerce.number().int().min(0).max(100) });

const ActivityBody = z.object({ response: z.string().min(1).max(4000) });
const QuizBody = z.object({
  answers: z.array(z.number().int().min(0).max(10)).min(1).max(50),
});

interface ModuleRow {
  id: string;
  slug: string;
  domain_id: string;
  title: string;
  competency: string;
  summary: string | null;
  minutes: number;
  passing_score: number;
  published: boolean;
  is_starter: boolean;
}

/** Resolve slug (or legacy id) to a module visible to this role. */
async function findModule(slug: string, isAdmin: boolean): Promise<ModuleRow> {
  const row = await one<ModuleRow>(
    `select id, slug, domain_id, title, competency, summary, minutes, passing_score, published, is_starter
       from modules
      where (slug = $1 or id::text = $1) and ($2 or published)`,
    [slug, isAdmin],
  );
  if (!row) throw notFound('MODULE_NOT_FOUND', 'No such module.');
  return row;
}

async function getProgress(userId: string, moduleId: string) {
  const row = await one<{
    status: string;
    lessons_done: number[];
    activity_response: string | null;
    best_quiz_score: number | null;
  }>(
    `select status, lessons_done, activity_response, best_quiz_score
       from module_progress where user_id = $1 and module_id = $2`,
    [userId, moduleId],
  );
  return {
    status: row?.status ?? 'not_started',
    lessonsDone: row?.lessons_done ?? [],
    activityResponse: row?.activity_response ?? null,
    bestQuizScore: row?.best_quiz_score ?? null,
  };
}

/** Strip answers from quiz questions for students. */
function stripAnswers<T extends { answer_index: number; explanation: string | null }>(
  rows: T[],
  keepAnswers: boolean,
) {
  return rows.map(({ answer_index: _a, explanation: _e, ...rest }) =>
    keepAnswers ? { ...rest, answer: _a, explanation: _e } : rest,
  );
}

// ------------------------------------------------------------------ routes

export async function moduleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // GET /modules — published only (admins see drafts too), with the caller's progress
  app.get('/', async (req) => {
    const isAdmin = req.user!.role === 'admin';
    const { rows } = await query<ModuleRow & { domain_name: string; sort_order: number }>(
      `select m.id, m.slug, m.domain_id, m.title, m.competency, m.summary, m.minutes,
              m.passing_score, m.published, m.is_starter,
              d.name as domain_name, d.sort_order
         from modules m join domains d on d.id = m.domain_id
        where $1 or m.published
        order by d.sort_order, m.title`,
      [isAdmin],
    );

    const out = [];
    for (const m of rows) {
      out.push({
        id: m.id,
        slug: m.slug,
        domain: m.domain_id,
        domainName: m.domain_name,
        title: m.title,
        competency: m.competency,
        summary: m.summary,
        minutes: m.minutes,
        passingScore: m.passing_score,
        published: m.published,
        isStarter: m.is_starter,
        progress: await getProgress(req.user!.sub, m.id),
        credential: await getCredentialBrief(req.user!.sub, m.id),
      });
    }
    return out;
  });

  // GET /modules/:slug — full content; quiz answers only for admins
  app.get('/:slug', async (req) => {
    const { slug } = SlugParam.parse(req.params);
    const isAdmin = req.user!.role === 'admin';
    const m = await findModule(slug, isAdmin);

    const [objectives, lessons, activity, resources, quiz, progress, credential] = await Promise.all([
      query<{ text: string }>(
        `select text from module_objectives where module_id = $1 order by position`,
        [m.id],
      ),
      query<{ title: string; paragraphs: string[]; example: string | null; position: number }>(
        `select title, paragraphs, example, position from lessons where module_id = $1 order by position`,
        [m.id],
      ),
      one<{ title: string; prompt: string }>(
        `select title, prompt from activities where module_id = $1`,
        [m.id],
      ),
      query<{ title: string; source: string | null; url: string }>(
        `select title, source, url from module_resources where module_id = $1 order by id`,
        [m.id],
      ),
      query<{ id: string; prompt: string; options: string[]; answer_index: number; explanation: string | null; position: number }>(
        `select id, prompt, options, answer_index, explanation, position
           from questions where module_id = $1 and active order by position, id`,
        [m.id],
      ),
      getProgress(req.user!.sub, m.id),
      getCredentialBrief(req.user!.sub, m.id),
    ]);

    return {
      id: m.id,
      slug: m.slug,
      domain: m.domain_id,
      title: m.title,
      competency: m.competency,
      summary: m.summary,
      minutes: m.minutes,
      passingScore: m.passing_score,
      published: m.published,
      isStarter: m.is_starter,
      objectives: objectives.rows.map((o) => o.text),
      lessons: lessons.rows.map(({ position, ...l }) => ({ ...l, position })),
      activity: activity ?? { title: '', prompt: '' },
      resources: resources.rows,
      quiz: stripAnswers(
        quiz.rows.sort((a, b) => a.position - b.position),
        isAdmin,
      ),
      progress,
      credential,
    };
  });

  // POST /modules/:slug/lessons/:index/complete
  app.post('/:slug/lessons/:index/complete', async (req) => {
    const { slug, index } = LessonParam.parse(req.params);
    const m = await findModule(slug, req.user!.role === 'admin');
    const userId = req.user!.sub;

    const count = await one<{ n: number }>(
      `select count(*)::int as n from lessons where module_id = $1`,
      [m.id],
    );
    if (index >= (count?.n ?? 0)) throw notFound('LESSON_NOT_FOUND');

    await query(
      `insert into module_progress (user_id, module_id, lessons_done)
       values ($1, $2, array[$3::smallint])
       on conflict (user_id, module_id) do update
         set lessons_done = case
               when $3 = any(module_progress.lessons_done) then module_progress.lessons_done
               else array_append(module_progress.lessons_done, $3::smallint)
             end`,
      [userId, m.id, index],
    );
    return getProgress(userId, m.id);
  });

  // POST /modules/:slug/activity
  app.post('/:slug/activity', async (req) => {
    const { slug } = SlugParam.parse(req.params);
    const { response } = ActivityBody.parse(req.body);
    const m = await findModule(slug, req.user!.role === 'admin');
    const userId = req.user!.sub;

    await query(
      `insert into module_progress (user_id, module_id, activity_response)
       values ($1, $2, $3)
       on conflict (user_id, module_id) do update set activity_response = $3`,
      [userId, m.id, response],
    );
    return getProgress(userId, m.id);
  });

  // POST /modules/:slug/quiz — server-side scoring; DB trigger rolls best into progress
  app.post('/:slug/quiz', async (req) => {
    const { slug } = SlugParam.parse(req.params);
    const { answers } = QuizBody.parse(req.body);
    const m = await findModule(slug, req.user!.role === 'admin');
    const userId = req.user!.sub;

    const { rows: questions } = await query<{ answer_index: number }>(
      `select answer_index from questions
        where module_id = $1 and active order by position, id`,
      [m.id],
    );
    if (!questions.length) throw conflict('NO_QUESTIONS', 'This module has no quiz items.');

    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer_index) correct += 1;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= m.passing_score;

    await query(
      `insert into quiz_attempts (user_id, module_id, answers, score, passed)
       values ($1, $2, $3::smallint[], $4, $5)`,
      [userId, m.id, answers, score, passed],
    );

    return { score, passed, correct, total: questions.length, passingScore: m.passing_score };
  });

  // POST /modules/:slug/credential — issue when eligible (trigger enforces)
  app.post('/:slug/credential', { preHandler: [requireRole('student', 'admin')] }, async (req, reply) => {
    const { slug } = SlugParam.parse(req.params);
    const m = await findModule(slug, req.user!.role === 'admin');
    const userId = req.user!.sub;

    const user = await one<{ full_name: string }>(`select full_name from users where id = $1`, [userId]);
    if (!user) throw notFound('USER_NOT_FOUND');

    // Already issued? (unique(user_id, module_id) also guards, but fail friendly)
    const existing = await one(
      `select id from credentials where user_id = $1 and module_id = $2`,
      [userId, m.id],
    );
    if (existing) throw conflict('CREDENTIAL_EXISTS', 'Credential already issued for this module.');

    const issuedAt = new Date();
    const id = await mintCredentialId();
    const parts = {
      id,
      learnerId: userId,
      moduleId: m.id,
      competency: m.competency,
      issuedAt: issuedAt.toISOString(),
    };
    const hash = contentHash(parts); // 0x…64 hex — keccak256, canonical payload

    // Insert first (eligibility trigger raises COMPETENCY_NOT_MET → 409),
    // then anchor. Chain write failure leaves status='pending' for retry jobs.
    const credentialId = await withTx(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `insert into credentials (id, user_id, module_id, competency, holder_name, hash, status, issued_by, issued_at)
         values ($1, $2, $3, $4, $5, $6, 'pending', $2, $7)
         returning id`,
        [id, userId, m.id, m.competency, user.full_name, hash, issuedAt],
      );
      return rows[0]!.id;
    });

    // Anchor: real Sepolia tx when configured, deterministic simulation otherwise.
    let txHash: string | null = null;
    let block: number | null = null;
    try {
      if (chainMode === 'sepolia') {
        const anchored = await anchorOnChain(id, hash);
        txHash = anchored.txHash;
        block = anchored.block;
      } else {
        txHash = simulatedTxHash(id);
        block = simulatedBlock(id);
      }
      await query(
        `update credentials set tx_hash = $2, block_number = $3, contract_address = $4, status = 'valid'
          where id = $1`,
        [credentialId, txHash, block, process.env.CREDENTIAL_CONTRACT_ADDRESS || null],
      );
    } catch (err) {
      req.log.error({ err, credentialId }, 'chain anchor failed — staying pending');
    }

    req.log.info({ userId, credentialId, chainMode }, 'credential issued');
    const row = await loadCredential(credentialId);
    return reply.code(201).send(row);
  });

  // POST /modules/:slug/feedback — relevance rating (FR8)
  app.post('/:slug/feedback', async (req, reply) => {
    const { slug } = SlugParam.parse(req.params);
    const { rating, comment } = z
      .object({ rating: z.number().int().min(1).max(5), comment: z.string().max(1000).optional() })
      .parse(req.body);
    const m = await findModule(slug, req.user!.role === 'admin');
    await query(
      `insert into module_feedback (user_id, module_id, rating, comment)
       values ($1, $2, $3, $4)
       on conflict (user_id, module_id) do update set rating = $3, comment = $4`,
      [req.user!.sub, m.id, rating, comment ?? null],
    );
    return reply.code(201).send({ stored: true });
  });
}

// ------------------------------------------------------------------ helpers

async function mintCredentialId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = newCredentialId();
    const clash = await one(`select 1 from credentials where id = $1`, [id]);
    if (!clash) return id;
  }
  throw new Error('could not mint a unique credential id');
}

async function getCredentialBrief(userId: string, moduleId: string) {
  const row = await one<{ id: string; status: string; issued_at: Date }>(
    `select id, status, issued_at from credentials
      where user_id = $1 and module_id = $2 and status <> 'pending'`,
    [userId, moduleId],
  );
  return row ? { id: row.id, status: row.status, issuedAt: row.issued_at.toISOString() } : null;
}

async function loadCredential(id: string) {
  const row = await one<{
    id: string;
    competency: string;
    holder_name: string;
    hash: string;
    tx_hash: string | null;
    block_number: number | null;
    status: string;
    issued_at: Date;
  }>(
    `select id, competency, holder_name, hash, tx_hash, block_number, status, issued_at
       from credentials where id = $1`,
    [id],
  );
  if (!row) throw notFound('CREDENTIAL_NOT_FOUND');
  return {
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

/** Sepolia issue() via ethers — only called when chainMode === 'sepolia'. */
export async function anchorOnChain(id: string, contentHashHex: string): Promise<{ txHash: string; block: number }> {
  const { ethers } = await import('ethers');
  const { SEPOLIA_RPC_URL, ISSUER_PRIVATE_KEY, CREDENTIAL_CONTRACT_ADDRESS } = process.env;
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const signer = new ethers.Wallet(ISSUER_PRIVATE_KEY!, provider);
  const registry: any = new ethers.Contract(
    CREDENTIAL_CONTRACT_ADDRESS!,
    [
      'function issue(bytes32 idHash, bytes32 contentHash)',
      'event CredentialIssued(bytes32 indexed idHash, bytes32 contentHash)',
    ],
    signer,
  );
  const tx = await registry.issue(idHash(id), contentHashHex);
  const receipt = await tx.wait();
  if (!receipt) throw new Error('transaction dropped');
  return { txHash: receipt.hash as string, block: Number(receipt.blockNumber) };
}
