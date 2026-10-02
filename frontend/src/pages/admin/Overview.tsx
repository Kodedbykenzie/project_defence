import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, AwardIcon, FilePlusIcon, LibraryIcon, UsersIcon } from 'lucide-react';
import { HomeHeader } from '../../components/home/HomeHeader';
import { SpotlightCard } from '../../components/home/SpotlightCard';
import { ScoreStrip } from '../../components/home/ScoreStrip';
import { DomainColumns } from '../../components/home/DomainColumns';
import { Avatar } from '../../components/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { usePlatform } from '../../contexts/PlatformContext';
import { computeAnalytics } from '../../utils/analytics';
import { initialsOf } from '../../utils/format';

export function AdminOverview() {
  const { user } = useAuth();
  const { learners, modules, credentials, threshold } = usePlatform();
  const a = useMemo(() => computeAnalytics(Object.values(learners), modules, credentials, threshold), [learners, modules, credentials, threshold]);
  const gain = a.avgPost - a.avgPre;
  const recent = [...credentials].sort((x, y) => y.issuedAt.localeCompare(x.issuedAt)).slice(0, 5);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-6 sm:px-6 lg:px-10 lg:py-10">
      <HomeHeader
        name={user?.name.split(' ')[0] ?? ''}
        stats={[
        { value: a.participants, label: 'participants', to: '/admin/students' },
        { value: a.pairedCount, label: 'paired tests', to: '/admin/students' },
        { value: a.pendingIssuance.length + a.awaitingDiagnostic.length, label: 'need attention', to: '/admin/credentials', accent: true }]
        }
        actions={[
        { label: 'Add question', icon: FilePlusIcon, to: '/admin/assessment' },
        { label: 'Modules', icon: LibraryIcon, to: '/admin/modules' },
        { label: 'Students', icon: UsersIcon, to: '/admin/students' },
        { label: 'Credentials', icon: AwardIcon, to: '/admin/credentials' }]
        } />
      

      <SpotlightCard
        avatar={{ text: a.pairedCount ? `${gain >= 0 ? '+' : ''}${gain}` : '—', color: 'bg-brand-600' }}
        eyebrow={
        <>
            Pilot evaluation · <span className="font-medium text-brand-700">{a.pairedCount} paired participants</span>
          </>
        }
        title={`Mean score ${a.avgPre}% → ${a.avgPost}%`}
        subtitle={`Recommendation accuracy ${a.accuracy.pct}% · Relevance ${a.relevance.count ? a.relevance.avg.toFixed(1) : '—'}/5 · ${a.avgRecMs.toFixed(1)} ms per recommendation`}
        secondary={{ label: 'View students', icon: UsersIcon, to: '/admin/students' }}
        primary={{ label: 'Manage credentials', icon: AwardIcon, to: '/admin/credentials' }}
        stats={[
        { label: 'Task completion', value: `${a.completion.pct}%` },
        { label: 'Credentials', value: `${a.credentials.valid} valid` },
        { label: 'Verifications', value: String(a.credentials.verifications), tone: 'good' }]
        } />
      

      <ScoreStrip
        title="Knowledge gaps at a glance"
        summary={`${a.diagnosed} diagnosed · average diagnostic score`}
        items={a.domainGaps.map((g) => ({ key: g.domain.id, label: `${g.domain.short} · ${g.belowPct}% below`, value: g.avg }))}
        marker={threshold} />
      

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="recent-heading" className="font-semibold text-ink">
              Recent credentials
            </h2>
            <Link to="/admin/credentials" className="flex items-center gap-1 text-sm text-muted transition-colors duration-150 hover:text-brand-700">
              Credentials <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {recent.map((c) =>
            <li key={c.id} className="flex items-center gap-4 px-4 py-3.5">
                <span className="tabular w-12 text-sm font-semibold text-ink">{new Date(c.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <Avatar initials={initialsOf(c.learnerName)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.learnerName}</p>
                  <p className="truncate text-xs text-muted">
                    {c.competency} · {c.id}
                  </p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${c.status === 'valid' ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-700'}`}>
                  {c.status === 'valid' ? 'Valid' : 'Revoked'}
                </span>
              </li>
            )}
          </ul>
        </section>

        <DomainColumns title="By domain" summary="Pre vs post (paired)" scores={a.pairedCount ? a.pairedPreDomains : undefined} compare={a.pairedCount ? a.pairedPostDomains : undefined} />
      </div>
    </div>);

}