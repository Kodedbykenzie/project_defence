import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePreferences } from '../../contexts/PreferencesContext';
import type { NavEntry } from '../../data/navigation';

export function MobileBottomNav({ items }: {items: NavEntry[];}) {
  const { t } = usePreferences();
  const { pathname } = useLocation();
  const activeTo = items.
  filter((i) => i.end ? pathname === i.to : pathname.startsWith(i.to)).
  sort((a, b) => b.to.length - a.to.length)[0]?.to;

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-safe px-safe backdrop-blur-md md:hidden">
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.to === activeTo;
          return (
            <li key={item.to} className="min-w-0">
              <NavLink to={item.to} end={item.end} className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-0.5 pb-1.5 pt-1.5" aria-current={active ? 'page' : undefined}>
                <span className="relative flex h-7 w-12 items-center justify-center">
                  {active && <motion.span layoutId="bottom-nav-pill" className="absolute inset-0 rounded-full bg-brand-100" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <Icon className={`relative h-[18px] w-[18px] ${active ? 'text-brand-700' : 'text-muted'}`} aria-hidden="true" />
                </span>
                <span className={`w-full truncate text-center text-[10px] leading-3 ${active ? 'font-semibold text-brand-700' : 'text-muted'}`}>{t(item.tKey)}</span>
              </NavLink>
            </li>);

        })}
      </ul>
    </nav>);

}