import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AwardIcon, BellIcon, CheckIcon, ChevronDownIcon, MenuIcon, PanelRightIcon, TicketIcon } from 'lucide-react';
import { Dropdown, MenuItem } from '../Dropdown';
import { NotificationRow } from '../notifications/NotificationRow';
import { useAuth } from '../../contexts/AuthContext';
import { useClock } from '../../hooks/useClock';
import { useNotifications } from '../../hooks/useNotifications';
import { useLearner } from '../../hooks/useLearner';
import { initialsOf } from '../../utils/format';
import { inviteStatus } from '../../utils/invite';
import { moduleHref } from '../../utils/slug';
import { HOME_TZ, pad, utcOffsetLabel, zonedParts } from '../../utils/time';

interface TopBarProps {
  panelOpen: boolean;
  onTogglePanel: () => void;
  onOpenMenu: () => void;
}

const iconBtn = 'relative rounded-lg p-2 text-muted transition-colors duration-150 hover:bg-surface hover:text-ink';

export function TopBar({ panelOpen, onTogglePanel, onOpenMenu }: TopBarProps) {
  const now = useClock();
  const p = zonedParts(now, HOME_TZ);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { learner, recommendations, credentials, platform } = useLearner();
  const { items, unread, markRead, markAllRead } = useNotifications();
  const [workspace, setWorkspace] = useState('mine');
  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const base = isAdmin ? '/admin' : '/app';
  const workspaces = [
  { id: 'mine', label: `${user.name.split(' ')[0]}'s workspace` },
  { id: 'cohort', label: 'ALU pilot cohort' }];

  const nextRec = recommendations.find((r) => learner?.progress[r.moduleId]?.status !== 'completed');
  const nextModule = nextRec ? platform.modules.find((m) => m.id === nextRec.moduleId) : undefined;
  const published = platform.modules.filter((m) => m.published).length;
  const valid = credentials.filter((c) => c.status === 'valid').length;
  const activeInvites = platform.invites.filter((i) => inviteStatus(i) === 'active').length;

  return (
    <header className="flex h-12 min-w-0 shrink-0 items-center gap-1 px-1.5 md:h-14 md:px-1">
      <button type="button" onClick={onOpenMenu} aria-label="Open menu" className={`${iconBtn} md:hidden`}>
        <MenuIcon className="h-5 w-5" />
      </button>

      <Dropdown
        label="Switch workspace"
        triggerClassName="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-surface"
        trigger={(open) =>
        <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">{initialsOf(user.name)}</span>
            <span className="hidden max-w-[160px] truncate sm:inline">{workspaces.find((w) => w.id === workspace)?.label}</span>
            <ChevronDownIcon className={`h-4 w-4 shrink-0 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
          </>
        }>
        
        {(close) =>
        workspaces.map((w) =>
        <MenuItem key={w.id} active={w.id === workspace} onSelect={() => {setWorkspace(w.id);close();}}>
              <span className="flex-1 truncate">{w.label}</span>
              {w.id === workspace && <CheckIcon className="h-4 w-4" />}
            </MenuItem>
        )
        }
      </Dropdown>

      <div className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 lg:flex" aria-label="Current time in Kigali">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="tabular text-sm font-semibold leading-5 text-ink">
          {pad(p.hour)}:{pad(p.minute)}
          <span className="text-muted">:{pad(p.second)}</span>
        </span>
        <span className="text-xs text-faint">{utcOffsetLabel(now, HOME_TZ)}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Dropdown
          label={`Notifications, ${unread} unread`}
          align="right"
          widthClass="w-[min(360px,calc(100vw-24px))]"
          triggerClassName={iconBtn}
          trigger={() =>
          <>
              <BellIcon className="h-[18px] w-[18px]" />
              {unread > 0 &&
            <span className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-canvas">
                  {unread > 9 ? '9+' : unread}
                </span>
            }
            </>
          }>
          
          {(close) =>
          <div>
              <div className="flex items-center justify-between px-2.5 py-2">
                <p className="text-sm font-semibold text-ink">Notifications</p>
                <button type="button" onClick={markAllRead} disabled={unread === 0} className="text-xs font-medium text-brand-700 hover:text-brand-800 disabled:text-faint">
                  Mark all read
                </button>
              </div>
              <ul className="thin-scroll max-h-80 overflow-y-auto">
                {items.length === 0 && <li className="px-2.5 py-6 text-center text-sm text-muted">You’re all caught up.</li>}
                {items.slice(0, 6).map((n) =>
              <li key={n.id}>
                    <NotificationRow
                  compact
                  item={n}
                  onOpen={(i) => {
                    markRead([i.id]);
                    close();
                    if (i.link) navigate(i.link);
                  }} />
                
                  </li>
              )}
              </ul>
              <button
              type="button"
              onClick={() => {close();navigate(`${base}/notifications`);}}
              className="mt-1 w-full rounded-lg border-t border-line py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-brand-50">
              
                See all
              </button>
            </div>
          }
        </Dropdown>

        <button
          type="button"
          aria-label={panelOpen ? 'Hide side panel' : 'Show side panel'}
          aria-pressed={panelOpen}
          onClick={onTogglePanel}
          className={`${iconBtn} hidden md:block ${panelOpen ? 'bg-brand-50 text-brand-700' : ''}`}>
          
          <PanelRightIcon className="h-4 w-4" />
        </button>

        <div className="ml-1 hidden items-center gap-2 rounded-full border border-brand-100 bg-brand-50 py-1 pl-3 pr-1 sm:flex">
          {isAdmin ? <TicketIcon className="h-4 w-4 text-brand-700" /> : <AwardIcon className="h-4 w-4 text-brand-700" />}
          <span className="tabular text-sm font-medium leading-5 text-brand-800">{isAdmin ? activeInvites : `${valid}/${published}`}</span>
          <button
            type="button"
            onClick={() => navigate(isAdmin ? '/admin/invites' : nextModule ? moduleHref(nextModule) : '/app/assessment')}
            className="rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold leading-5 text-white transition-colors duration-150 hover:bg-brand-700">
            
            {isAdmin ? 'Invite' : 'Continue'}
          </button>
        </div>

        <Dropdown
          label="Account"
          align="right"
          widthClass="w-52"
          triggerClassName="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white transition-colors duration-150 hover:bg-brand-700"
          trigger={() => <>{initialsOf(user.name)}</>}>
          
          {(close) =>
          <>
              <div className="border-b border-line px-2.5 pb-2 pt-1">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
              <div className="pt-1">
                <MenuItem onSelect={() => {navigate(`${base}/settings`);close();}}>Settings</MenuItem>
                <MenuItem onSelect={() => {navigate('/verify');close();}}>Verify a credential</MenuItem>
                <MenuItem onSelect={() => {close();logout();}}>Log out</MenuItem>
              </div>
            </>
          }
        </Dropdown>
      </div>
      <Link to={`${base}/notifications`} className="sr-only">
        Notifications
      </Link>
    </header>);

}