import React, { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GlobeIcon } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { usePreferences } from '../../contexts/PreferencesContext';
import { languageOptions } from '../../data/i18n';

/** Floating language toggle pinned bottom-right on every screen. */
export function LanguagePill() {
  const { language, setLanguage, consent } = usePreferences();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);
  const current = languageOptions.find((l) => l.id === language) ?? languageOptions[0];

  // Hidden only while the cookie sheet occupies the same corner.
  if (!consent && pathname !== '/legal/cookies') return null;
  const inShell = pathname.startsWith('/app') || pathname.startsWith('/admin');
  const inEditor = /\/admin\/modules\/(new|.+\/edit)/.test(pathname);
  const position = inShell ?
  inEditor ?
  'bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-20' :
  'bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-4' :
  pathname.startsWith('/onboarding') ?
  'bottom-[calc(76px+env(safe-area-inset-bottom))]' :
  'bottom-[calc(12px+env(safe-area-inset-bottom))] md:bottom-5';

  return (
    <div ref={ref} className={`fixed right-[max(12px,env(safe-area-inset-right))] z-[55] md:right-5 ${position}`}>
      <AnimatePresence initial={false} mode="wait">
        {open ?
        <motion.div
          key="open"
          role="radiogroup"
          aria-label="Language"
          initial={{ opacity: 0, scale: 0.96, x: 8 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.96, x: 8 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-lg shadow-brand-900/15">
          
            {languageOptions.map((l) => {
            const active = l.id === language;
            return (
              <button
                key={l.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={l.native}
                onClick={() => {
                  setLanguage(l.id);
                  window.setTimeout(close, 160);
                }}
                className="relative rounded-full px-3 py-1.5 text-xs font-semibold leading-none">
                
                  {active && <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-full bg-brand-600" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <span className={`relative ${active ? 'text-white' : 'text-muted'}`}>{l.short}</span>
                </button>);

          })}
          </motion.div> :

        <motion.button
          key="closed"
          type="button"
          aria-label={`Language: ${current.native}. Change language`}
          onClick={() => setOpen(true)}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface pl-2.5 pr-3 text-xs font-semibold leading-none text-ink shadow-lg shadow-brand-900/15 transition-colors duration-150 hover:border-brand-200 hover:text-brand-700 active:scale-[0.97]">
          
            <GlobeIcon className="h-4 w-4 text-brand-600" />
            {current.short}
          </motion.button>
        }
      </AnimatePresence>
    </div>);

}