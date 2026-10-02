import { useEffect, useMemo, useState } from 'react';
import { usePlatform } from '../contexts/PlatformContext';
import { courseIssues } from '../utils/courseValidation';
import { findModule, uniqueSlug } from '../utils/slug';
import type { LearningModule, Question } from '../types/platform';

type Lesson = LearningModule['lessons'][number];

function blankModule(): LearningModule {
  return {
    id: `m-${Date.now()}`,
    domain: 'budgeting',
    title: 'Untitled course',
    competency: '',
    summary: '',
    minutes: 10,
    passingScore: 67,
    published: false,
    onboarding: false,
    objectives: [''],
    lessons: [{ title: 'Lesson 1', paragraphs: [''], example: '' }],
    activity: { title: 'Practical activity', prompt: '' },
    quiz: [],
    resources: []
  };
}

export function blankQuestion(domain: LearningModule['domain']): Question {
  return { id: `q-${Date.now()}-${Math.round(Math.random() * 1000)}`, domain, prompt: '', options: ['', '', '', ''], answer: 0, explanation: '' };
}

export function useCourseDraft(moduleId?: string) {
  const { modules, saveModule, deleteModule } = usePlatform();
  const source = moduleId ? findModule(modules, moduleId) : undefined;
  const isNew = !moduleId;
  const [draft, setDraft] = useState<LearningModule>(() => source ?? blankModule());
  const [snapshot, setSnapshot] = useState(() => JSON.stringify(source ?? null));
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const dirty = JSON.stringify(draft) !== snapshot;
  const issues = useMemo(() => courseIssues(draft), [draft]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (patch: Partial<LearningModule>) => setDraft((d) => ({ ...d, ...patch }));

  const lessons = {
    add: () => setDraft((d) => ({ ...d, lessons: [...d.lessons, { title: `Lesson ${d.lessons.length + 1}`, paragraphs: [''], example: '' }] })),
    update: (i: number, patch: Partial<Lesson>) => setDraft((d) => ({ ...d, lessons: d.lessons.map((l, j) => j === i ? { ...l, ...patch } : l) })),
    remove: (i: number) => setDraft((d) => ({ ...d, lessons: d.lessons.filter((_, j) => j !== i) })),
    move: (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const to = i + dir;
      if (to < 0 || to >= d.lessons.length) return d;
      const next = [...d.lessons];
      [next[i], next[to]] = [next[to], next[i]];
      return { ...d, lessons: next };
    })
  };

  const quiz = {
    add: () => setDraft((d) => ({ ...d, quiz: [...d.quiz, blankQuestion(d.domain)] })),
    update: (i: number, patch: Partial<Question>) => setDraft((d) => ({ ...d, quiz: d.quiz.map((q, j) => j === i ? { ...q, ...patch } : q) })),
    remove: (i: number) => setDraft((d) => ({ ...d, quiz: d.quiz.filter((_, j) => j !== i) }))
  };

  const clean = (m: LearningModule): LearningModule => ({
    ...m,
    title: m.title.trim(),
    competency: m.competency.trim(),
    summary: m.summary.trim(),
    objectives: m.objectives.map((o) => o.trim()).filter(Boolean),
    quiz: m.quiz.map((q) => ({ ...q, domain: m.domain }))
  });

  const save = (publish?: boolean) => {
    const base = clean({ ...draft, published: publish ?? draft.published });
    // Keep an existing slug stable so shared links don't break; mint one for new courses.
    const next = { ...base, slug: base.slug || uniqueSlug(base.title, modules, base.id) };
    saveModule(next);
    setDraft(next);
    setSnapshot(JSON.stringify(next));
    setSavedAt(new Date());
    return next;
  };

  const discard = () => {
    if (source) setDraft(source);
  };

  const remove = () => deleteModule(draft.id);

  return { draft, source, isNew, dirty, issues, savedAt, update, lessons, quiz, save, discard, remove, notFound: !!moduleId && !source };
}