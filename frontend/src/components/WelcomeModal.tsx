import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, BellRingIcon, SproutIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Switch } from './ui/Switch';
import { LanguageControl, TextSizeControl } from './settings/PreferenceControls';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useLearner } from '../hooks/useLearner';
import { primaryButton, secondaryButton } from '../utils/styles';

/** First visit per account: greet and let the user set language, text size and alerts. */
export function WelcomeModal() {
  const { user } = useAuth();
  const { welcomed, markWelcomed, toasts, update, consent } = usePreferences();
  const { learner } = useLearner();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || welcomed.includes(user.id) || !consent) return;
    const id = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(id);
  }, [user, welcomed, consent]);

  if (!user) return null;
  const isAdmin = user.role === 'admin';
  const hasDiagnostic = !!learner?.attempts.length;

  const finish = (to?: string) => {
    markWelcomed(user.id);
    setOpen(false);
    if (to) navigate(to);
  };

  return (
    <Modal open={open} onClose={() => finish()} title="Welcome to Imari" size="sm" bare>
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <SproutIcon className="h-6 w-6" />
        </span>
        <p className="mt-3 text-lg font-semibold text-ink">Welcome, {user.name.split(' ')[0]}</p>
        <p className="mt-0.5 text-sm text-muted">{isAdmin ? 'Your pilot workspace is ready.' : 'Set things up the way you like.'}</p>
      </div>

      <div className="mt-5 divide-y divide-line rounded-xl border border-line">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="text-sm font-medium text-ink">Language</span>
          <LanguageControl />
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="text-sm font-medium text-ink">Text size</span>
          <TextSizeControl />
        </div>
        <label className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <BellRingIcon className="h-4 w-4 text-faint" /> Pop-up alerts
          </span>
          <Switch checked={toasts} onChange={(v) => update({ toasts: v })} label="Pop-up alerts" />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => finish()} className={secondaryButton}>
          Later
        </button>
        <button type="button" onClick={() => finish(isAdmin ? '/admin/invites' : hasDiagnostic ? '/app/modules' : '/app/assessment')} className={primaryButton}>
          {isAdmin ? 'Invite students' : hasDiagnostic ? 'Keep learning' : 'Start diagnostic'} <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-faint">Change anytime in Settings.</p>
    </Modal>);

}