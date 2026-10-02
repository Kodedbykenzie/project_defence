import React, { useState } from 'react';
import { ArrowRightIcon, CheckCircle2Icon, RotateCcwIcon, XCircleIcon } from 'lucide-react';
import { primaryButton, secondaryButton } from '../../../utils/styles';
import type { LearningModule } from '../../../types/platform';

interface QuizStepProps {
  module: LearningModule;
  bestScore: number | null;
  onSubmit: (answers: number[]) => {score: number;passed: boolean;};
  onContinue: () => void;
}

export function QuizStep({ module, bestScore, onSubmit, onContinue }: QuizStepProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => module.quiz.map(() => null));
  const [result, setResult] = useState<{score: number;passed: boolean;} | null>(null);
  const allAnswered = answers.every((a) => a !== null);

  const submit = () => setResult(onSubmit(answers as number[]));
  const retry = () => {
    setAnswers(module.quiz.map(() => null));
    setResult(null);
  };

  return (
    <article>
      <p className="text-sm text-muted">
        Competency quiz · pass mark {module.passingScore}%{bestScore !== null ? ` · your best ${bestScore}%` : ''}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Check your understanding</h2>

      {result &&
      <div
        role="status"
        className={`mt-6 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between ${result.passed ? 'bg-emerald-50' : 'bg-accent-500/10'}`}>
        
          <div>
            <p className={`text-lg font-semibold ${result.passed ? 'text-emerald-800' : 'text-accent-600'}`}>
              {result.passed ? 'Passed' : 'Not quite'} · {result.score}%
            </p>
            <p className="text-sm text-muted">{result.passed ? 'You’ve demonstrated this competency.' : 'Review the explanations below, then try again.'}</p>
          </div>
          {result.passed ?
        <button type="button" onClick={onContinue} className={primaryButton}>
              Continue <ArrowRightIcon className="h-4 w-4" />
            </button> :

        <button type="button" onClick={retry} className={secondaryButton}>
              <RotateCcwIcon className="h-4 w-4" /> Try again
            </button>
        }
        </div>
      }

      <ol className="mt-8 space-y-8">
        {module.quiz.map((q, qi) =>
        <li key={q.id}>
            <p id={`q-${q.id}`} className="font-medium text-ink">
              {qi + 1}. {q.prompt}
            </p>
            <div role="radiogroup" aria-labelledby={`q-${q.id}`} className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((option, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = oi === q.answer;
              let tone = selected ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-brand-200 hover:bg-subtle';
              if (result) {
                if (isCorrect) tone = 'border-emerald-400 bg-emerald-50';else
                if (selected) tone = 'border-rose-300 bg-rose-50';else
                tone = 'border-line opacity-60';
              }
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!!result}
                  onClick={() => setAnswers((a) => a.map((v, i) => i === qi ? oi : v))}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-sm text-ink transition-colors duration-150 ${tone}`}>
                  
                    {option}
                    {result && isCorrect && <CheckCircle2Icon className="h-4 w-4 shrink-0 text-emerald-600" />}
                    {result && selected && !isCorrect && <XCircleIcon className="h-4 w-4 shrink-0 text-rose-500" />}
                  </button>);

            })}
            </div>
            {result && <p className="mt-2 text-sm text-muted">{q.explanation}</p>}
          </li>
        )}
      </ol>

      {!result &&
      <div className="mt-10 flex justify-end border-t border-line pt-5">
          <button type="button" onClick={submit} disabled={!allAnswered} className={primaryButton}>
            Submit quiz
          </button>
        </div>
      }
    </article>);

}