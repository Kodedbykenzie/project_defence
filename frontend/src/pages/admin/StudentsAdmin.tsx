import React, { useMemo, useState } from 'react';
import { ChevronRightIcon, SearchIcon } from 'lucide-react';
import { Avatar } from '../../components/Avatar';
import { StudentDetail } from '../../components/admin/StudentDetail';
import { usePlatform } from '../../contexts/PlatformContext';
import { latest } from '../../utils/analytics';
import { getRecommendations } from '../../utils/recommendation';
import { initialsOf } from '../../utils/format';
import { inputClass } from '../../utils/styles';
import type { Learner } from '../../types/platform';

export function StudentsAdmin() {
  const { learners, modules, credentials, threshold } = usePlatform();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Learner | null>(null);

  const rows = useMemo(
    () =>
    Object.values(learners).
    filter((l) => `${l.name} ${l.email} ${l.university}`.toLowerCase().includes(query.trim().toLowerCase())).
    map((l) => {
      const pre = latest(l, 'pre');
      const post = latest(l, 'post');
      const recs = pre ? getRecommendations(pre.domainScores, modules, threshold) : [];
      return {
        learner: l,
        pre,
        post,
        recs: recs.length,
        done: recs.filter((r) => l.progress[r.moduleId]?.status === 'completed').length,
        creds: credentials.filter((c) => c.learnerId === l.id && c.status === 'valid').length
      };
    }).
    sort((a, b) => a.learner.name.localeCompare(b.learner.name)),
    [learners, modules, credentials, threshold, query]
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Students</h1>
          <p className="mt-1 text-sm text-muted">{Object.keys(learners).length} registered participants</p>
        </div>
        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input type="search" aria-label="Search students" placeholder="Search by name, email or university" className={`${inputClass} pl-10`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Student</th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">University</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Diagnostic</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-medium sm:table-cell">Post-test</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">Path</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">Credentials</th>
              <th scope="col" className="w-10 px-2 py-3"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ learner, pre, post, recs, done, creds }) => {
              const gain = pre && post ? post.total - pre.total : null;
              return (
                <tr key={learner.id} onClick={() => setSelected(learner)} className="cursor-pointer transition-colors duration-150 hover:bg-subtle">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setSelected(learner)} className="flex items-center gap-3 text-left">
                      <Avatar initials={initialsOf(learner.name)} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">{learner.name}</span>
                        <span className="block truncate text-xs text-muted">{learner.email}</span>
                      </span>
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-muted lg:table-cell">{learner.university}</td>
                  <td className={`tabular px-4 py-3 text-right font-medium ${pre ? pre.total < threshold ? 'text-accent-600' : 'text-ink' : 'text-faint'}`}>{pre ? `${pre.total}%` : '—'}</td>
                  <td className="tabular hidden px-4 py-3 text-right sm:table-cell">
                    {post ?
                    <>
                        <span className="font-medium text-ink">{post.total}%</span>
                        {gain !== null && <span className={`ml-1.5 text-xs ${gain >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{gain >= 0 ? '+' : ''}{gain}</span>}
                      </> :

                    <span className="text-faint">—</span>
                    }
                  </td>
                  <td className="tabular hidden px-4 py-3 text-right text-muted md:table-cell">{pre ? `${done}/${recs}` : '—'}</td>
                  <td className="tabular hidden px-4 py-3 text-right text-ink md:table-cell">{creds}</td>
                  <td className="px-2 py-3 text-faint">
                    <ChevronRightIcon className="h-4 w-4" />
                  </td>
                </tr>);

            })}
            {rows.length === 0 &&
            <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No students match “{query}”.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <StudentDetail learner={selected} onClose={() => setSelected(null)} />
    </div>);

}