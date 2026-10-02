import React from 'react';
import { moduleHref } from '../../utils/slug';
import { Link } from 'react-router-dom';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useLearner } from '../../hooks/useLearner';
import { bestQuiz } from '../../utils/recommendation';
import { formatDate } from '../../utils/format';

export function Progress() {
  const { learner, pre, post, recommendations, credentials, platform } = useLearner();
  if (!learner) return null;

  const published = platform.modules.filter((m) => m.published);
  const recIds = new Set(recommendations.map((r) => r.moduleId));
  const recDone = recommendations.filter((r) => learner.progress[r.moduleId]?.status === 'completed').length;
  const recPct = recommendations.length ? Math.round(recDone / recommendations.length * 100) : 0;
  const attempts = [...learner.attempts].reverse();

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Progress</h1>
      <p className="mt-1 text-sm text-muted">Everything you’ve completed, in one place.</p>

      <section className="mt-8 grid divide-y divide-line rounded-2xl border border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0" aria-label="Summary">
        <div className="p-5">
          <p className="text-sm text-muted">Recommended path</p>
          <p className="tabular mt-1 text-3xl font-semibold text-ink">
            {recDone}
            <span className="text-lg text-muted">/{recommendations.length}</span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${recPct}%` }} />
          </div>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted">Knowledge score</p>
          <p className="tabular mt-1 text-3xl font-semibold text-ink">
            {pre ? `${pre.total}%` : '—'}
            {post && pre &&
            <span className="text-lg text-muted">
                {' '}
                → <span className="text-brand-700">{post.total}%</span>
              </span>
            }
          </p>
          <p className="mt-2 text-xs text-muted">{post ? 'Diagnostic → post-test' : pre ? 'Take the post-test after your path' : 'Take the diagnostic first'}</p>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted">Credentials</p>
          <p className="tabular mt-1 text-3xl font-semibold text-ink">{credentials.filter((c) => c.status === 'valid').length}</p>
          <Link to="/app/credentials" className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline">
            View credentials
          </Link>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-4 font-semibold text-ink">
          Modules
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Module</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Lessons</th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Activity</th>
                <th scope="col" className="px-4 py-3 font-medium">Best quiz</th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {published.map((m) => {
                const p = learner.progress[m.id];
                const best = bestQuiz(p);
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3.5">
                      <Link to={moduleHref(m)} className="font-medium text-ink hover:text-brand-700">
                        {m.title}
                      </Link>
                      {recIds.has(m.id) && <span className="ml-2 text-xs text-accent-600">Recommended</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={p?.status ?? 'not_started'} />
                    </td>
                    <td className="tabular hidden px-4 py-3.5 text-muted md:table-cell">
                      {p?.lessonsDone.length ?? 0}/{m.lessons.length}
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      {p?.activityResponse ? <CheckIcon className="h-4 w-4 text-emerald-600" aria-label="Done" /> : <MinusIcon className="h-4 w-4 text-faint" aria-label="Not done" />}
                    </td>
                    <td className={`tabular px-4 py-3.5 ${best !== null && best >= m.passingScore ? 'font-medium text-emerald-700' : 'text-muted'}`}>{best !== null ? `${best}%` : '—'}</td>
                    <td className="tabular hidden px-4 py-3.5 text-muted sm:table-cell">{p?.quizScores.length ?? 0}</td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 font-semibold text-ink">
          Assessment history
        </h2>
        {attempts.length === 0 ?
        <p className="text-sm text-muted">No assessments yet.</p> :

        <ul className="divide-y divide-line rounded-2xl border border-line">
            {attempts.map((a) =>
          <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm">
                <div>
                  <p className="font-medium text-ink">{a.kind === 'pre' ? 'Diagnostic' : 'Post-test'}</p>
                  <p className="text-xs text-muted">
                    {formatDate(a.completedAt)} · {Math.max(1, Math.round(a.durationMs / 60000))} min
                  </p>
                </div>
                <span className="tabular text-lg font-semibold text-ink">{a.total}%</span>
              </li>
          )}
          </ul>
        }
      </section>
    </div>);

}