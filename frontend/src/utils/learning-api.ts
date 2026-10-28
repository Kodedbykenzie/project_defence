import { request } from './api';
import type {
  AssessmentAttempt,
  DomainId,
  DomainScores,
  LearningModule,
  Lesson,
  ModuleProgress,
  Question,
  Resource,
} from '../types/platform';

/**
 * The learning endpoints, plus the mappers that turn the API payloads into
 * the shapes the React components already use.
 *
 * The two data shapes are deliberately kept separate: the API speaks in
 * slugs, uuids and snake_case columns, the client speaks in domain ids and
 * camelCase. The mappers are the only place that knows the difference.
 */

export interface ApiProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  lessonsDone: number[];
  activityResponse: string | null;
  bestQuizScore: number | null;
}

export interface ApiModuleSummary {
  id: string;
  slug: string;
  domain: string;
  domainName: string;
  title: string;
  competency: string;
  summary: string | null;
  minutes: number;
  passingScore: number;
  published: boolean;
  isStarter: boolean;
  progress: ApiProgress;
  credential: { id: string; status: string; issuedAt: string } | null;
}

export interface ApiModuleDetail extends ApiModuleSummary {
  objectives: string[];
  lessons: { title: string; paragraphs: string[]; example: string | null; position: number }[];
  activity: { title: string; prompt: string };
  resources: { title: string; source: string | null; url: string }[];
  quiz: { id: string; prompt: string; options: string[]; position: number }[];
}

export interface ApiAttemptResult {
  id: string;
  kind: 'pre' | 'post';
  total: number;
  threshold: number;
  domainScores: { domain: string; score: number }[];
  recommendations: {
    moduleSlug: string;
    domain: string;
    priority: number;
    score: number;
    reason: string;
  }[];
  recommendationMs: number;
  completedAt: string;
}

export interface ApiQuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  passingScore: number;
  results: {
    questionId: string;
    correct: boolean;
    selected: number | null;
    answer: number;
    explanation: string | null;
  }[];
}

// ------------------------------------------------------------------- mappers

export function toDomainScores(rows: { domain: string; score: number }[]): DomainScores {
  const out = {} as DomainScores;
  for (const row of rows) out[row.domain as DomainId] = row.score;
  return out;
}

export function toProgress(progress: ApiProgress): ModuleProgress {
  return {
    lessonsDone: progress.lessonsDone ?? [],
    activityResponse: progress.activityResponse ?? null,
    quizScores: progress.bestQuizScore !== null ? [progress.bestQuizScore] : [],
    status: progress.status,
  };
}

export function toLesson(row: ApiModuleDetail['lessons'][number]): Lesson {
  return { title: row.title, paragraphs: row.paragraphs ?? [], example: row.example ?? '' };
}

export function toResource(row: ApiModuleDetail['resources'][number]): Resource {
  return { title: row.title, source: row.source ?? '', url: row.url };
}

/** A diagnostic question. The answer key is never sent to a student. */
export function toQuestion(row: { id: string; domain: string; prompt: string; options: string[] }): Question {
  return {
    id: row.id,
    domain: row.domain as DomainId,
    prompt: row.prompt,
    options: row.options,
    answer: undefined,
    explanation: undefined,
  };
}

/** A module quiz question. The question inherits the module's domain
 * because the API never sends a per-question domain. */
export function toQuizQuestion(row: { id: string; prompt: string; options: string[] }, domain: DomainId): Question {
  return {
    id: row.id,
    domain,
    prompt: row.prompt,
    options: row.options,
    answer: undefined,
    explanation: undefined,
  };
}

/**
 * Build a full LearningModule from the API. The module list endpoint does
 * not carry the lesson body, so the detail endpoint is used instead.
 */
export function toLearningModule(detail: ApiModuleDetail): LearningModule {
  return {
    id: detail.id,
    slug: detail.slug,
    domain: detail.domain as DomainId,
    title: detail.title,
    competency: detail.competency,
    summary: detail.summary ?? '',
    minutes: detail.minutes,
    objectives: detail.objectives ?? [],
    lessons: (detail.lessons ?? []).sort((a, b) => a.position - b.position).map(toLesson),
    activity: detail.activity ?? { title: '', prompt: '' },
    quiz: (detail.quiz ?? []).sort((a, b) => a.position - b.position).map((q) => toQuizQuestion(q, detail.domain as DomainId)),
    passingScore: detail.passingScore,
    resources: (detail.resources ?? []).map(toResource),
    published: detail.published,
    onboarding: detail.isStarter,
  };
}

