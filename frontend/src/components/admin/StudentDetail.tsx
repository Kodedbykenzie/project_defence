import React from 'react';
import { Modal } from '../Modal';
import { DomainBars } from '../ui/DomainBars';
import { StatusBadge } from '../ui/StatusBadge';
import { usePlatform } from '../../contexts/PlatformContext';
import { latest } from '../../utils/analytics';
import { getRecommendations } from '../../utils/recommendation';
import { formatDate } from '../../utils/format';
import type { Learner } from '../../types/platform';

export function StudentDetail({ learner, onClose }: {learner: Learner | null;onClose: () => void;}) {
  const { modules, credentials, threshold } = usePlatform();
  const pre = learner ? latest(learner, 'pre') : undefined;
  const post = learner ? latest(learner, 'post') : undefined;
  const recs = pre ? getRecommendations(pre.domainScores, modules, threshold) : [];
  const creds = credentials.filter((c) => c.learnerId === learner?.id);

  return (
    <Modal open={!!learner} onClose={onClose} title={learner?.name ?? ''} description={learner ? `${learner.program} · ${learner.university}` : ''} size="lg">
      {learner &&
      <div className="space-y-8">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="truncate font-medium text-ink">{learner.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Joined</dt>
              <dd className="font-medium text-ink">{formatDate(learner.joinedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Diagnostic</dt>
              <dd className="tabular font-medium text-ink">{pre ? `${pre.total}%` : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Post-test</dt>
              <dd className="tabular font-medium text-ink">{post ? `${post.total}%` : '—'}</dd>
            </div>
          </dl>

          {pre ?
        <>
              <section>
                <h3 className="mb-4 text-sm font-semibold text-ink">Domain scores</h3>
                <DomainBars scores={pre.domainScores} compare={post?.domainScores} threshold={threshold} compact />
              </section>
              <section>
                <h3 className="mb-3 text-sm font-semibold text-ink">Recommendations</h3>
                {recs.length === 0 ?
            <p className="text-sm text-muted">None — above threshold in every domain.</p> :

            <ul className="divide-y divide-line rounded-xl border border-line">
                    {recs.map((r) => {
                const m = modules.find((x) => x.id === r.moduleId);
                return (
                  <li key={r.moduleId} className="flex items-center justify-between gap-3 px-3.5 py-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{m?.title}</p>
                            <p className="text-xs text-muted">{r.reason}</p>
                          </div>
                          <StatusBadge status={learner.progress[r.moduleId]?.status ?? 'not_started'} />
                        </li>);

              })}
                  </ul>
            }
              </section>
            </> :

        <p className="rounded-xl bg-subtle p-4 text-sm text-muted">This student hasn’t taken the diagnostic yet.</p>
        }

          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink">Credentials</h3>
            {creds.length === 0 ?
          <p className="text-sm text-muted">None yet.</p> :

          <ul className="space-y-2">
                {creds.map((c) =>
            <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {c.competency} <span className="tabular text-xs text-muted">· {c.id}</span>
                    </span>
                    <StatusBadge status={c.status} />
                  </li>
            )}
              </ul>
          }
          </section>
        </div>
      }
    </Modal>);

}