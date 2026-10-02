import React from 'react';
import { CheckIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { AutoTextarea } from '../../ui/AutoTextarea';
import { inputClass } from '../../../utils/styles';
import type { Question } from '../../../types/platform';

interface QuizPanelProps {
  quiz: Question[];
  passingScore: number;
  onAdd: () => void;
  onChange: (i: number, patch: Partial<Question>) => void;
  onRemove: (i: number) => void;
}

export function QuizPanel({ quiz, passingScore, onAdd, onChange, onRemove }: QuizPanelProps) {
  const needed = Math.ceil(passingScore / 100 * quiz.length);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink">Competency quiz</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          {quiz.length ? `Students need ${needed} of ${quiz.length} correct (${passingScore}%) to unlock the credential.` : 'Add questions that prove the competency.'}
        </p>
      </div>

      <ol className="space-y-4">
        {quiz.map((q, i) =>
        <li key={q.id} className="rounded-2xl border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="tabular flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
              <button type="button" onClick={() => onRemove(i)} aria-label={`Delete question ${i + 1}`} className="rounded-lg p-2 text-faint hover:bg-rose-50 hover:text-rose-600">
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
            <AutoTextarea
            aria-label={`Question ${i + 1}`}
            value={q.prompt}
            onChange={(e) => onChange(i, { prompt: e.target.value })}
            rows={1}
            placeholder="Ask a question…"
            className="mt-3 w-full border-0 bg-transparent p-0 text-base font-medium leading-7 text-ink placeholder:text-faint focus:outline-none focus:ring-0" />
          
            <div className="mt-3 space-y-2" role="radiogroup" aria-label={`Correct answer for question ${i + 1}`}>
              {q.options.map((o, oi) => {
              const correct = q.answer === oi;
              return (
                <div key={oi} className={`flex items-center gap-2 rounded-xl border pl-1.5 transition-colors duration-150 ${correct ? 'border-emerald-300 bg-emerald-50/60' : 'border-line'}`}>
                    <button
                    type="button"
                    role="radio"
                    aria-checked={correct}
                    aria-label={`Mark option ${String.fromCharCode(65 + oi)} correct`}
                    onClick={() => onChange(i, { answer: oi })}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-colors duration-150 ${correct ? 'bg-emerald-500 text-white' : 'bg-subtle text-muted hover:text-ink'}`}>
                    
                      {correct ? <CheckIcon className="h-3.5 w-3.5" /> : String.fromCharCode(65 + oi)}
                    </button>
                    <input
                    aria-label={`Option ${String.fromCharCode(65 + oi)}`}
                    value={o}
                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    onChange={(e) => onChange(i, { options: q.options.map((x, j) => j === oi ? e.target.value : x) })}
                    className="h-11 min-w-0 flex-1 border-0 bg-transparent pr-3 text-sm leading-5 text-ink placeholder:text-faint focus:outline-none focus:ring-0" />
                  
                  </div>);

            })}
            </div>
            <input
            aria-label={`Explanation for question ${i + 1}`}
            value={q.explanation}
            onChange={(e) => onChange(i, { explanation: e.target.value })}
            placeholder="Explain the right answer (shown after answering)"
            className={`${inputClass} mt-3`} />
          
          </li>
        )}
      </ol>

      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-200 py-4 text-sm font-medium text-brand-700 transition-colors duration-150 hover:bg-brand-50">
        
        <PlusIcon className="h-4 w-4" /> Add question
      </button>
    </div>);

}