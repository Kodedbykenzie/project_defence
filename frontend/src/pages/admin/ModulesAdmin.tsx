import React from 'react';
import { moduleEditHref } from '../../utils/slug';
import { Link } from 'react-router-dom';
import { PencilIcon, PlusIcon, SparklesIcon, StarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../../components/ui/Switch';
import { domains } from '../../data/domains';
import { usePlatform } from '../../contexts/PlatformContext';
import { average } from '../../utils/format';
import { ghostButton, primaryButton } from '../../utils/styles';

export function ModulesAdmin() {
  const { modules, learners, toggleModule } = usePlatform();
  const all = Object.values(learners);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-ink md:text-2xl">Courses</h1>
          <p className="mt-1 truncate text-sm text-muted">Edit with a live student preview.</p>
        </div>
        <Link to="/admin/modules/new" className={`${primaryButton} shrink-0`}>
          <PlusIcon className="h-4 w-4" /> New course
        </Link>
      </div>

      <ul className="mt-8 divide-y divide-line rounded-2xl border border-line">
        {modules.map((m) => {
          const domain = domains.find((d) => d.id === m.domain);
          const completions = all.filter((l) => l.progress[m.id]?.status === 'completed').length;
          const started = all.filter((l) => l.progress[m.id]).length;
          const ratings = all.map((l) => l.feedback[m.id]).filter((r): r is number => typeof r === 'number');
          return (
            <li key={m.id} className="flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 gap-3.5">
                {domain &&
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${domain.color}`}>
                    <domain.icon className="h-5 w-5" />
                  </span>
                }
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs leading-4 text-muted">
                    {domain?.name}
                    {m.onboarding &&
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 font-medium text-accent-600">
                        <SparklesIcon className="h-3 w-3" /> Starter
                      </span>
                    }
                  </p>
                  <Link to={moduleEditHref(m)} className={`mt-1 block font-medium leading-6 hover:text-brand-700 ${m.published ? 'text-ink' : 'text-muted'}`}>
                    {m.title}
                  </Link>
                  <p className="mt-0.5 text-xs leading-5 text-muted">
                    {m.lessons.length} lessons · {m.quiz.length} quiz questions · pass {m.passingScore}% · {m.minutes} min
                  </p>
                </div>
              </div>
              <dl className="flex gap-6 text-sm md:w-[200px] md:justify-end">
                <div>
                  <dt className="text-xs leading-4 text-muted">Completed</dt>
                  <dd className="tabular mt-0.5 font-semibold leading-5 text-ink">
                    {completions}
                    <span className="font-normal text-muted">/{started}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs leading-4 text-muted">Relevance</dt>
                  <dd className="tabular mt-0.5 flex items-center gap-1 font-semibold leading-5 text-ink">
                    {ratings.length ?
                    <>
                        <StarIcon className="h-3.5 w-3.5 fill-accent-500 text-accent-500" /> {average(ratings).toFixed(1)}
                      </> :

                    '—'
                    }
                  </dd>
                </div>
              </dl>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <Switch
                    checked={m.published}
                    label={`Publish ${m.title}`}
                    onChange={() => {
                      toggleModule(m.id);
                      toast(m.published ? 'Course hidden' : 'Course published', { description: m.title });
                    }} />
                  
                  <span className="w-[70px]">{m.published ? 'Published' : 'Hidden'}</span>
                </label>
                <Link to={moduleEditHref(m)} className={ghostButton}>
                  <PencilIcon className="h-4 w-4" /> Edit
                </Link>
              </div>
            </li>);

        })}
      </ul>
    </div>);

}