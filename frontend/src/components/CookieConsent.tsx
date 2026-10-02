import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CookieIcon } from 'lucide-react';
import { Switch } from './ui/Switch';
import { usePreferences } from '../contexts/PreferencesContext';
import { primaryButton, secondaryButton } from '../utils/styles';

const categories = [
{ id: 'essential', label: 'Essential', note: 'Sign-in and security. Always on.' },
{ id: 'preferences', label: 'Preferences', note: 'Language and text size.' },
{ id: 'analytics', label: 'Research analytics', note: 'Anonymous usage for the pilot study.' }] as
const;

/** Shown until the visitor makes a choice. Re-openable from Settings → Privacy. */
export function CookieConsent() {
  const { consent, setConsent } = usePreferences();
  const { pathname } = useLocation();
  const [manage, setManage] = useState(false);
  const [choice, setChoice] = useState({ analytics: true, preferences: true });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 1100);
    return () => window.clearTimeout(id);
  }, []);

  const open = ready && !consent && pathname !== '/legal/cookies';

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-x-0 bottom-0 z-[65] flex justify-center p-2 pb-[calc(8px+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-4 md:p-0">
          <motion.section
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 shadow-2xl shadow-brand-900/20">
          
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CookieIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id="cookie-title" className="text-sm font-semibold text-ink">
                  Cookies on Imari
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-muted">
                  We use essential cookies to keep you signed in, and optional ones for preferences and research.{' '}
                  <Link to="/legal/cookies" className="font-medium text-brand-700 underline-offset-2 hover:underline">
                    Cookie policy
                  </Link>
                </p>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {manage &&
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
              
                  {categories.map((c) =>
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{c.label}</span>
                        <span className="block text-xs text-muted">{c.note}</span>
                      </span>
                      <Switch
                  label={c.label}
                  checked={c.id === 'essential' ? true : choice[c.id]}
                  disabled={c.id === 'essential'}
                  onChange={(v) => c.id !== 'essential' && setChoice((s) => ({ ...s, [c.id]: v }))} />
                
                    </li>
              )}
                </motion.ul>
            }
            </AnimatePresence>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {manage ?
            <>
                  <button type="button" onClick={() => setManage(false)} className={secondaryButton}>
                    Back
                  </button>
                  <button type="button" onClick={() => setConsent(choice)} className={primaryButton}>
                    Save choices
                  </button>
                </> :

            <>
                  <button type="button" onClick={() => setConsent({ analytics: false, preferences: false })} className={secondaryButton}>
                    Essential only
                  </button>
                  <button type="button" onClick={() => setConsent({ analytics: true, preferences: true })} className={primaryButton}>
                    Accept all
                  </button>
                </>
            }
            </div>
            {!manage &&
          <button type="button" onClick={() => setManage(true)} className="mt-2 w-full py-1 text-center text-xs font-medium text-muted hover:text-brand-700">
                Manage preferences
              </button>
          }
          </motion.section>
        </div>
      }
    </AnimatePresence>);

}