import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
{ id: 'login', label: 'Sign in', to: '/login' },
{ id: 'register', label: 'Join', to: '/register' }] as
const;

export function AuthTabs({ active }: {active: 'login' | 'register';}) {
  return (
    <div role="tablist" aria-label="Account" className="grid grid-cols-2 rounded-lg bg-subtle p-0.5">
      {tabs.map((t) =>
      <Link
        key={t.id}
        to={t.to}
        role="tab"
        aria-selected={active === t.id}
        className={`relative rounded-md py-1.5 text-center text-sm font-semibold leading-5 transition-colors duration-150 ${active === t.id ? 'text-ink' : 'text-muted hover:text-ink'}`}>
        
          {active === t.id && <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className="relative">{t.label}</span>
        </Link>
      )}
    </div>);

}