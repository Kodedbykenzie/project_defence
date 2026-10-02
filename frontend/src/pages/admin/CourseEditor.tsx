import React, { useEffect, useState } from 'react';
import { moduleEditHref } from '../../utils/slug';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircleIcon, ArrowLeftIcon, CheckIcon, EyeIcon, LayoutListIcon, PenLineIcon, PlusIcon, FileQuestionIcon, BookOpenIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../components/Modal';
import { Field } from '../../components/ui/Field';
import { AutoTextarea } from '../../components/ui/AutoTextarea';
import { Spinner } from '../../components/ui/Spinner';
import { CoursePreview } from '../../components/admin/course/CoursePreview';
import { OverviewPanel } from '../../components/admin/course/OverviewPanel';
import { LessonPanel } from '../../components/admin/course/LessonPanel';
import { QuizPanel } from '../../components/admin/course/QuizPanel';
import { useCourseDraft } from '../../hooks/useCourseDraft';
import { inputClass, primaryButton, secondaryButton } from '../../utils/styles';

export function CourseEditor() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const c = useCourseDraft(moduleId);
  const [section, setSection] = useState('overview');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  useEffect(() => {
    const idx = section.startsWith('lesson-') ? Number(section.split('-')[1]) : -1;
    if (idx >= c.draft.lessons.length) setSection(`lesson-${c.draft.lessons.length - 1}`);
  }, [c.draft.lessons.length, section]);

  if (c.notFound) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-muted">This course doesn’t exist.</p>
        <Link to="/admin/modules" className="mt-3 inline-block text-sm font-semibold text-brand-700">
          Back to courses
        </Link>
      </div>);

  }

  const issuesFor = (key: string) => c.issues.filter((i) => i.section === key).length;

  const save = (publish: boolean) => {
    if (publish && c.issues.length) {
      toast.error('Fix the highlighted sections before publishing', { description: c.issues[0].message });
      setSection(c.issues[0].section);
      return;
    }
    setSaving(publish ? 'publish' : 'draft');
    window.setTimeout(() => {
      const saved = c.save(publish ? true : undefined);
      setSaving(null);
      toast.success(publish ? 'Course published' : 'Draft saved', { description: saved.title });
      if (c.isNew) navigate(moduleEditHref(saved), { replace: true });
    }, 450);
  };

  const outline = [
  { key: 'overview', label: 'Overview', icon: LayoutListIcon },
  ...c.draft.lessons.map((l, i) => ({ key: `lesson-${i}`, label: l.title || `Lesson ${i + 1}`, icon: BookOpenIcon })),
  { key: 'activity', label: 'Activity', icon: PenLineIcon },
  { key: 'quiz', label: `Quiz · ${c.draft.quiz.length}`, icon: FileQuestionIcon }];

  const lessonIdx = section.startsWith('lesson-') ? Number(section.split('-')[1]) : -1;

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/admin/modules" aria-label="Back to courses" className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink">
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-5 text-ink">{c.draft.title || 'Untitled course'}</p>
            <p className="flex items-center gap-1.5 text-xs leading-4 text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${c.draft.published ? 'bg-emerald-500' : 'bg-faint'}`} />
              {c.draft.published ? 'Published' : 'Draft'} ·{' '}
              {c.dirty ? <span className="text-amber-600">Unsaved changes</span> : c.savedAt ? `Saved ${c.savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'All changes saved'}
            </p>
          </div>
          <button type="button" onClick={() => setPreviewOpen(true)} className={`${secondaryButton} 2xl:hidden`} aria-label="Open preview">
            <EyeIcon className="h-4 w-4" /> <span className="hidden sm:inline">Preview</span>
          </button>
          <button type="button" onClick={() => save(false)} disabled={!!saving || !c.dirty && !c.isNew} className={`${secondaryButton} hidden sm:inline-flex`}>
            {saving === 'draft' ? <Spinner /> : null} Save draft
          </button>
          <button type="button" onClick={() => save(true)} disabled={!!saving} className={primaryButton}>
            {saving === 'publish' ? <Spinner /> : <CheckIcon className="h-4 w-4" />} {c.draft.published && !c.dirty ? 'Published' : 'Publish'}
          </button>
        </div>

        <nav aria-label="Course sections" className="thin-scroll flex gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6">
          {outline.map((o) => {
            const active = section === o.key;
            const n = issuesFor(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setSection(o.key)}
                aria-current={active ? 'step' : undefined}
                className={`relative flex max-w-[200px] shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium leading-5 transition-colors duration-150 ${
                active ? 'bg-brand-600 text-white' : 'bg-subtle text-muted hover:text-ink'}`
                }>
                
                <o.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{o.label}</span>
                {n > 0 && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-white' : 'bg-accent-500'}`} aria-label={`${n} issues`} />}
              </button>);

          })}
          <button
            type="button"
            onClick={() => {
              c.lessons.add();
              setSection(`lesson-${c.draft.lessons.length}`);
            }}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-brand-200 px-3 py-1.5 text-sm font-medium leading-5 text-brand-700 hover:bg-brand-50">
            
            <PlusIcon className="h-3.5 w-3.5" /> Lesson
          </button>
        </nav>
      </div>

      <div className="grid 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">
          {issuesFor(section) > 0 &&
          <div className="mb-6 flex gap-2.5 rounded-xl bg-accent-500/10 px-3.5 py-3 text-sm leading-5 text-accent-600">
              <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <ul>
                {c.issues.filter((i) => i.section === section).map((i) =>
              <li key={i.message}>{i.message}</li>
              )}
              </ul>
            </div>
          }

          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
              {section === 'overview' && <OverviewPanel draft={c.draft} update={c.update} />}
              {lessonIdx >= 0 && c.draft.lessons[lessonIdx] &&
              <LessonPanel
                lesson={c.draft.lessons[lessonIdx]}
                index={lessonIdx}
                total={c.draft.lessons.length}
                onChange={(p) => c.lessons.update(lessonIdx, p)}
                onMove={(dir) => {
                  c.lessons.move(lessonIdx, dir);
                  setSection(`lesson-${lessonIdx + dir}`);
                }}
                onRemove={() => {
                  c.lessons.remove(lessonIdx);
                  setSection(lessonIdx > 0 ? `lesson-${lessonIdx - 1}` : 'overview');
                }} />

              }
              {section === 'activity' &&
              <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink">Practical activity</h2>
                    <p className="mt-1.5 text-sm leading-6 text-muted">A short written task that applies the lessons to the student’s own life.</p>
                  </div>
                  <Field label="Activity title" htmlFor="a-title">
                    <input id="a-title" className={inputClass} value={c.draft.activity.title} onChange={(e) => c.update({ activity: { ...c.draft.activity, title: e.target.value } })} />
                  </Field>
                  <Field label="Prompt" htmlFor="a-prompt">
                    <AutoTextarea id="a-prompt" rows={4} className={inputClass} value={c.draft.activity.prompt} onChange={(e) => c.update({ activity: { ...c.draft.activity, prompt: e.target.value } })} />
                  </Field>
                </div>
              }
              {section === 'quiz' && <QuizPanel quiz={c.draft.quiz} passingScore={c.draft.passingScore} onAdd={c.quiz.add} onChange={c.quiz.update} onRemove={c.quiz.remove} />}
            </motion.div>
          </AnimatePresence>

          {!c.isNew &&
          <div className="mt-16 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-5 text-muted">Deleting removes the course for all students. Issued credentials stay valid.</p>
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
                <Trash2Icon className="h-4 w-4" /> Delete course
              </button>
            </div>
          }
        </div>

        <aside className="sticky top-[113px] hidden h-[calc(100dvh-140px)] border-l border-line bg-subtle p-5 2xl:block">
          <CoursePreview module={c.draft} section={section} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 px-4 sm:hidden">
        <button type="button" onClick={() => save(false)} disabled={!!saving || !c.dirty && !c.isNew} className={`${secondaryButton} w-full shadow-lg`}>
          {saving === 'draft' ? <Spinner /> : null} {c.dirty ? 'Save draft' : 'Saved'}
        </button>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Student preview" description="Switch sections in the editor to preview each step.">
        <div className="h-[560px]">
          <CoursePreview module={c.draft} section={section} />
        </div>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this course?" description="Students lose access immediately. This can’t be undone.">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmDelete(false)} className={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              c.remove();
              toast.success('Course deleted');
              navigate('/admin/modules', { replace: true });
            }}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
            
            Delete
          </button>
        </div>
      </Modal>
    </div>);

}