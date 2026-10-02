import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { defaultThreshold } from '../data/domains';
import { diagnosticQuestions } from '../data/questions';
import { initialModules } from '../data/modules';
import { seedCredentials, seedInvites, seedLearners, seedNotifications } from '../data/seed';
import { credentialHash, blockFor, hydrateCredential, newCredentialId, txHashFor } from '../utils/credential';
import { API_CONFIGURED, API_URL } from '../config/chain';
import { emptyProgress, getRecommendations, isEligible, scoreAnswers } from '../utils/recommendation';
import { inviteStatus, newInviteCode, normaliseCode } from '../utils/invite';
import { moduleHref } from '../utils/slug';
import type {
  AppNotification,
  AssessmentAttempt,
  Credential,
  CredentialStatus,
  Invite,
  LearningModule,
  Learner,
  LearnerPreferences,
  ModuleProgress,
  Question } from
'../types/platform';

interface PlatformState {
  modules: LearningModule[];
  questions: Question[];
  learners: Record<string, Learner>;
  credentials: Credential[];
  threshold: number;
  invites: Invite[];
  notifications: AppNotification[];
}

interface NewLearner {
  id: string;
  name: string;
  email: string;
  university: string;
  program: string;
  inviteCode?: string;
}

export type InviteCheck = {ok: true;invite: Invite;} | {ok: false;error: string;};

interface NewInvite {
  email?: string;
  note?: string;
  maxUses: number | null;
  days: number;
}

type NotificationInput = Omit<AppNotification, 'id' | 'at' | 'readBy'>;

interface PlatformValue extends PlatformState {
  setThreshold: (value: number) => void;
  addLearner: (input: NewLearner) => void;
  renameLearner: (id: string, name: string) => void;
  submitAssessment: (learnerId: string, kind: 'pre' | 'post', answers: Record<string, number>, durationMs: number) => AssessmentAttempt;
  completeLesson: (learnerId: string, moduleId: string, index: number) => void;
  submitActivity: (learnerId: string, moduleId: string, response: string) => void;
  submitQuiz: (learnerId: string, moduleId: string, answers: number[]) => {score: number;passed: boolean;};
  issueCredential: (learnerId: string, moduleId: string) => Promise<Credential>;
  rateModule: (learnerId: string, moduleId: string, rating: number) => void;
  setCredentialStatus: (id: string, status: CredentialStatus) => void;
  recordVerification: (id: string) => void;
  saveModule: (module: LearningModule) => void;
  deleteModule: (id: string) => void;
  savePreferences: (learnerId: string, prefs: LearnerPreferences) => void;
  toggleModule: (id: string) => void;
  saveQuestion: (question: Question) => void;
  deleteQuestion: (id: string) => void;
  checkInvite: (code: string, email?: string) => InviteCheck;
  createInvite: (input: NewInvite) => Invite;
  revokeInvite: (id: string) => void;
  extendInvite: (id: string, days: number) => void;
  markRead: (userId: string, ids: string[]) => void;
  resetPlatform: () => void;
}

const PlatformContext = createContext<PlatformValue | null>(null);

const buildInitialState = (): PlatformState => ({
  modules: initialModules,
  questions: diagnosticQuestions,
  learners: Object.fromEntries(seedLearners.map((l) => [l.id, l])),
  credentials: seedCredentials.map(hydrateCredential),
  threshold: defaultThreshold,
  invites: seedInvites,
  notifications: seedNotifications
});

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const first = (name: string) => name.split(' ')[0];

function withNotifications(prev: PlatformState, items: NotificationInput[]): PlatformState {
  const now = new Date().toISOString();
  const created = items.map((n) => ({ ...n, id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: now, readBy: [] }));
  return { ...prev, notifications: [...created, ...prev.notifications].slice(0, 200) };
}

function checkAgainst(invites: Invite[], code: string, email?: string): InviteCheck {
  const invite = invites.find((i) => i.code === normaliseCode(code));
  if (!invite) return { ok: false, error: 'That code doesn’t exist.' };
  const status = inviteStatus(invite);
  if (status === 'revoked') return { ok: false, error: 'This invite was revoked.' };
  if (status === 'expired') return { ok: false, error: 'This invite has expired.' };
  if (status === 'used') return { ok: false, error: 'This invite is fully used.' };
  if (email && invite.email && invite.email.toLowerCase() !== email.trim().toLowerCase()) return { ok: false, error: `This invite is for ${invite.email}.` };
  return { ok: true, invite };
}

