import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { COOKIE_POLICY_VERSION, usePreferences } from '../../contexts/PreferencesContext';
import { formatDate } from '../../utils/format';
import { primaryButton, secondaryButton } from '../../utils/styles';

const rows = [
{ name: 'imari:v3:session', purpose: 'Keeps you signed in', type: 'Essential', expiry: 'Until sign-out' },
{ name: 'imari:v3:cookies', purpose: 'Remembers this choice', type: 'Essential', expiry: '12 months' },
{ name: 'imari:v2:lang, imari:v3:settings', purpose: 'Language, text size, alerts', type: 'Preferences', expiry: '12 months' },
{ name: 'imari_rs', purpose: 'Anonymous task timing for the pilot study', type: 'Analytics', expiry: '6 months' }];


export function CookiePolicy() {
  const navigate = useNavigate();
  const { consent, setConsent } = usePreferences();

  return (
    <div className="min-h-[100dvh] w-full bg-canvas pb-[calc(24px+env(safe-area-inset-bottom))] pt-safe">
      <header className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link to="/" aria-label="Imari home">
          <Logo />
        </Link>
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeftIcon className="h-4 w-4" /> Back
        </button>
      </header>
      <main className="mx-auto max-w-3xl px-4">
        <article className="rounded-2xl border border-line bg-surface p-5 md:p-8">
          <p className="text-xs text-muted">Version {COOKIE_POLICY_VERSION}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Cookie policy</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Imari stores a small amount of data on your device. We never store bank details, mobile-money PINs or assessment answers in cookies.
          </p>

          <h2 className="mt-6 text-base font-semibold text-ink">What we store</h2>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
            {rows.map((r) =>
            <li key={r.name} className="grid gap-1 p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{r.purpose}</span>
                  <span className="block break-all font-mono text-xs text-faint">{r.name}</span>
                </span>
                <span className="text-xs text-muted">
                  {r.type} · {r.expiry}
                </span>
              </li>
            )}
          </ul>

          <h2 className="mt-6 text-base font-semibold text-ink">Your choice</h2>
          <p className="mt-1 text-sm text-muted">
            {consent ?
            `Saved ${formatDate(consent.decidedAt)} · preferences ${consent.preferences ? 'on' : 'off'} · analytics ${consent.analytics ? 'on' : 'off'}` :
            'You haven’t chosen yet.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setConsent({ analytics: false, preferences: false })} className={secondaryButton}>
              Essential only
            </button>
            <button type="button" onClick={() => setConsent({ analytics: true, preferences: true })} className={primaryButton}>
              Accept all
            </button>
          </div>
        </article>
      </main>
    </div>);

}