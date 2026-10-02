import React from 'react';
import { moduleHref } from '../../utils/slug';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, AwardIcon, BookOpenIcon, ClipboardCheckIcon, FileQuestionIcon, ShieldCheckIcon, TrendingUpIcon } from 'lucide-react';
import { HomeHeader } from '../../components/home/HomeHeader';
import { SpotlightCard } from '../../components/home/SpotlightCard';
import { ScoreStrip } from '../../components/home/ScoreStrip';
import { DomainColumns } from '../../components/home/DomainColumns';
import { Avatar } from '../../components/Avatar';
import { domains } from '../../data/domains';
import { useLearner } from '../../hooks/useLearner';
import { bestQuiz, isEligible } from '../../utils/recommendation';

const chip = {
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' },
  in_progress: { label: 'In progress', className: 'bg-brand-50 text-brand-700' },
  not_started: { label: 'Not started', className: 'bg-subtle text-muted' }
};

export function StudentDashboard() {
  const { learner, pre, post, recommendations, credentials, platform } = useLearner();
  if (!learner) return null;

  const threshold = platform.threshold;
  const path = recommendations.
  map((rec) => ({ rec, module: platform.modules.find((m) => m.id === rec.moduleId)!, progress: learner.progress[rec.moduleId] })).
  filter((p) => p.module);
  const remaining = path.filter((p) => p.progress?.status !== 'completed');
  const next = remaining[0];
  const valid = credentials.filter((c) => c.status === 'valid').length;
  const latestScores = post?.domainScores ?? pre?.domainScores;

  const card = (() => {
    if (!pre) {
      return {
        avatar: { text: '15', color: 'bg-brand-600' },
        eyebrow: 'Start here · about 8 min',
        title: 'Diagnostic assessment',
        subtitle: '15 questions · 5 domains · No personal financial data asked',
        secondary: { label: 'How it works', icon: FileQuestionIcon, to: '/app/modules' },
        primary: { label: 'Start diagnostic', icon: ClipboardCheckIcon, to: '/app/assessment' },
        stats: [
        { label: 'Questions', value: String(platform.questions.length) },
        { label: 'Domains', value: '5' },
        { label: 'Threshold', value: `${threshold}%` }]

      };
    }
    if (next) {
      const d = domains.find((x) => x.id === next.module.domain)!;
      const best = bestQuiz(next.progress);
      return {
        avatar: { text: d.code, color: d.color },
        eyebrow:
        <>
            Next up · priority {next.rec.priority} · <span className="font-medium text-brand-700">{next.module.minutes} min</span>
          </>,

        title: next.module.title,
        subtitle: `${d.name} · ${next.module.lessons.length} lessons · Pass mark ${next.module.passingScore}% · ${best !== null ? `Best quiz ${best}%` : 'No quiz attempt yet'}`,
        secondary: { label: 'Take quiz', icon: FileQuestionIcon, to: moduleHref(next.module) },
        primary: { label: 'Open module', icon: BookOpenIcon, to: moduleHref(next.module) },
        stats: [
        { label: 'Lessons done', value: `${next.progress?.lessonsDone.length ?? 0}/${next.module.lessons.length}` },
        { label: 'Domain score', value: `${next.rec.score}%`, tone: 'warn' as const },
        { label: 'Credential', value: isEligible(next.progress, next.module) ? 'ready' : 'locked' }]

      };
    }
    return {
      avatar: { text: 'OK', color: 'bg-emerald-500' },
      eyebrow: path.length ? 'Learning path complete' : 'All domains above threshold',
      title: post ? `Score improved ${pre.total}% → ${post.total}%` : 'Take the post-test',
      subtitle: post ? 'Great work — see the full breakdown in Progress.' : 'Compare with your diagnostic to measure what you’ve learned.',
      secondary: { label: 'Credentials', icon: AwardIcon, to: '/app/credentials' },
      primary: post ? { label: 'View progress', icon: TrendingUpIcon, to: '/app/progress' } : { label: 'Start post-test', icon: ClipboardCheckIcon, to: '/app/assessment?kind=post' },
      stats: [
      { label: 'Modules done', value: `${path.length - remaining.length}/${path.length}` },
      { label: 'Credentials', value: String(valid) },
      { label: 'Post-test', value: post ? `${post.total}%` : 'pending', tone: post ? 'good' as const : undefined }]

    };
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-6 sm:px-6 lg:px-10 lg:py-10">
      <HomeHeader
        name={learner.name.split(' ')[0]}
        stats={[
        { value: remaining.length, label: 'to learn', to: '/app/modules' },
        { value: valid, label: 'credentials', to: '/app/credentials' },
        { value: pre ? `${pre.total}%` : '—', label: 'diagnostic', to: '/app/results', accent: true }]
        }
        actions={[
        { label: 'Diagnostic', icon: ClipboardCheckIcon, to: '/app/assessment' },
        { label: 'Post-test', icon: TrendingUpIcon, to: pre ? '/app/assessment?kind=post' : '/app/assessment' },
        { label: 'Learning path', icon: BookOpenIcon, to: '/app/modules' },
        { label: 'Verify credential', icon: ShieldCheckIcon, to: '/verify' }]
        } />
      

      <SpotlightCard {...card} />

      <ScoreStrip
        title="Scores at a glance"
        summary={latestScores ? `${domains.filter((d) => latestScores[d.id] < threshold).length} below ${threshold}% · ${post ? 'post-test' : 'diagnostic'}` : `${threshold}% threshold`}
        items={latestScores ? domains.map((d) => ({ key: d.id, label: d.short, value: latestScores[d.id] })) : []}
        marker={threshold}
        emptyText="Take the diagnostic to see your domain scores" />
      

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="path-heading">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="path-heading" className="font-semibold text-ink">
              Your learning path
            </h2>
            <Link to="/app/modules" className="flex items-center gap-1 text-sm text-muted transition-colors duration-150 hover:text-brand-700">
              All modules <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          {path.length === 0 ?
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              {pre ? 'No modules required — explore any module you like.' : 'Your recommended modules appear here after the diagnostic.'}
            </div> :

          <ul className="divide-y divide-line rounded-2xl border border-line">
              {path.map(({ rec, module, progress }) => {
              const d = domains.find((x) => x.id === module.domain)!;
              const s = chip[progress?.status ?? 'not_started'];
              return (
                <li key={module.id}>
                    <Link to={moduleHref(module)} className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-subtle">
                      <span className="tabular w-8 text-sm font-semibold text-ink">P{rec.priority}</span>
                      <Avatar initials={d.code} color={d.color} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{module.title}</p>
                        <p className="truncate text-xs text-muted">
                          {module.minutes} min · {d.short} · scored {rec.score}%
                        </p>
                      </div>
                      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${s.className}`}>{s.label}</span>
                    </Link>
                  </li>);

            })}
            </ul>
          }
        </section>

        <DomainColumns
          title="By domain"
          summary={post ? 'Diagnostic vs post-test' : pre ? 'Diagnostic scores' : 'No scores yet'}
          scores={pre?.domainScores}
          compare={post?.domainScores} />
        
      </div>
    </div>);

}