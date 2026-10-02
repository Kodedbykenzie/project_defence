import React from 'react';
import { domains } from '../../data/domains';
import type { DomainScores } from '../../types/platform';

interface DomainBarsProps {
  scores: DomainScores;
  compare?: DomainScores;
  threshold: number;
  compact?: boolean;
}

/** Domain scores with the recommendation threshold drawn as a dashed line. `compare` renders a post-test overlay. */
export function DomainBars({ scores, compare, threshold, compact }: DomainBarsProps) {
  return (
    <div>
      {compare &&
      <div className="mb-4 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-brand-200" /> Pre-test
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full bg-brand-600" /> Post-test
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 border-l border-dashed border-ink/40" /> {threshold}% threshold
          </span>
        </div>
      }
      <ul className={compact ? 'space-y-3' : 'space-y-4'}>
        {domains.map((d) => {
          const pre = scores[d.id];
          const post = compare?.[d.id];
          const current = post ?? pre;
          const weak = current < threshold;
          const Icon = d.icon;
          return (
            <li key={d.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-ink">
                  <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="truncate">{d.name}</span>
                  {weak && !compact && <span className="hidden rounded-full bg-accent-500/10 px-2 py-0.5 text-[11px] font-medium text-accent-600 sm:inline">Needs work</span>}
                </span>
                <span className="tabular shrink-0 font-semibold text-ink">
                  {post !== undefined && post !== pre &&
                  <span className={`mr-2 text-xs font-medium ${post > pre ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {post > pre ? '+' : ''}
                      {post - pre}
                    </span>
                  }
                  {current}%
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-subtle" role="img" aria-label={`${d.name}: ${current}%`}>
                {post !== undefined ?
                <>
                    <div className="absolute inset-y-0 left-0 rounded-full bg-brand-200" style={{ width: `${pre}%` }} />
                    <div className="absolute inset-y-[3px] left-0 rounded-full bg-brand-600" style={{ width: `${post}%` }} />
                  </> :

                <div className={`absolute inset-y-0 left-0 rounded-full ${weak ? 'bg-accent-500' : 'bg-brand-500'}`} style={{ width: `${Math.max(pre, 2)}%` }} />
                }
                <div className="absolute -inset-y-1 border-l border-dashed border-ink/40" style={{ left: `${threshold}%` }} />
              </div>
            </li>);

        })}
      </ul>
    </div>);

}