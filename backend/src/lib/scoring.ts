import { query } from '../db.js';

/**
 * Server-side scoring & recommendation rule — mirrors
 * frontend/src/utils/recommendation.ts exactly (README § Recommendation rule):
 *   score[d]  = round(correct[d] / total[d] * 100)
 *   weak      = domains where score < threshold, ascending by score
 *   recs      = published modules in weak domains, priority = 1..n
 *   is_correct = module.domain ∈ weak   (ground truth for the accuracy metric)
 */

export interface DiagnosticQuestion {
  id: string;
  domain_id: string;
  prompt: string;
  options: unknown;
  answer_index: number;
  explanation: string | null;
}

export interface DomainScoreRow {
  domainId: string;
  correct: number;
  total: number;
  score: number;
}

export interface RecommendationDraft {
  moduleId: string;
  moduleSlug: string;
  domainId: string;
  score: number;
  priority: number;
  reason: string;
  isCorrect: boolean;
}

export async function getThreshold(): Promise<number> {
  const { rows } = await query<{ value: unknown }>(
    `select value from platform_settings where key = 'recommendation.threshold'`,
  );
  const raw = rows[0]?.value;
  const n = typeof raw === 'number' ? raw : Number(typeof raw === 'string' ? raw : NaN);
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : 60;
}

/** Active diagnostic items (module_id IS NULL), answers included — server eyes only. */
export async function loadDiagnostic(): Promise<DiagnosticQuestion[]> {
  const { rows } = await query<DiagnosticQuestion>(
    `select id, domain_id, prompt, options, answer_index, explanation
       from questions
      where module_id is null and active
      order by position, id`,
  );
  return rows;
}

export interface ScoreResult {
  domainScores: DomainScoreRow[];
  total: number;
}

/** per-domain round(correct/total*100); total = round(allCorrect/all*100) */
export function scoreAnswers(
  questions: DiagnosticQuestion[],
  answers: Record<string, number>,
  domainIds: string[],
): ScoreResult {
  const domainScores: DomainScoreRow[] = [];
  let allCorrect = 0;
  for (const domainId of domainIds) {
    const items = questions.filter((q) => q.domain_id === domainId);
    const right = items.filter((q) => answers[q.id] === q.answer_index).length;
    allCorrect += right;
    domainScores.push({
      domainId,
      correct: right,
      total: items.length,
      score: items.length ? Math.round((right / items.length) * 100) : 0,
    });
  }
  const total = questions.length ? Math.round((allCorrect / questions.length) * 100) : 0;
  return { domainScores, total };
}

/**
 * Published modules in weak domains, weakest domain first.
 * SQL ORDER BY keeps module order stable within a domain (created_at, slug).
 */
export async function buildRecommendations(
  domainScores: DomainScoreRow[],
  threshold: number,
): Promise<RecommendationDraft[]> {
  const weak = domainScores
    .filter((d) => d.score < threshold)
    .sort((a, b) => a.score - b.score);
  if (!weak.length) return [];

  const weakIds = weak.map((d) => d.domainId);
  const scoreBy = new Map(weak.map((d) => [d.domainId, d.score]));
  const { rows } = await query<{
    id: string;
    slug: string;
    domain_id: string;
    domain_name: string;
  }>(
    `select m.id, m.slug, m.domain_id, d.name as domain_name
       from modules m
       join domains d on d.id = m.domain_id
      where m.published and m.domain_id = any($1)
      order by array_position($2::text[], m.domain_id), m.created_at, m.slug`,
    [weakIds, weakIds],
  );

  const weakSet = new Set(weakIds);
  let priority = 0;
  return rows.map((m) => {
    const score = scoreBy.get(m.domain_id) ?? 0;
    priority += 1;
    return {
      moduleId: m.id,
      moduleSlug: m.slug,
      domainId: m.domain_id,
      score,
      priority,
      reason: `You scored ${score}% in ${m.domain_name}, below the ${threshold}% threshold.`,
      isCorrect: weakSet.has(m.domain_id), // ground-truth rule
    };
  });
}