export function toAttempt(result: ApiAttemptResult, durationMs: number): AssessmentAttempt {
  return {
    id: result.id,
    kind: result.kind,
    domainScores: toDomainScores(result.domainScores),
    total: result.total,
    completedAt: result.completedAt,
    durationMs,
    recommendationMs: result.recommendationMs,
  };
}

// ------------------------------------------------------------------ requests

export const learningApi = {
  async listModules(): Promise<ApiModuleSummary[]> {
    return request<ApiModuleSummary[]>('/v1/modules');
  },

  async getModule(slug: string): Promise<ApiModuleDetail> {
    return request<ApiModuleDetail>(`/v1/modules/${encodeURIComponent(slug)}`);
  },

  async listDiagnostic(): Promise<{ id: string; domain: string; prompt: string; options: string[] }[]> {
    const body = await request<{ questions: { id: string; domain: string; prompt: string; options: string[] }[] }>(
      '/v1/assessment/diagnostic',
    );
    return body.questions;
  },

  async listAttempts(): Promise<
    {
      id: string;
      kind: 'pre' | 'post';
      total: number;
      domainScores: { domain: string; score: number }[];
      durationMs: number | null;
      recommendationMs: number | null;
      completedAt: string | null;
    }[]
  > {
    return request('/v1/assessment/attempts');
  },

  async submitAttempt(input: {
    kind: 'pre' | 'post';
    answers: Record<string, number>;
    durationMs: number;
  }): Promise<ApiAttemptResult> {
    return request<ApiAttemptResult>('/v1/assessment/attempts', {
      method: 'POST',
      body: input,
    });
  },

  async completeLesson(slug: string, index: number): Promise<ApiProgress> {
    return request<ApiProgress>(`/v1/modules/${encodeURIComponent(slug)}/lessons/${index}/complete`, {
      method: 'POST',
    });
  },

  async submitActivity(slug: string, response: string): Promise<ApiProgress> {
    return request<ApiProgress>(`/v1/modules/${encodeURIComponent(slug)}/activity`, {
      method: 'POST',
      body: { response },
    });
  },

  async submitQuiz(slug: string, answers: number[]): Promise<ApiQuizResult> {
    return request<ApiQuizResult>(`/v1/modules/${encodeURIComponent(slug)}/quiz`, {
      method: 'POST',
      body: { answers },
    });
  },

  async issueCredential(slug: string, body: { learnerId?: string; learnerName?: string }) {
    return request<any>(`/v1/modules/${encodeURIComponent(slug)}/credential`, {
      method: 'POST',
      body,
    });
  },

  async listCredentials(): Promise<
    {
      id: string;
      learnerName: string;
      moduleTitle: string;
      moduleSlug: string;
      competency: string;
      status: string;
      hash: string;
      txHash: string | null;
      block: number | null;
      issuedAt: string;
    }[]
  > {
    return request('/v1/admin/credentials');
  },

  /** The signed-in learner's own credentials. */
  async listMyCredentials(): Promise<
    {
      id: string;
      moduleId: string;
      moduleTitle: string;
      moduleSlug: string;
      competency: string;
      holderName: string;
      hash: string;
      txHash: string | null;
      block: number | null;
      status: string;
      issuedAt: string;
    }[]
  > {
    return request('/v1/me/credentials');
  },

  async getMe(): Promise<{
    user: { id: string; email: string; name: string; role: string; provider: string; emailVerified: boolean };
    preferences: {
      language: string;
      textSize: string;
      reduceMotion: boolean;
      railOpen: boolean;
      interests: string[];
      goal: string | null;
      weeklyTime: string | null;
      learningStyle: string | null;
      toastsEnabled: boolean;
      mutedKinds: string[];
      emailDigest: string;
      completedAt: string | null;
    };
    profile: {
      university: string | null;
      programme: string | null;
      researchConsent: boolean;
      consentVersion: string | null;
      onboardedAt: string | null;
    };
  }> {
    return request('/v1/me');
  },

  async savePreferences(prefs: {
    language?: string;
    interests?: string[];
    goal?: string | null;
    weeklyTime?: string | null;
    learningStyle?: string | null;
    completedAt?: string;
  }): Promise<void> {
    await request('/v1/me/preferences', { method: 'PUT', body: prefs });
  },
};
