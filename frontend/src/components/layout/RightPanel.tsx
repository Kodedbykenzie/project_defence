import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowRightIcon,
  AwardIcon,
  BarChart3Icon,
  BellIcon,
  BookOpenIcon,
  ClipboardCheckIcon,
  FilePlusIcon,
  LibraryIcon,
  PanelRightCloseIcon,
  ShieldCheckIcon,
  UsersIcon } from
'lucide-react';
import { Avatar } from '../Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { useClock } from '../../hooks/useClock';
import { useNotifications } from '../../hooks/useNotifications';
import { useLearner } from '../../hooks/useLearner';
import { domains } from '../../data/domains';
import { computeAnalytics } from '../../utils/analytics';
import { progressPercent } from '../../utils/recommendation';
import { initialsOf } from '../../utils/format';
import { moduleHref } from '../../utils/slug';
import { HOME_CITY, HOME_TZ, pad, utcOffsetLabel, worldClocks, zonedParts } from '../../utils/time';

interface UpNextRow {
  key: string;
  top: string;
  big: string;
  avatar: string;
  color: string;
  title: string;
  sub: string;
  right: string;
  to: string;
}

export function RightPanel({ title, onClose }: {title: string;onClose: () => void;}) {
  const now = useClock();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { learner, recommendations, platform } = useLearner();
  const { items, markRead } = useNotifications();
  if (!user) return null;
  const isAdmin = user.role === 'admin';
  const p = zonedParts(now, HOME_TZ);
  const dayProgress = (p.hour * 60 + p.minute) / 1440 * 100;

  let rows: UpNextRow[] = [];
  if (isAdmin) {
    const a = computeAnalytics(Object.values(platform.learners), platform.modules, platform.credentials, platform.threshold);
    rows = [
    ...a.pendingIssuance.map(({ learner: l, module }) => ({
      key: `${l.id}-${module.id}`,
      top: 'ISSUE',
      big: domains.find((d) => d.id === module.domain)?.code ?? '',
      avatar: initialsOf(l.name),
      color: 'bg-brand-500',
      title: l.name,
      sub: module.competency,
      right: 'Ready',
      to: '/admin/credentials'
    })),
    ...a.awaitingDiagnostic.map((l) => ({
      key: l.id,
      top: new Date(l.joinedAt).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
      big: String(new Date(l.joinedAt).getDate()),
      avatar: initialsOf(l.name),
      color: 'bg-faint',
      title: l.name,
      sub: 'Awaiting diagnostic',
      right: formatDistanceToNow(new Date(l.joinedAt)),
      to: '/admin/students'
    }))].
    slice(0, 3);
  } else if (learner) {
    rows = recommendations.
    filter((r) => learner.progress[r.moduleId]?.status !== 'completed').
    slice(0, 3).
    map((r) => {
      const m = platform.modules.find((x) => x.id === r.moduleId)!;
      const d = domains.find((x) => x.id === r.domain)!;
      return {
        key: r.moduleId,
        top: `P${r.priority}`,
        big: `${r.score}%`,
        avatar: d.code,
        color: d.color,
        title: m.title,
        sub: `${m.minutes} min`,
        right: `${progressPercent(learner.progress[m.id], m)}%`,
        to: moduleHref(m)
      };
    });
  }

  const actions = isAdmin ?
  [
  { label: 'Add question', icon: FilePlusIcon, to: '/admin/assessment' },
  { label: 'Modules', icon: LibraryIcon, to: '/admin/modules' },
  { label: 'Students', icon: UsersIcon, to: '/admin/students' },
  { label: 'Invite', icon: ShieldCheckIcon, to: '/admin/invites' }] :

  [
  { label: 'Diagnostic', icon: ClipboardCheckIcon, to: '/app/assessment' },
  { label: 'Modules', icon: BookOpenIcon, to: '/app/modules' },
  { label: 'Results', icon: BarChart3Icon, to: '/app/results' },
  { label: 'Credentials', icon: AwardIcon, to: '/app/credentials' }];


  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      aria-label="At a glance"
      className="hidden w-[232px] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface md:flex lg:w-[252px] xl:w-[268px]">
      
      <div className="flex items-start justify-between px-4 pb-3 pt-4">
        <div>
          <h2 className="font-semibold text-ink">At a glance</h2>
          <p className="text-xs text-muted">{title || 'Home'}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Hide side panel" className="rounded-md p-1.5 text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
          <PanelRightCloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-3">
        <section className="rounded-2xl bg-brand-900 p-4 text-white">
          <div className="flex justify-between text-xs">
            <span className="text-brand-200">{HOME_CITY}</span>
            <span className="font-semibold">{utcOffsetLabel(now, HOME_TZ)}</span>
          </div>
          <p className="tabular mt-1 text-[2.25rem] font-bold leading-none tracking-tight">
            {pad(p.hour)}:{pad(p.minute)}
            <span className="ml-1 text-lg font-medium text-brand-300">{pad(p.second)}</span>
          </p>
          <p className="mt-1.5 text-sm text-brand-100">
            {p.weekday} {p.day} {p.month}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Day progress" aria-valuenow={Math.round(dayProgress)}>
            <div className="h-full rounded-full bg-accent-400" style={{ width: `${dayProgress}%` }} />
          </div>
          <div className="tabular mt-1.5 flex justify-between text-[10px] text-brand-300">
            {['00', '06', '12', '18', '24'].map((h) =>
            <span key={h}>{h}</span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
            {worldClocks.map((c) => {
              const cp = zonedParts(now, c.timeZone);
              return (
                <div key={c.city}>
                  <p className="text-[11px] text-brand-300">{c.city}</p>
                  <p className="tabular text-sm font-semibold">
                    {pad(cp.hour)}:{pad(cp.minute)}
                  </p>
                </div>);

            })}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-xs font-medium text-muted">{isAdmin ? 'Needs attention' : 'Up next'}</h3>
            <Link to={isAdmin ? '/admin/students' : '/app/modules'} className="flex items-center gap-1 text-xs text-muted transition-colors duration-150 hover:text-brand-700">
              {isAdmin ? 'Students' : 'Path'} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {rows.length === 0 ?
          <p className="px-1 py-4 text-sm text-muted">{isAdmin ? 'Nothing needs attention.' : 'No modules waiting.'}</p> :

          <ul>
              {rows.map((r) =>
            <li key={r.key}>
                  <Link to={r.to} className="flex items-center gap-2.5 rounded-lg px-1 py-2 transition-colors duration-150 hover:bg-subtle">
                    <div className="w-10 shrink-0 text-center">
                      <p className="text-[10px] font-medium uppercase text-faint">{r.top}</p>
                      <p className="tabular text-sm font-semibold text-ink">{r.big}</p>
                    </div>
                    <Avatar initials={r.avatar} color={r.color} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{r.title}</p>
                      <p className="truncate text-xs text-muted">{r.sub}</p>
                    </div>
                    <span className="tabular shrink-0 text-xs text-muted">{r.right}</span>
                  </Link>
                </li>
            )}
            </ul>
          }
        </section>

        <section className="mt-4 pb-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-xs font-medium text-muted">Notifications</h3>
            <Link to={isAdmin ? '/admin/notifications' : '/app/notifications'} className="flex items-center gap-1 text-xs text-muted transition-colors duration-150 hover:text-brand-700">
              All <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <ul className="space-y-0.5">
            {items.slice(0, 3).map((a) =>
            <li key={a.id}>
                <button
                type="button"
                onClick={() => {
                  markRead([a.id]);
                  if (a.link) navigate(a.link);
                }}
                className="flex w-full gap-2 rounded-lg px-1 py-1.5 text-left transition-colors duration-150 hover:bg-subtle">
                
                  <span className="relative mt-0.5 text-faint">
                    <BellIcon className="h-3.5 w-3.5" />
                    {a.unread && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent-500" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm leading-5 text-ink">{a.title}</span>
                    <span className="block truncate text-xs leading-4 text-muted">
                      {formatDistanceToNow(new Date(a.at), { addSuffix: true })} · {a.body}
                    </span>
                  </span>
                </button>
              </li>
            )}
            {items.length === 0 && <li className="px-1 text-sm text-muted">Nothing yet.</li>}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-line p-3 pb-16">
        {actions.map(({ label, icon: Icon, to }) =>
        <button
          key={label}
          type="button"
          onClick={() => navigate(to)}
          className="flex items-center gap-2 rounded-lg border border-line bg-subtle px-2.5 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
          
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        )}
      </div>
    </motion.aside>);

}