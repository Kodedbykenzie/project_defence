import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, withTx } from '../db.js';
import { AppError, conflict } from '../errors.js';
import { requireRole } from '../auth-plugin.js';
import {
  buildRecommendations,
  getThreshold,
  loadDiagnostic,
  scoreAnswers,
} from '../lib/scoring.js';

const SubmitAttempt = z.object({
  kind: z.enum(['pre', 'post']).default('pre'),
  answers: z.record(z.string().uuid(), z.number().int().min(0).max(10)),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
});

export async function assessmentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireRole('student', 'admin'));

  // GET /assessment/diagnostic — 15 active items, answers stripped
  app.get('/diagnostic', async () => {
    const { rows } = await query<{
      id: string;
      domain: string;
      prompt: string;
      options: string[];
      position: number;
    }>(
      `select id, domain_id as domain, prompt, options, position
         from questions
        where module_id is null and active
        order by position, id`,
    );
    return { questions: rows, total: rows.length };
  });

  // POST /assessment/attempts — scores server-side (single source of truth)
  app.post('/attempts', async (req) => {
    const input = SubmitAttempt.parse(req.body);
    const userId = req.user!.sub;
    const started = process.hrtime.bigint();

    const questions = await loadDiagnostic();
    if (!questions.length) throw conflict('NO_QUESTIONS', 'No diagnostic items available.');

    // Validate every submitted answer id belongs to the active diagnostic.
    const validIds = new Set(questions.map((q) => q.id));
    for (const id of Object.keys(input.answers)) {
      if (!validIds.has(id)) {
        throw new AppError(422, 'UNKNOWN_QUESTION', `Question ${id} is not part of the active diagnostic.`);
      }
    }

    const { rows: domainRows } = await query<{ id: string }>(
      `select id from domains order by sort_order`,
    );
    const domainIds = domainRows.map((d) => d.id);

    const scored = scoreAnswers(questions, input.answers, domainIds);
    const threshold = await getThreshold();

    // Recommendation generation timing (evaluation metric, Table 7).
    const recStart = process.hrtime.bigint();
    const recommendations = await buildRecommendations(scored.domainScores, threshold);
    const recommendationMs = Number(process.hrtime.bigint() - recStart) / 1e6;

    const attemptId = await withTx(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `insert into assessment_attempts
           (user_id, kind, total_score, threshold_used, duration_ms, recommendation_ms, completed_at)
         values ($1, $2, $3, $4, $5, $6, now())
         returning id`,
        [userId, input.kind, scored.total, threshold, input.durationMs ?? null, recommendationMs.toFixed(2)],
      );
      const id = rows[0]!.id;

      for (const ds of scored.domainScores) {
        await client.query(
          `insert into domain_scores (attempt_id, domain_id, correct, total) values ($1, $2, $3, $4)`,
          [id, ds.domainId, ds.correct, ds.total],
        );
      }

      for (const q of questions) {
        const selected = input.answers[q.id];
        if (selected === undefined) continue; // unanswered → not counted in domain totals
        await client.query(
          `insert into attempt_answers (attempt_id, question_id, selected_index, is_correct)
           values ($1, $2, $3, $4)`,
          [id, q.id, selected, selected === q.answer_index],
        );
      }

      for (const rec of recommendations) {
        await client.query(
          `insert into recommendations
             (attempt_id, user_id, module_id, domain_id, priority, domain_score, threshold, reason, is_correct)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, userId, rec.moduleId, rec.domainId, rec.priority, rec.score, threshold, rec.reason, rec.isCorrect],
        );
      }
      return id;
    });

    const totalMs = Number(process.hrtime.bigint() - started) / 1e6;
    req.log.info(
      { userId, attemptId, kind: input.kind, score: scored.total, totalMs: totalMs.toFixed(1) },
      'assessment scored',
    );

    return {
      id: attemptId,
      kind: input.kind,
      total: scored.total,
      threshold,
      domainScores: scored.domainScores.map((d) => ({ domain: d.domainId, score: d.score })),
      recommendations: recommendations.map((r) => ({
        moduleSlug: r.moduleSlug,
        domain: r.domainId,
        priority: r.priority,
        score: r.score,
        reason: r.reason,
      })),
      recommendationMs: Number(recommendationMs.toFixed(2)),
      completedAt: new Date().toISOString(),
    };
  });

  // GET /assessment/attempts — history for the signed-in learner (results page)
  app.get('/attempts', async (req) => {
    const { rows } = await query<{
      id: string;
      kind: string;
      total_score: number;
      duration_ms: number | null;
      recommendation_ms: string | null;
      completed_at: Date | null;
    }>(
      `select id, kind, total_score, duration_ms, recommendation_ms, completed_at
         from assessment_attempts
        where user_id = $1 and completed_at is not null
        order by completed_at desc`,
      [req.user!.sub],
    );

    const out = [];
    for (const row of rows) {
      const scores = await query<{ domain_id: string; score: number }>(
        `select domain_id, score from domain_scores where attempt_id = $1`,
        [row.id],
      );
      out.push({
        id: row.id,
        kind: row.kind,
        total: row.total_score,
        domainScores: scores.rows.map((s) => ({ domain: s.domain_id, score: s.score })),
        durationMs: row.duration_ms,
        recommendationMs: row.recommendation_ms ? Number(row.recommendation_ms) : null,
        completedAt: row.completed_at?.toISOString() ?? null,
      });
    }
    return out;
  });

  // GET /assessment/threshold — current recommendation threshold (client rule display)
  app.get('/threshold', async () => ({ threshold: await getThreshold() }));
}
