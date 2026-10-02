import React from "react";
import { Link } from "react-router-dom";
import { useClock } from "../../hooks/useClock";
import { usePreferences } from "../../contexts/PreferencesContext";
import { HOME_TZ, greetingKey, pad, utcOffsetLabel, zonedParts } from "../../utils/time";
import { BoxIcon } from "lucide-react";
export interface HeaderStat {
  value: string | number;
  label: string;
  to: string;
  accent?: boolean;
}
export interface HeaderAction {
  label: string;
  icon: BoxIcon;
  to: string;
}
export function HomeHeader({
  name,
  stats,
  actions




}: {name: string;stats: HeaderStat[];actions: HeaderAction[];}) {
  const now = useClock();
  const p = zonedParts(now, HOME_TZ);
  const {
    t
  } = usePreferences();
  return <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="tabular text-sm leading-5 text-muted">
          {p.weekday} {p.day} {p.month} {p.year} ·{' '}
          <span className="font-semibold text-ink">
            {pad(p.hour)}:{pad(p.minute)}:{pad(p.second)}
          </span>{' '}
          {utcOffsetLabel(now, HOME_TZ)}
        </p>
        <h1 className="mt-1.5 text-xl font-semibold leading-tight tracking-tight text-ink md:text-2xl lg:text-[1.75rem]">
          {t(greetingKey(p.hour))}, {name}
        </h1>
        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm leading-6 text-muted">
          {stats.map((s) => <Link key={s.label} to={s.to} className="transition-colors duration-150 hover:text-ink">
              <span className={`tabular mr-1 text-lg font-semibold leading-6 ${s.accent ? 'text-accent-600' : 'text-ink'}`}>{s.value}</span>
              {s.label}
            </Link>)}
        </div>
      </div>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {actions.map(({
        label,
        icon: Icon,
        to
      }) => <Link key={label} to={to} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-subtle px-3.5 py-2 text-sm font-medium leading-5 text-ink transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
            <Icon className="h-4 w-4" />
            {label}
          </Link>)}
      </div>
    </header>;
}