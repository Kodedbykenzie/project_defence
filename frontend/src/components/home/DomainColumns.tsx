import React from 'react';
import { domains } from '../../data/domains';
import type { DomainScores } from '../../types/platform';

interface DomainColumnsProps {
  title: string;
  summary: string;
  scores?: DomainScores;
  compare?: DomainScores;
}

export function DomainColumns({ title, summary, scores, compare }: DomainColumnsProps) {
  return (
    <section aria-labelledby="domain-columns">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="domain-columns" className="font-semibold text-ink">
          {title}
        </h2>
        <p className="text-sm text-muted">{summary}</p>
      </div>
      <div className="grid h-[188px] grid-cols-5 gap-2 rounded-2xl border border-line p-4">
        {domains.map((d) => {
          const pre = scores?.[d.id];
          const post = compare?.[d.id];
          const shown = post ?? pre;
          return (
            <div key={d.id} className="flex flex-col items-center">
              <span className={`tabular text-xs font-semibold ${shown !== undefined ? 'text-ink' : 'text-faint'}`}>{shown !== undefined ? shown : '–'}</span>
              <div className="mt-1.5 flex w-full flex-1 items-end justify-center gap-1">
                {pre !== undefined &&
                <div className={`w-full max-w-[14px] rounded-md ${post !== undefined ? 'bg-brand-200' : 'bg-brand-400'}`} style={{ height: `${Math.max(pre, 4)}%` }} title={`Diagnostic ${pre}%`} />
                }
                {post !== undefined && <div className="w-full max-w-[14px] rounded-md bg-accent-500" style={{ height: `${Math.max(post, 4)}%` }} title={`Post-test ${post}%`} />}
                {pre === undefined && <div className="h-1.5 w-full max-w-[28px] rounded-md bg-subtle" />}
              </div>
              <span className="mt-2 truncate text-[11px] text-muted">{d.short}</span>
            </div>);

        })}
      </div>
    </section>);

}