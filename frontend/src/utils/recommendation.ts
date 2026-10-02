import { domains } from '../data/domains';
import type { DomainId, DomainScores, LearningModule, ModuleProgress, Question, Recommendation } from '../types/platform';

export const emptyProgress: ModuleProgress = { lessonsDone: [], activityResponse: null, quizScores: [], status: 'not_started' };

export function scoreAnswers(questions: Question[], answers: Record<string, number>) {
  const domainScores = {} as DomainScores;
  let correct = 0;
  domains.forEach((d) => {
    const items = questions.filter((q) => q.domain === d.id);
    const right = items.filter((q) => answers[q.id] === q.answer).length;
    correct += right;
    domainScores[d.id] = items.length ? Math.round(right / items.length * 100) : 0;
  });
  const total = questions.length ? Math.round(correct / questions.length * 100) : 0;
  return { domainScores, total };
}

export function weakDomains(scores: DomainScores, threshold: number): DomainId[] {
  return domains.
  filter((d) => scores[d.id] < threshold).
  sort((a, b) => scores[a.id] - scores[b.id]).
  map((d) => d.id);
}

export function getRecommendations(scores: DomainScores, modules: LearningModule[], threshold: number): Recommendation[] {
  const recs: Recommendation[] = [];
  weakDomains(scores, threshold).forEach((domainId) => {
    const domain = domains.find((d) => d.id === domainId);
    modules.
    filter((m) => m.domain === domainId && m.published).
    forEach((m) => {
      recs.push({
        moduleId: m.id,
        domain: domainId,
        score: scores[domainId],
        priority: recs.length + 1,
        reason: `You scored ${scores[domainId]}% in ${domain?.name ?? domainId}, below the ${threshold}% threshold.`
      });
    });
  });
  return recs;
}

/** Checks every generated recommendation against the ground-truth domain rule. */
export function validateMatch(recs: Recommendation[], scores: DomainScores, threshold: number) {
  const truth = new Set(weakDomains(scores, threshold));
  const matched = recs.filter((r) => truth.has(r.domain)).length;
  return { matched, total: recs.length };
}

export function bestQuiz(progress?: ModuleProgress) {
  return progress && progress.quizScores.length ? Math.max(...progress.quizScores) : null;
}

export function isEligible(progress: ModuleProgress | undefined, module: LearningModule) {
  if (!progress) return false;
  const best = bestQuiz(progress);
  return (
    module.lessons.every((_, i) => progress.lessonsDone.includes(i)) &&
    !!progress.activityResponse &&
    best !== null &&
    best >= module.passingScore);

}

export function progressPercent(progress: ModuleProgress | undefined, module: LearningModule) {
  if (!progress) return 0;
  const steps = module.lessons.length + 2;
  const best = bestQuiz(progress);
  const doneSteps =
  progress.lessonsDone.filter((i) => i < module.lessons.length).length + (
  progress.activityResponse ? 1 : 0) + (
  best !== null && best >= module.passingScore ? 1 : 0);
  return Math.round(doneSteps / steps * 100);
}