export function PlatformProvider({ children }: {children: ReactNode;}) {
  const [state, setState] = usePersistentState<PlatformState>('imari:v3:platform', buildInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const notify = useCallback((items: NotificationInput[]) => setState((prev) => withNotifications(prev, items)), [setState]);

  const updateLearner = useCallback(
    (id: string, fn: (l: Learner) => Learner) =>
    setState((prev) => prev.learners[id] ? { ...prev, learners: { ...prev.learners, [id]: fn(prev.learners[id]) } } : prev),
    [setState]
  );

  const updateProgress = useCallback(
    (learnerId: string, moduleId: string, fn: (p: ModuleProgress) => ModuleProgress) => {
      const module = stateRef.current.modules.find((m) => m.id === moduleId);
      updateLearner(learnerId, (l) => {
        const next = fn(l.progress[moduleId] ?? emptyProgress);
        const status = module && isEligible(next, module) ? 'completed' : 'in_progress';
        return { ...l, progress: { ...l.progress, [moduleId]: { ...next, status } } };
      });
    },
    [updateLearner]
  );

  const value = useMemo<PlatformValue>(
    () => ({
      ...state,
      setThreshold: (threshold) => setState((prev) => ({ ...prev, threshold })),
      addLearner: ({ inviteCode, ...input }) =>
      setState((prev) => {
        const now = new Date().toISOString();
        const code = inviteCode ? normaliseCode(inviteCode) : undefined;
        let next: PlatformState = {
          ...prev,
          learners: { ...prev.learners, [input.id]: { ...input, joinedAt: now, attempts: [], progress: {}, feedback: {} } },
          invites: code ?
          prev.invites.map((i) => i.code === code ? { ...i, uses: i.uses + 1, redeemedBy: [...i.redeemedBy, { id: input.id, name: input.name, at: now }] } : i) :
          prev.invites
        };
        next = withNotifications(next, [
        { recipient: 'admins', kind: 'student', title: `${first(input.name)} joined`, body: code ? `Used invite ${code}` : input.university, link: '/admin/students' },
        { recipient: input.id, kind: 'system', title: 'Welcome to Imari', body: 'Take the diagnostic to get your path', link: '/app/assessment' }]
        );
        return next;
      }),
      renameLearner: (id, name) => updateLearner(id, (l) => ({ ...l, name })),
      submitAssessment: (learnerId, kind, answers, durationMs) => {
        const { questions, modules, threshold, learners } = stateRef.current;
        const { domainScores, total } = scoreAnswers(questions, answers);
        const t0 = performance.now();
        getRecommendations(domainScores, modules, threshold);
        const recommendationMs = Math.round((performance.now() - t0) * 100) / 100;
        const attempt: AssessmentAttempt = { id: `at-${Date.now()}`, kind, domainScores, total, completedAt: new Date().toISOString(), durationMs, recommendationMs };
        updateLearner(learnerId, (l) => ({ ...l, attempts: [...l.attempts, attempt] }));
        const name = learners[learnerId]?.name ?? 'A student';
        notify([
        { recipient: 'admins', kind: 'assessment', title: `${first(name)} finished the ${kind === 'pre' ? 'diagnostic' : 'post-test'}`, body: `Scored ${total}%`, link: '/admin/students' },
        kind === 'pre' ?
        { recipient: learnerId, kind: 'assessment', title: 'Your learning path is ready', body: `You scored ${total}%`, link: '/app/results' } :
        { recipient: learnerId, kind: 'assessment', title: 'Post-test complete', body: `You scored ${total}%`, link: '/app/progress' }]
        );
        return attempt;
      },
      completeLesson: (learnerId, moduleId, index) =>
      updateProgress(learnerId, moduleId, (p) => ({ ...p, lessonsDone: p.lessonsDone.includes(index) ? p.lessonsDone : [...p.lessonsDone, index] })),
      submitActivity: (learnerId, moduleId, response) => updateProgress(learnerId, moduleId, (p) => ({ ...p, activityResponse: response })),
      submitQuiz: (learnerId, moduleId, answers) => {
        const module = stateRef.current.modules.find((m) => m.id === moduleId);
        if (!module) return { score: 0, passed: false };
        const correct = module.quiz.filter((q, i) => answers[i] === q.answer).length;
        const score = Math.round(correct / module.quiz.length * 100);
        updateProgress(learnerId, moduleId, (p) => ({ ...p, quizScores: [...p.quizScores, score] }));
        return { score, passed: score >= module.passingScore };
      },
      issueCredential: async (learnerId, moduleId) => {
        const existing = stateRef.current.credentials.find((c) => c.learnerId === learnerId && c.moduleId === moduleId);
        if (existing) return existing;
        const learner = stateRef.current.learners[learnerId];
        const module = stateRef.current.modules.find((m) => m.id === moduleId);
        if (!learner || !module || !isEligible(learner.progress[moduleId], module)) throw new Error('Competency criteria not yet met.');
        let credential: Credential;
        if (API_CONFIGURED) {
          const slug = module.slug ?? moduleId;
          const res = await fetch(`${API_URL}/modules/${slug}/credential`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ learnerId, learnerName: learner.name, moduleId, competency: module.competency }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? 'Issuance failed');
          credential = json.credential;
        } else {
          await wait(1700);
          const base = { id: newCredentialId(), learnerId, learnerName: learner.name, moduleId, competency: module.competency, issuedAt: new Date().toISOString(), status: 'valid' as const, verifications: 0 };
          credential = { ...base, hash: credentialHash(base), txHash: txHashFor(base.id), block: blockFor(base.id) };
        }
        setState((prev) =>
        withNotifications({ ...prev, credentials: [credential, ...prev.credentials] }, [
        { recipient: learnerId, kind: 'credential', title: 'Credential issued', body: `${module.competency} · ${credential.id}`, link: '/app/credentials' },
        { recipient: 'admins', kind: 'credential', title: `${first(learner.name)} earned a credential`, body: module.competency, link: '/admin/credentials' }]
        )
        );
        return credential;
      },
      rateModule: (learnerId, moduleId, rating) => updateLearner(learnerId, (l) => ({ ...l, feedback: { ...l.feedback, [moduleId]: rating } })),
      setCredentialStatus: (id, status) => {
        if (API_CONFIGURED) {
          fetch(`${API_URL}/admin/credentials/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).catch(() => {});
        }
        setState((prev) => {
          const c = prev.credentials.find((x) => x.id === id);
          const next = { ...prev, credentials: prev.credentials.map((x) => x.id === id ? { ...x, status } : x) };
          if (!c) return next;
        return withNotifications(next, [
        { recipient: c.learnerId, kind: 'credential', title: status === 'revoked' ? 'Credential revoked' : 'Credential reinstated', body: `${c.competency} · ${c.id}`, link: '/app/credentials' }]
        );
        });
      },
      recordVerification: (id) => setState((prev) => ({ ...prev, credentials: prev.credentials.map((c) => c.id === id ? { ...c, verifications: c.verifications + 1 } : c) })),
      saveModule: (module) =>
      setState((prev) => {
        const before = prev.modules.find((m) => m.id === module.id);
        const next = { ...prev, modules: before ? prev.modules.map((m) => m.id === module.id ? module : m) : [...prev.modules, module] };
        if (module.published && !before?.published) {
          return withNotifications(next, [{ recipient: 'students', kind: 'course', title: `New: ${module.title}`, body: `${module.minutes} min · earn a credential`, link: moduleHref(module) }]);
        }
        return next;
      }),
      deleteModule: (id) => setState((prev) => ({ ...prev, modules: prev.modules.filter((m) => m.id !== id) })),
      savePreferences: (learnerId, prefs) => updateLearner(learnerId, (l) => ({ ...l, preferences: prefs })),
      toggleModule: (id) =>
      setState((prev) => {
        const m = prev.modules.find((x) => x.id === id);
        const next = { ...prev, modules: prev.modules.map((x) => x.id === id ? { ...x, published: !x.published } : x) };
        if (m && !m.published) {
          return withNotifications(next, [{ recipient: 'students', kind: 'course', title: `New: ${m.title}`, body: `${m.minutes} min · earn a credential`, link: moduleHref(m) }]);
        }
        return next;
      }),
      saveQuestion: (question) =>
      setState((prev) => ({
        ...prev,
        questions: prev.questions.some((q) => q.id === question.id) ? prev.questions.map((q) => q.id === question.id ? question : q) : [...prev.questions, question]
      })),
      deleteQuestion: (id) => setState((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== id) })),
      checkInvite: (code, email) => checkAgainst(stateRef.current.invites, code, email),
      createInvite: ({ email, note, maxUses, days }) => {
        const existing = new Set(stateRef.current.invites.map((i) => i.code));
        let code = newInviteCode();
        while (existing.has(code)) code = newInviteCode();
        const invite: Invite = {
          id: `inv-${Date.now()}`,
          code,
          email: email?.trim() || undefined,
          note: note?.trim() || undefined,
          maxUses: email ? 1 : maxUses,
          uses: 0,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
          revoked: false,
          redeemedBy: []
        };
        setState((prev) =>
        withNotifications({ ...prev, invites: [invite, ...prev.invites] }, [
        { recipient: 'admins', kind: 'invite', title: `Invite ${code} created`, body: invite.email ?? (maxUses ? `Open code · ${maxUses} uses` : 'Open code · unlimited'), link: '/admin/invites' }]
        )
        );
        return invite;
      },
      revokeInvite: (id) => setState((prev) => ({ ...prev, invites: prev.invites.map((i) => i.id === id ? { ...i, revoked: true } : i) })),
      extendInvite: (id, days) =>
      setState((prev) => ({
        ...prev,
        invites: prev.invites.map((i) => i.id === id ? { ...i, revoked: false, expiresAt: new Date(Math.max(Date.now(), new Date(i.expiresAt).getTime()) + days * 86400000).toISOString() } : i)
      })),
      markRead: (userId, ids) => {
        if (!ids.length) return;
        const set = new Set(ids);
        setState((prev) => ({ ...prev, notifications: prev.notifications.map((n) => set.has(n.id) && !n.readBy.includes(userId) ? { ...n, readBy: [...n.readBy, userId] } : n) }));
      },
      resetPlatform: () => setState(buildInitialState())
    }),
    [state, setState, updateLearner, updateProgress, notify]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used inside PlatformProvider');
  return ctx;
}