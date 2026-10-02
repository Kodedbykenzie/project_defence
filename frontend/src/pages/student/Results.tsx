import React from 'react';
import { moduleHref } from '../../utils/slug';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ClipboardCheckIcon, RotateCcwIcon, TrendingUpIcon } from 'lucide-react';
import { DomainBars } from '../../components/ui/DomainBars';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { domains } from '../../data/domains';
import { useLearner } from '../../hooks/useLearner';
import { formatDate } from '../../utils/format';
import { primaryButton, secondaryButton } from '../../utils/styles';

export function Results() {
  const { learner, pre, post, recommendations, platform } = useLearner();
  if (!learner) return null;

  if (!pre) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <EmptyState
          icon={ClipboardCheckIcon}
          title="No results yet"
          description="Take the diagnostic to see your score in each domain and get a personalised learning path."
          action={<Link to="/app/assessment" className={primaryButton}>Start diagnostic</Link>} />
        
      </div>);

  }

  const pathDone = recommendations.length > 0 && recommendations.every((r) => learner.progress[r.moduleId]?.status === 'completed');
  const gain = post ? post.total - pre.total : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">Diagnostic taken {formatDate(pre.completedAt)}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink md:text-2xl">Your results</h1>
        </div>
        <div className="flex items-end gap-8">
          <div>
            <p className="text-xs text-muted">Diagnostic</p>
            <p className="tabular text-4xl font-semibold tracking-tight text-ink">{pre.total}%</p>
          </div>
          {post && gain !== null &&
          <div>
              <p className="text-xs text-muted">Post-test</p>
              <p className="tabular text-4xl font-semibold tracking-tight text-brand-700">
                {post.total}%
                <span className={`ml-2 text-base font-medium ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {gain >= 0 ? '+' : ''}
                  {gain}
                </span>
              </p>
            </div>
          }
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="domains-heading">
          <h2 id="domains-heading" className="mb-5 font-semibold text-ink">
            Score by domain
          </h2>
          <DomainBars scores={pre.domainScores} compare={post?.domainScores} threshold={platform.threshold} />

          <div className="mt-8 rounded-2xl bg-subtle p-5 text-sm">
            <h3 className="font-semibold text-ink">How your recommendations were chosen</h3>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted">
              <li>Each question belongs to one domain; we score each domain as a percentage.</li>
              <li>Any domain under {platform.threshold}% is marked as needing further learning.</li>
              <li>Modules for those domains are recommended, lowest score first.</li>
            </ol>
            <p className="tabular mt-3 text-xs text-faint">Recommendations generated in {pre.recommendationMs} ms</p>
          </div>
        </section>

        <section aria-labelledby="recs-heading">
          <h2 id="recs-heading" className="mb-4 font-semibold text-ink">
            Recommended for you
          </h2>
          {recommendations.length === 0 ?
          <p className="rounded-2xl border border-line p-5 text-sm text-muted">
              You scored at or above {platform.threshold}% in every domain. No modules are required, but you can explore any of them.
            </p> :

          <ol className="space-y-3">
              {recommendations.map((rec) => {
              const module = platform.modules.find((m) => m.id === rec.moduleId);
              const domain = domains.find((d) => d.id === rec.domain);
              if (!module || !domain) return null;
              return (
                <li key={rec.moduleId}>
                    <Link to={moduleHref(module)} className="group flex gap-4 rounded-2xl border border-line p-4 transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50/50">
                      <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{rec.priority}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">{module.title}</span>
                          <StatusBadge status={learner.progress[module.id]?.status ?? 'not_started'} />
                        </span>
                        <span className="mt-1 block text-sm text-muted">{rec.reason}</span>
                      </span>
                      <ArrowRightIcon className="mt-1 h-4 w-4 shrink-0 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand-700" />
                    </Link>
                  </li>);

            })}
            </ol>
          }

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            {pathDone && !post &&
            <Link to="/app/assessment?kind=post" className={primaryButton}>
                <TrendingUpIcon className="h-4 w-4" /> Take post-test
              </Link>
            }
            <Link to="/app/assessment" className={secondaryButton}>
              <RotateCcwIcon className="h-4 w-4" /> Retake diagnostic
            </Link>
          </div>
        </section>
      </div>
    </div>);

}