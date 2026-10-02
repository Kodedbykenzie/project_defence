import type { LucideIcon } from 'lucide-react';

export type Role = 'student' | 'admin';

export type Lang = 'en' | 'rw' | 'fr';

export interface LearnerPreferences {
  interests: DomainId[];
  goal: string;
  weeklyTime: string;
  style: string;
  language: Lang;
  completedAt: string;
}

export type DomainId = 'budgeting' | 'saving' | 'debt' | 'investing' | 'digital';

export interface Domain {
  id: DomainId;
  name: string;
  short: string;
  code: string;
  color: string;
  description: string;
  icon: LucideIcon;
}

export interface Question {
  id: string;
  domain: DomainId;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Lesson {
  title: string;
  paragraphs: string[];
  example: string;
}

export interface Resource {
  title: string;
  source: string;
  url: string;
}

export interface LearningModule {
  id: string;
  /** URL-safe identifier used in routes, e.g. /app/modules/emergency-saving */
  slug?: string;
  domain: DomainId;
  title: string;
  competency: string;
  summary: string;
  minutes: number;
  objectives: string[];
  lessons: Lesson[];
  activity: {title: string;prompt: string;};
  quiz: Question[];
  passingScore: number;
  resources: Resource[];
  published: boolean;
  onboarding?: boolean;
}

export type DomainScores = Record<DomainId, number>;

export interface AssessmentAttempt {
  id: string;
  kind: 'pre' | 'post';
  domainScores: DomainScores;
  total: number;
  completedAt: string;
  durationMs: number;
  recommendationMs: number;
}

export interface Recommendation {
  moduleId: string;
  domain: DomainId;
  score: number;
  priority: number;
  reason: string;
}

export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

export interface ModuleProgress {
  lessonsDone: number[];
  activityResponse: string | null;
  quizScores: number[];
  status: ModuleStatus;
}

export interface Learner {
  id: string;
  name: string;
  email: string;
  university: string;
  program: string;
  joinedAt: string;
  attempts: AssessmentAttempt[];
  progress: Record<string, ModuleProgress>;
  feedback: Record<string, number>;
  preferences?: LearnerPreferences;
}

export type CredentialStatus = 'valid' | 'revoked';

export interface Credential {
  id: string;
  learnerId: string;
  learnerName: string;
  moduleId: string;
  competency: string;
  issuedAt: string;
  status: CredentialStatus;
  verifications: number;
  hash: string;
  txHash: string;
  block: number;
}

export type SeedCredential = Omit<Credential, 'hash' | 'txHash' | 'block'>;

export interface Account {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  provider?: 'password' | 'google';
}

export type SessionUser = Omit<Account, 'password'>;

export type VerificationOutcome = 'valid' | 'revoked' | 'mismatch' | 'not_found';

export type NotificationKind = 'credential' | 'invite' | 'student' | 'assessment' | 'course' | 'system';

export interface AppNotification {
  id: string;
  /** A user id, or a whole audience. */
  recipient: string | 'admins' | 'students';
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  at: string;
  readBy: string[];
}

export interface Invite {
  id: string;
  code: string;
  email?: string;
  note?: string;
  maxUses: number | null;
  uses: number;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  redeemedBy: {id: string;name: string;at: string;}[];
}

export type InviteStatus = 'active' | 'used' | 'expired' | 'revoked';