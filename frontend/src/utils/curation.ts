import { goals } from '../data/onboarding';
import type { LearnerPreferences, LearningModule } from '../types/platform';

export interface CuratedModule {
  module: LearningModule;
  score: number;
  reason: string | null;
}

/** Orders published modules by how well they match the learner's onboarding preferences. */
export function curateModules(modules: LearningModule[], prefs?: LearnerPreferences): CuratedModule[] {
  const goalDomain = goals.find((g) => g.id === prefs?.goal)?.domain;
  return modules.
  filter((m) => m.published).
  map((m) => {
    const interest = !!prefs?.interests.includes(m.domain);
    const goal = goalDomain === m.domain;
    const score = (goal ? 4 : 0) + (interest ? 3 : 0) + (m.onboarding ? 1 : 0);
    const reason = goal ? 'Matches your goal' : interest ? 'Matches your interests' : m.onboarding ? 'Starter course' : null;
    return { module: m, score, reason };
  }).
  sort((a, b) => b.score - a.score);
}