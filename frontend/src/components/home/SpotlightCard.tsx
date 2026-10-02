import React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "../Avatar";
import { BoxIcon } from "lucide-react";
interface CardAction {
  label: string;
  icon: BoxIcon;
  to: string;
}
interface SpotlightCardProps {
  avatar: {
    text: string;
    color: string;
  };
  eyebrow: ReactNode;
  title: string;
  subtitle: string;
  secondary?: CardAction;
  primary: CardAction;
  stats: {
    label: string;
    value: string;
    tone?: 'good' | 'warn';
  }[];
}
export function SpotlightCard({
  avatar,
  eyebrow,
  title,
  subtitle,
  secondary,
  primary,
  stats
}: SpotlightCardProps) {
  return <section aria-label={title} className="min-w-0 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5 md:p-5 lg:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar initials={avatar.text} color={avatar.color} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xs leading-5 text-muted md:text-sm">{eyebrow}</p>
            <h2 className="mt-0.5 text-base font-semibold leading-snug tracking-tight text-ink md:text-xl">{title}</h2>
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted md:text-sm">{subtitle}</p>
          </div>
        </div>
        <div className={`grid gap-2 ${secondary ? 'grid-cols-2' : 'grid-cols-1'} lg:flex`}>
          {secondary && <Link to={secondary.to} className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:border-brand-200 hover:text-brand-700">
              <secondary.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{secondary.label}</span>
            </Link>}
          <Link to={primary.to} className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
            <primary.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{primary.label}</span>
          </Link>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-brand-100 pt-3 text-sm md:flex md:gap-x-8">
        {stats.map((s) => <div key={s.label} className="min-w-0 md:flex md:gap-1.5">
            <dt className="text-[11px] leading-4 text-muted md:text-sm">{s.label}</dt>
            <dd className={`font-semibold ${s.tone === 'good' ? 'text-emerald-600' : s.tone === 'warn' ? 'text-accent-600' : 'text-ink'}`}>{s.value}</dd>
          </div>)}
      </dl>
    </section>;
}