import React, { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, ArrowRightIcon, ClockIcon, LayersIcon, ListChecksIcon, LockIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { domains } from '../../data/domains';
import { useLearner } from '../../hooks/useLearner';
import { primaryButton, secondaryButton } from '../../utils/styles';

export function Assessment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { learner, pre, platform } = useLearner();
  const kind: 'pre' | 'post' = params.get('kind') === 'post' && pre ? 'post' : 'pre';
  const questions = platform.questions;
  const [stage, setStage] = useState<'intro' | 'questions' | 'submitting'>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const startedAt = useRef(0);

  if (!learner) return null;
  const q = questions[index];
  const domain = domains.find((d) => d.id === q?.domain);
  const isLast = index === questions.length - 1;
  const answered = q ? answers[q.id] !== undefined : false;

  const start = () => {
    startedAt.current = Date.now();
    setStage('questions');
  };

  const submit = () => {
    setStage('submitting');
    window.setTimeout(() => {
      const attempt = platform.submitAssessment(learner.id, kind, answers, Date.now() - startedAt.current);
      toast.success(kind === 'pre' ? 'Diagnostic complete' : 'Post-test complete', { description: `You scored ${attempt.total}% overall.` });
      navigate('/app/results', { replace: true });
    }, 800);
  };

  if (stage === 'intro') {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8 lg:py-14">
        <p className="text-sm font-medium text-brand-700">{kind === 'pre' ? 'Diagnostic assessment' : 'Post-test'}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink md:text-2xl">
          {kind === 'pre' ? 'Let’s find out where you stand' : 'See how much you’ve learned'}
        </h1>
        <p className="mt-3 text-muted">
          {kind === 'pre' ?
          'Answer honestly — this isn’t graded. Each domain gets its own score, and any domain under the threshold becomes part of your learning path.' :
          'The same five domains as your diagnostic, so we can compare your scores fairly. Your recommendations won’t change.'}
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
          { icon: ListChecksIcon, label: `${questions.length} questions` },
          { icon: ClockIcon, label: `About ${Math.max(5, Math.round(questions.length * 0.5))} minutes` },
          { icon: LayersIcon, label: `${domains.length} domains` }].
          map(({ icon: Icon, label }) =>
          <li key={label} className="flex items-center gap-2.5 text-sm text-ink">
              <Icon className="h-4 w-4 text-brand-600" aria-hidden="true" /> {label}
            </li>
          )}
        </ul>

        <div className="mt-8 flex flex-wrap gap-2">
          {domains.map((d) =>
          <span key={d.id} className="rounded-full bg-subtle px-3 py-1 text-xs text-muted">
              {d.name}
            </span>
          )}
        </div>

        {kind === 'pre' && pre &&
        <p className="mt-8 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
            You’ve already taken the diagnostic. Retaking it will replace your recommended learning path.
          </p>
        }

        <p className="mt-8 flex items-center gap-2 text-xs text-muted">
          <LockIcon className="h-3.5 w-3.5" /> We never ask about your actual finances. Answers stay in the platform database, never on-chain.
        </p>

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row">
          <Link to="/app" className={secondaryButton}>
            Not now
          </Link>
          <button type="button" onClick={start} className={`${primaryButton} sm:min-w-[180px]`}>
            Begin <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>);

  }

  if (stage === 'submitting') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-24 text-center" aria-live="polite">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="mt-5 font-medium text-ink">Scoring your five domains…</p>
        <p className="mt-1 text-sm text-muted">Applying the {platform.threshold}% threshold to build your recommendations.</p>
      </div>);

  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-5 py-6 sm:px-8 lg:py-10">
      <div className="flex items-center gap-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={index + 1} aria-valuemax={questions.length} aria-label="Assessment progress">
          <motion.div className="h-full rounded-full bg-brand-600" animate={{ width: `${(index + 1) / questions.length * 100}%` }} transition={{ duration: 0.2 }} />
        </div>
        <span className="tabular text-sm text-muted">
          {index + 1}/{questions.length}
        </span>
        <Link to="/app" aria-label="Exit assessment" className="rounded-lg p-1.5 text-muted hover:bg-subtle hover:text-ink">
          <XIcon className="h-4 w-4" />
        </Link>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="mt-10 flex-1">
          
          {domain &&
          <p className="flex items-center gap-2 text-sm text-brand-700">
              <domain.icon className="h-4 w-4" aria-hidden="true" /> {domain.name}
            </p>
          }
          <h1 id="question" className="mt-2 text-xl font-semibold leading-snug text-ink sm:text-2xl">
            {q.prompt}
          </h1>
          <div role="radiogroup" aria-labelledby="question" className="mt-7 space-y-2.5">
            {q.options.map((option, i) => {
              const selected = answers[q.id] === i;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  className={`flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left text-sm transition-colors duration-150 ${
                  selected ? 'border-brand-500 bg-brand-50 text-ink' : 'border-line bg-surface text-ink hover:border-brand-200 hover:bg-subtle'}`
                  }>
                  
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                    selected ? 'bg-brand-600 text-white' : 'bg-subtle text-muted'}`
                    }>
                    
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>);

            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="sticky bottom-0 mt-10 flex items-center justify-between gap-3 border-t border-line bg-surface py-4">
        <button type="button" onClick={() => setIndex((i) => i - 1)} disabled={index === 0} className={secondaryButton}>
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </button>
        {isLast ?
        <button type="button" onClick={submit} disabled={Object.keys(answers).length < questions.length} className={primaryButton}>
            Submit answers
          </button> :

        <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={!answered} className={primaryButton}>
            Next <ArrowRightIcon className="h-4 w-4" />
          </button>
        }
      </div>
    </div>);

}