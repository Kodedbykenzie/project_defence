import React, { useState } from 'react';
import { ArrowLeftIcon, PencilLineIcon } from 'lucide-react';
import { inputClass, primaryButton, secondaryButton } from '../../../utils/styles';
import type { LearningModule } from '../../../types/platform';

interface ActivityStepProps {
  module: LearningModule;
  savedResponse: string | null;
  onBack: () => void;
  onSave: (response: string) => void;
}

const MIN = 40;

export function ActivityStep({ module, savedResponse, onBack, onSave }: ActivityStepProps) {
  const [text, setText] = useState(savedResponse ?? '');
  const length = text.trim().length;

  return (
    <article>
      <p className="flex items-center gap-2 text-sm text-muted">
        <PencilLineIcon className="h-4 w-4" /> Practical activity
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{module.activity.title}</h2>
      <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink">{module.activity.prompt}</p>

      <label htmlFor="activity" className="mt-6 block text-sm font-medium text-ink">
        Your response
      </label>
      <textarea
        id="activity"
        rows={7}
        className={`${inputClass} mt-1.5 resize-y leading-relaxed`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Work it through with real numbers…" />
      
      <p className={`tabular mt-1.5 text-xs ${length >= MIN ? 'text-muted' : 'text-faint'}`}>
        {length >= MIN ? 'Looks good — only you and the pilot team can see this.' : `${MIN - length} more characters to save`}
      </p>

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5">
        <button type="button" onClick={onBack} className={secondaryButton}>
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </button>
        <button type="button" onClick={() => onSave(text.trim())} disabled={length < MIN} className={primaryButton}>
          {savedResponse ? 'Update & continue' : 'Save & continue'}
        </button>
      </div>
    </article>);

}