import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronRightIcon, UserPlusIcon } from 'lucide-react';
import { Modal } from '../Modal';
import { Avatar } from '../Avatar';
import { Spinner } from '../ui/Spinner';
import { GoogleLogo } from './GoogleButton';
import { TextInput } from './TextInput';
import { DEMO_ADMIN_EMAIL, DEMO_STUDENT_EMAIL } from '../../data/seed';
import { initialsOf } from '../../utils/format';
import { primaryButton, secondaryButton } from '../../utils/styles';

interface GoogleAccountModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (email: string, name: string) => void;
}

const accounts = [
{ name: 'Aline Uwimana', email: DEMO_STUDENT_EMAIL, color: 'bg-sky-500' },
{ name: 'Precious Mozia', email: DEMO_ADMIN_EMAIL, color: 'bg-brand-600' }];


export function GoogleAccountModal({ open, onClose, onSelect }: GoogleAccountModalProps) {
  const [mode, setMode] = useState<'choose' | 'other'>('choose');
  const [pending, setPending] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('choose');
    setPending(null);
    setName('');
    setEmail('');
  }, [open]);

  const choose = (e: string, n: string) => {
    setPending(e);
    window.setTimeout(() => onSelect(e, n), 700);
  };

  const submitOther = (ev: FormEvent) => {
    ev.preventDefault();
    if (name.trim().split(' ').length < 2 || !/^\S+@\S+\.\S+$/.test(email)) return;
    choose(email.trim(), name.trim());
  };

  return (
    <Modal open={open} onClose={onClose} title="Sign in with Google" description="Choose an account to continue to Imari">
      <div className="-mt-2 mb-4 flex items-center gap-2 text-xs text-muted">
        <GoogleLogo className="h-4 w-4" /> accounts.google.com
      </div>
      {mode === 'choose' ?
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {accounts.map((a) =>
        <li key={a.email}>
              <button
            type="button"
            disabled={!!pending}
            onClick={() => choose(a.email, a.name)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-subtle disabled:opacity-60">
            
                <Avatar initials={initialsOf(a.name)} color={a.color} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-5 text-ink">{a.name}</span>
                  <span className="block truncate text-xs leading-4 text-muted">{a.email}</span>
                </span>
                {pending === a.email ? <Spinner className="h-4 w-4 text-brand-600" /> : <ChevronRightIcon className="h-4 w-4 text-faint" />}
              </button>
            </li>
        )}
          <li>
            <button
            type="button"
            disabled={!!pending}
            onClick={() => setMode('other')}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-ink transition-colors duration-150 hover:bg-subtle">
            
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-muted">
                <UserPlusIcon className="h-4 w-4" />
              </span>
              Use another account
            </button>
          </li>
        </ul> :

      <form onSubmit={submitOther} className="space-y-3">
          <TextInput aria-label="Full name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextInput aria-label="Google email" type="email" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="flex justify-between gap-2 pt-2">
            <button type="button" onClick={() => setMode('choose')} className={secondaryButton}>
              Back
            </button>
            <button type="submit" disabled={!!pending} className={primaryButton}>
              {pending ? <Spinner /> : null} Continue
            </button>
          </div>
        </form>
      }
      <p className="mt-4 text-xs leading-5 text-muted">Google shares your name and email with Imari. We never access your contacts, files or payments.</p>
    </Modal>);

}