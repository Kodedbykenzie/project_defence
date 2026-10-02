import React from 'react';
import { PlusIcon, SparklesIcon, XIcon } from 'lucide-react';
import { Field } from '../../ui/Field';
import { Switch } from '../../ui/Switch';
import { AutoTextarea } from '../../ui/AutoTextarea';
import { domains } from '../../../data/domains';
import { inputClass } from '../../../utils/styles';
import type { LearningModule } from '../../../types/platform';

interface OverviewPanelProps {
  draft: LearningModule;
  update: (patch: Partial<LearningModule>) => void;
}

export function OverviewPanel({ draft, update }: OverviewPanelProps) {
  return (
    <div className="space-y-8">
      <div>
        <label htmlFor="c-title" className="sr-only">
          Course title
        </label>
        <input
          id="c-title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Course title"
          className="w-full border-0 bg-transparent p-0 text-2xl font-semibold leading-tight tracking-tight text-ink placeholder:text-faint focus:outline-none focus:ring-0 sm:text-[28px]" />
        
        <AutoTextarea
          aria-label="Summary"
          value={draft.summary}
          onChange={(e) => update({ summary: e.target.value })}
          placeholder="One or two sentences that tell students what this course covers…"
          rows={2}
          className="mt-2 w-full border-0 bg-transparent p-0 text-base leading-relaxed text-muted placeholder:text-faint focus:outline-none focus:ring-0" />
        
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium leading-5 text-ink">Domain</legend>
        <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {domains.map((d) => {
            const on = draft.domain === d.id;
            return (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => update({ domain: d.id })}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium leading-5 transition-colors duration-150 ${on ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink hover:border-brand-200'}`}>
                
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white ${d.color}`}>
                  <d.icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{d.short}</span>
              </button>);

          })}
        </div>
      </fieldset>

      <Field label="Competency" htmlFor="c-comp" hint="The name printed on the micro-credential students earn.">
        <input id="c-comp" className={inputClass} value={draft.competency} onChange={(e) => update({ competency: e.target.value })} placeholder="e.g. Monthly budgeting" />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium leading-5 text-ink">Learning objectives</p>
        <ul className="space-y-2">
          {draft.objectives.map((o, i) =>
          <li key={i} className="flex items-center gap-2">
              <span className="tabular w-5 shrink-0 text-center text-xs font-semibold text-faint">{i + 1}</span>
              <input
              aria-label={`Objective ${i + 1}`}
              className={inputClass}
              value={o}
              placeholder="Students will be able to…"
              onChange={(e) => update({ objectives: draft.objectives.map((x, j) => j === i ? e.target.value : x) })} />
            
              <button
              type="button"
              aria-label={`Remove objective ${i + 1}`}
              onClick={() => update({ objectives: draft.objectives.filter((_, j) => j !== i) })}
              className="shrink-0 rounded-lg p-2 text-faint hover:bg-rose-50 hover:text-rose-600">
              
                <XIcon className="h-4 w-4" />
              </button>
            </li>
          )}
        </ul>
        <button type="button" onClick={() => update({ objectives: [...draft.objectives, ''] })} className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
          <PlusIcon className="h-4 w-4" /> Add objective
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Estimated time" htmlFor="c-min">
          <div className="relative">
            <input id="c-min" type="number" min={3} max={60} className={`${inputClass} pr-14`} value={draft.minutes} onChange={(e) => update({ minutes: Number(e.target.value) })} />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">min</span>
          </div>
        </Field>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="c-pass" className="text-sm font-medium leading-5 text-ink">
              Quiz pass mark
            </label>
            <span className="tabular text-sm font-semibold text-brand-700">{draft.passingScore}%</span>
          </div>
          <input id="c-pass" type="range" min={34} max={100} step={1} value={draft.passingScore} onChange={(e) => update({ passingScore: Number(e.target.value) })} className="mt-3 w-full accent-brand-600" />
        </div>
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line">
        <label className="flex items-center justify-between gap-4 p-4">
          <span>
            <span className="block text-sm font-medium leading-5 text-ink">Published</span>
            <span className="block text-xs leading-5 text-muted">Visible to students and used in recommendations.</span>
          </span>
          <Switch checked={draft.published} label="Published" onChange={() => update({ published: !draft.published })} />
        </label>
        <label className="flex items-center justify-between gap-4 p-4">
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium leading-5 text-ink">
              <SparklesIcon className="h-3.5 w-3.5 text-accent-600" /> Onboarding starter course
            </span>
            <span className="block text-xs leading-5 text-muted">Suggested to new students right after they pick their preferences.</span>
          </span>
          <Switch checked={!!draft.onboarding} label="Onboarding starter course" onChange={() => update({ onboarding: !draft.onboarding })} />
        </label>
      </div>
    </div>);

}