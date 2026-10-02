import React, { useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { QuestionEditor } from '../../components/admin/QuestionEditor';
import { Modal } from '../../components/Modal';
import { domains } from '../../data/domains';
import { usePlatform } from '../../contexts/PlatformContext';
import { latest } from '../../utils/analytics';
import { weakDomains } from '../../utils/recommendation';
import { primaryButton, secondaryButton } from '../../utils/styles';
import type { DomainId, Question } from '../../types/platform';

export function AssessmentAdmin() {
  const { questions, threshold, setThreshold, learners, saveQuestion, deleteQuestion } = usePlatform();
  const [draft, setDraft] = useState(threshold);
  const [filter, setFilter] = useState<DomainId | 'all'>('all');
  const [editor, setEditor] = useState<{open: boolean;question: Question | null;}>({ open: false, question: null });
  const [toDelete, setToDelete] = useState<Question | null>(null);

  const impact = useMemo(() => {
    const pres = Object.values(learners).map((l) => latest(l, 'pre')).filter(Boolean);
    const counts = pres.map((p) => weakDomains(p!.domainScores, draft).length);
    return { learners: pres.length, withRecs: counts.filter((c) => c > 0).length, avg: counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0 };
  }, [learners, draft]);

  const shown = filter === 'all' ? questions : questions.filter((q) => q.domain === filter);

  const confirmDelete = () => {
    if (!toDelete) return;
    if (questions.filter((q) => q.domain === toDelete.domain).length <= 1) {
      toast.error('Each domain needs at least one question');
    } else {
      deleteQuestion(toDelete.id);
      toast.success('Question deleted');
    }
    setToDelete(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Assessment & rules</h1>
      <p className="mt-1 text-sm text-muted">Questions and the recommendation rule.</p>

      <section aria-labelledby="rule-heading" className="mt-8 rounded-2xl border border-line p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-md">
            <h2 id="rule-heading" className="font-semibold text-ink">
              Recommendation threshold
            </h2>
            <p className="mt-1 text-sm text-muted">Domains scoring below this are recommended, lowest first. Applies to every student’s path immediately.</p>
          </div>
          <div className="flex-1 lg:max-w-md">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={40}
                max={80}
                step={5}
                value={draft}
                onChange={(e) => setDraft(Number(e.target.value))}
                aria-label="Recommendation threshold"
                className="flex-1 accent-brand-600" />
              
              <span className="tabular w-14 text-right text-2xl font-semibold text-ink">{draft}%</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              At {draft}%, {impact.withRecs} of {impact.learners} diagnosed students get recommendations · {impact.avg.toFixed(1)} domains each on average
            </p>
          </div>
          <button
            type="button"
            disabled={draft === threshold}
            onClick={() => {
              setThreshold(draft);
              toast.success(`Threshold set to ${draft}%`);
            }}
            className={primaryButton}>
            
            Apply
          </button>
        </div>
      </section>

      <section aria-labelledby="questions-heading" className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="questions-heading" className="font-semibold text-ink">
              Diagnostic questions
            </h2>
            <p className="mt-0.5 text-sm text-muted">{questions.length} questions · also used for the post-test</p>
          </div>
          <button type="button" onClick={() => setEditor({ open: true, question: null })} className={primaryButton}>
            <PlusIcon className="h-4 w-4" /> Add question
          </button>
        </div>

        <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filter by domain">
          {[{ id: 'all' as const, name: 'All' }, ...domains].map((d) => {
            const count = d.id === 'all' ? questions.length : questions.filter((q) => q.domain === d.id).length;
            const active = filter === d.id;
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(d.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors duration-150 ${
                active ? 'bg-brand-600 text-white' : 'bg-subtle text-muted hover:text-ink'}`
                }>
                
                {d.name} <span className="tabular opacity-70">{count}</span>
              </button>);

          })}
        </div>

        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
          {shown.map((q) => {
            const domain = domains.find((d) => d.id === q.domain);
            return (
              <li key={q.id} className="flex gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-brand-700">{domain?.name}</p>
                  <p className="mt-1 text-sm font-medium text-ink">{q.prompt}</p>
                  <p className="mt-1 text-xs text-muted">
                    Correct: <span className="text-emerald-700">{q.options[q.answer]}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <button type="button" onClick={() => setEditor({ open: true, question: q })} aria-label="Edit question" className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setToDelete(q)} aria-label="Delete question" className="rounded-lg p-2 text-muted hover:bg-rose-50 hover:text-rose-600">
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                </div>
              </li>);

          })}
        </ul>
      </section>

      <QuestionEditor
        open={editor.open}
        question={editor.question}
        defaultDomain={filter === 'all' ? 'budgeting' : filter}
        onClose={() => setEditor({ open: false, question: null })}
        onSave={(q) => {
          saveQuestion(q);
          setEditor({ open: false, question: null });
          toast.success('Question saved');
        }} />
      

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this question?" description="Past results keep their scores. Future assessments won’t include it.">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setToDelete(null)} className={secondaryButton}>
            Cancel
          </button>
          <button type="button" onClick={confirmDelete} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
            Delete
          </button>
        </div>
      </Modal>
    </div>);

}