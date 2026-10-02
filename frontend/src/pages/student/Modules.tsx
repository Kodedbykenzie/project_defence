import React from 'react';
import { moduleHref } from '../../utils/slug';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ClockIcon } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { domains } from '../../data/domains';
import { useLearner } from '../../hooks/useLearner';
import { progressPercent } from '../../utils/recommendation';
import { curateModules } from '../../utils/curation';
import { primaryButton } from '../../utils/styles';

export function Modules() {
  const { learner, pre, recommendations, platform } = useLearner();
  if (!learner) return null;

  const published = platform.modules.filter((m) => m.published);
  const recIds = new Set(recommendations.map((r) => r.moduleId));
  const curated = curateModules(published, learner.preferences).filter((c) => !recIds.has(c.module.id));
  const others = curated.map((c) => c.module);
  const reasonFor = (id: string) => curated.find((c) => c.module.id === id)?.reason;

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 lg:py-10">
      <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Learning path</h1>
      <p className="mt-1 truncate text-sm text-muted">Pass a module’s quiz to earn a credential.</p>

      <section aria-labelledby="path" className="mt-8">
        <h2 id="path" className="mb-4 font-semibold text-ink">
          Recommended for you
        </h2>
        {!pre ?
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink">Take the diagnostic and we’ll put the modules you need most at the top of this page.</p>
            <Link to="/app/assessment" className={primaryButton}>
              Start diagnostic
            </Link>
          </div> :
        recommendations.length === 0 ?
        <p className="rounded-2xl border border-line p-5 text-sm text-muted">You’re above the threshold in every domain — explore any module below.</p> :

        <ol className="space-y-3">
            {recommendations.map((rec) => {
            const module = platform.modules.find((m) => m.id === rec.moduleId);
            const domain = domains.find((d) => d.id === rec.domain);
            if (!module || !domain) return null;
            const progress = learner.progress[module.id];
            const pct = progressPercent(progress, module);
            return (
              <li key={module.id}>
                  <Link
                  to={moduleHref(module)}
                  className="group grid gap-4 rounded-2xl border border-line p-5 transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50/40 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  
                    <span className="tabular hidden h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-semibold text-white sm:flex">{rec.priority}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-xs text-brand-700">
                        <domain.icon className="h-3.5 w-3.5" aria-hidden="true" /> {domain.name}
                      </span>
                      <span className="mt-1 block font-semibold text-ink">{module.title}</span>
                      <span className="mt-1 block text-sm text-muted">{rec.reason}</span>
                      <span className="mt-3 flex items-center gap-3">
                        <span className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-subtle">
                          <span className="block h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="tabular text-xs text-muted">{pct}%</span>
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <StatusBadge status={progress?.status ?? 'not_started'} />
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <ClockIcon className="h-3.5 w-3.5" /> {module.minutes} min
                      </span>
                    </span>
                  </Link>
                </li>);

          })}
          </ol>
        }
      </section>

      {others.length > 0 &&
      <section aria-labelledby="explore" className="mt-12">
          <h2 id="explore" className="font-semibold text-ink">
            {pre ? 'Explore other modules' : 'Curated for you'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Ordered by the interests and goal you chose.{' '}
            <Link to="/onboarding?edit=1" className="font-medium text-brand-700 hover:underline">
              Update preferences
            </Link>
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {others.map((module) => {
            const domain = domains.find((d) => d.id === module.domain);
            const status = learner.progress[module.id]?.status ?? 'not_started';
            return (
              <li key={module.id}>
                  <Link to={moduleHref(module)} className="group flex h-full flex-col rounded-2xl border border-line p-4 transition-colors duration-150 hover:border-brand-200 hover:bg-subtle">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs text-muted">
                        {domain && <domain.icon className="h-3.5 w-3.5" aria-hidden="true" />} {domain?.name}
                      </span>
                      {status !== 'not_started' ?
                    <StatusBadge status={status} /> :

                    reasonFor(module.id) && <span className="whitespace-nowrap rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium leading-5 text-accent-600">{reasonFor(module.id)}</span>
                    }
                    </span>
                    <span className="mt-2 font-medium text-ink">{module.title}</span>
                    <span className="mt-1 text-sm text-muted">{module.summary}</span>
                    <span className="mt-auto flex items-center justify-between pt-4 text-xs text-muted">
                      {module.minutes} min
                      <ArrowRightIcon className="h-4 w-4 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand-700" />
                    </span>
                  </Link>
                </li>);

          })}
          </ul>
        </section>
      }
    </div>);

}