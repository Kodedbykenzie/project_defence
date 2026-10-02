import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isThisWeek, isToday } from 'date-fns';
import { BellOffIcon, CheckCheckIcon } from 'lucide-react';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationView } from '../hooks/useNotifications';

type Tab = 'all' | 'unread';

export function Notifications() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
  const shown = tab === 'unread' ? items.filter((i) => i.unread) : items;

  const groups: {label: string;items: NotificationView[];}[] = [
  { label: 'Today', items: shown.filter((i) => isToday(new Date(i.at))) },
  { label: 'This week', items: shown.filter((i) => !isToday(new Date(i.at)) && isThisWeek(new Date(i.at), { weekStartsOn: 1 })) },
  { label: 'Earlier', items: shown.filter((i) => !isThisWeek(new Date(i.at), { weekStartsOn: 1 })) }].
  filter((g) => g.items.length);

  const open = (item: NotificationView) => {
    markRead([item.id]);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight text-ink">Notifications</h1>
        <button
          type="button"
          onClick={markAllRead}
          disabled={!unread}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:text-faint disabled:hover:bg-transparent">
          
          <CheckCheckIcon className="h-4 w-4" /> <span className="hidden sm:inline">Mark all read</span>
        </button>
      </div>

      <div role="tablist" className="mt-5 flex gap-2">
        {(['all', 'unread'] as Tab[]).map((t) =>
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tab === t}
          onClick={() => setTab(t)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize leading-5 transition-colors duration-150 ${tab === t ? 'bg-brand-600 text-white' : 'bg-subtle text-muted hover:text-ink'}`}>
          
            {t}
            {t === 'unread' && unread > 0 && <span className="tabular ml-1.5 opacity-80">{unread}</span>}
          </button>
        )}
      </div>

      {groups.length === 0 ?
      <div className="mt-16 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-faint">
            <BellOffIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 font-medium text-ink">{tab === 'unread' ? 'All caught up' : 'No notifications yet'}</p>
        </div> :

      groups.map((g) =>
      <section key={g.label} className="mt-6">
            <h2 className="mb-1 px-3 text-xs font-medium text-faint">{g.label}</h2>
            <ul className="-mx-1">
              {g.items.map((i) =>
          <li key={i.id}>
                  <NotificationRow item={i} onOpen={open} />
                </li>
          )}
            </ul>
          </section>
      )
      }
    </div>);

}