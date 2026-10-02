import React from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ExternalLinkIcon, LightbulbIcon } from 'lucide-react';
import { primaryButton, secondaryButton } from '../../../utils/styles';
import type { LearningModule } from '../../../types/platform';

interface LessonStepProps {
  module: LearningModule;
  index: number;
  done: boolean;
  onBack?: () => void;
  onComplete: () => void;
}

export function LessonStep({ module, index, done, onBack, onComplete }: LessonStepProps) {
  const lesson = module.lessons[index];
  const isLast = index === module.lessons.length - 1;

  return (
    <article>
      <p className="text-sm text-muted">
        Lesson {index + 1} of {module.lessons.length}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{lesson.title}</h2>

      {index === 0 &&
      <div className="mt-6 rounded-2xl border border-line p-5">
          <h3 className="text-sm font-semibold text-ink">By the end of this module you’ll be able to</h3>
          <ul className="mt-3 space-y-2">
            {module.objectives.map((o) =>
          <li key={o} className="flex gap-2.5 text-sm text-muted">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {o}
              </li>
          )}
          </ul>
        </div>
      }

      <div className="mt-6 max-w-prose space-y-4 text-[15px] leading-relaxed text-ink">
        {lesson.paragraphs.map((p) =>
        <p key={p}>{p}</p>
        )}
      </div>

      <aside className="mt-6 flex max-w-prose gap-3 rounded-2xl bg-brand-50 p-5">
        <LightbulbIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-brand-900">Example</p>
          <p className="mt-1 text-sm text-brand-900/80">{lesson.example}</p>
        </div>
      </aside>

      {isLast && module.resources.length > 0 &&
      <div className="mt-8">
          <h3 className="text-sm font-semibold text-ink">Supplementary resources (optional)</h3>
          <ul className="mt-2 space-y-1.5">
            {module.resources.map((r) =>
          <li key={r.title}>
                <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:text-brand-800 hover:underline">
                  {r.title} · {r.source} <ExternalLinkIcon className="h-3.5 w-3.5" />
                </a>
              </li>
          )}
          </ul>
        </div>
      }

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5">
        {onBack ?
        <button type="button" onClick={onBack} className={secondaryButton}>
            <ArrowLeftIcon className="h-4 w-4" /> Back
          </button> :

        <span />
        }
        <button type="button" onClick={onComplete} className={primaryButton}>
          {done ? 'Next' : 'Mark as read'} <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </article>);

}