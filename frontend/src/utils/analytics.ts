import { domains } from '../data/domains';
import { average } from './format';
import { getRecommendations, isEligible, validateMatch } from './recommendation';
import type { AssessmentAttempt, Credential, DomainScores, LearningModule, Learner } from '../types/platform';

export const latest = (l: Learner, kind: 'pre' | 'post'): AssessmentAttempt | undefined => [...l.attempts].reverse().find((a) => a.kind === kind);

const avgScores = (attempts: AssessmentAttempt[]) =>
Object.fromEntries(domains.map((d) => [d.id, Math.round(average(attempts.map((a) => a.domainScores[d.id])))])) as DomainScores;

export function computeAnalytics(learners: Learner[], modules: LearningModule[], credentials: Credential[], threshold: number) {
  const withPre = learners.filter((l) => latest(l, 'pre'));
  const paired = withPre.filter((l) => latest(l, 'post'));
  const pairedPre = paired.map((l) => latest(l, 'pre')!);
  const pairedPost = paired.map((l) => latest(l, 'post')!);
  const allPre = withPre.map((l) => latest(l, 'pre')!);

  let matched = 0;
  let totalRecs = 0;
  let recCompleted = 0;
  withPre.forEach((l) => {
    const pre = latest(l, 'pre')!;
    const recs = getRecommendations(pre.domainScores, modules, threshold);
    const v = validateMatch(recs, pre.domainScores, threshold);
    matched += v.matched;
    totalRecs += v.total;
    recCompleted += recs.filter((r) => l.progress[r.moduleId]?.status === 'completed').length;
  });

  const ratings = learners.flatMap((l) => Object.values(l.feedback));
  const allAttempts = learners.flatMap((l) => l.attempts);

  const pendingIssuance = learners.flatMap((l) =>
  modules.
  filter((m) => isEligible(l.progress[m.id], m) && !credentials.some((c) => c.learnerId === l.id && c.moduleId === m.id)).
  map((m) => ({ learner: l, module: m }))
  );

  return {
    participants: learners.length,
    diagnosed: withPre.length,
    pairedCount: paired.length,
    avgPre: Math.round(average(pairedPre.map((a) => a.total))),
    avgPost: Math.round(average(pairedPost.map((a) => a.total))),
    pairedPreDomains: avgScores(pairedPre),
    pairedPostDomains: avgScores(pairedPost),
    domainGaps: domains.map((d) => ({
      domain: d,
      avg: Math.round(average(allPre.map((a) => a.domainScores[d.id]))),
      belowPct: allPre.length ? Math.round(allPre.filter((a) => a.domainScores[d.id] < threshold).length / allPre.length * 100) : 0
    })),
    accuracy: { matched, total: totalRecs, pct: totalRecs ? Math.round(matched / totalRecs * 100) : 100 },
    relevance: { avg: average(ratings), count: ratings.length },
    completion: { done: recCompleted, total: totalRecs, pct: totalRecs ? Math.round(recCompleted / totalRecs * 100) : 0 },
    credentials: {
      issued: credentials.length,
      valid: credentials.filter((c) => c.status === 'valid').length,
      revoked: credentials.filter((c) => c.status === 'revoked').length,
      verifications: credentials.reduce((s, c) => s + c.verifications, 0)
    },
    avgRecMs: average(allAttempts.map((a) => a.recommendationMs)),
    avgDurationMin: average(allAttempts.map((a) => a.durationMs)) / 60000,
    awaitingDiagnostic: learners.filter((l) => !latest(l, 'pre')),
    pendingIssuance
  };
}