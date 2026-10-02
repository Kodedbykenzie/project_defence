import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CheckIcon, CopyIcon, LinkIcon, MailIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../Modal';
import { usePlatform } from '../../contexts/PlatformContext';
import { formatDate } from '../../utils/format';
import { inviteLink, inviteMessage } from '../../utils/invite';
import { inputClass, primaryButton, secondaryButton } from '../../utils/styles';
import type { Invite } from '../../types/platform';

const usesOptions: {label: string;value: number | null;}[] = [
{ label: '10', value: 10 },
{ label: '25', value: 25 },
{ label: '50', value: 50 },
{ label: '∞', value: null }];

const dayOptions = [7, 14, 30];

export async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Couldn’t copy', { description: text });
  }
}

export function InviteCreateModal({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const { createInvite, learners } = usePlatform();
  const [mode, setMode] = useState<'person' | 'open'>('person');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [maxUses, setMaxUses] = useState<number | null>(25);
  const [days, setDays] = useState(14);
  const [created, setCreated] = useState<Invite | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode('person');
    setEmail('');
    setNote('');
    setMaxUses(25);
    setDays(14);
    setCreated(null);
  }, [open]);

  const emailTaken = Object.values(learners).some((l) => l.email.toLowerCase() === email.trim().toLowerCase());
  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const valid = mode === 'open' || emailValid && !emailTaken;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setCreated(createInvite({ email: mode === 'person' ? email : undefined, note, maxUses, days }));
  };

  const seg = (on: boolean) => `flex-1 rounded-lg py-2 text-sm font-medium leading-5 transition-colors duration-150 ${on ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`;

  return (
    <Modal open={open} onClose={onClose} title={created ? 'Invite ready' : 'New invite'}>
      {created ?
      <div>
          <div className="rounded-2xl bg-brand-50 p-5 text-center">
            <p className="text-xs font-medium text-brand-700">Invite code</p>
            <p className="tabular mt-1 font-mono text-3xl font-semibold tracking-wider text-brand-900">{created.code}</p>
            <p className="mt-2 truncate text-xs text-muted">
              {created.email ?? (created.maxUses ? `${created.maxUses} uses` : 'Unlimited uses')} · until {formatDate(created.expiresAt)}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-subtle py-1.5 pl-3 pr-1.5">
            <LinkIcon className="h-4 w-4 shrink-0 text-faint" />
            <span className="min-w-0 flex-1 truncate text-sm text-muted">{inviteLink(created.code)}</span>
            <button type="button" onClick={() => copyText(inviteLink(created.code), 'Link')} className="shrink-0 rounded-lg bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:text-brand-700">
              Copy
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copyText(inviteMessage(created), 'Message')} className={secondaryButton}>
              <CopyIcon className="h-4 w-4" /> Copy message
            </button>
            {created.email ?
          <a
            href={`mailto:${created.email}?subject=${encodeURIComponent('Your Imari invite')}&body=${encodeURIComponent(inviteMessage(created))}`}
            className={secondaryButton}>
            
                <MailIcon className="h-4 w-4" /> Email
              </a> :

          <button type="button" onClick={() => copyText(created.code, 'Code')} className={secondaryButton}>
                <CopyIcon className="h-4 w-4" /> Copy code
              </button>
          }
          </div>
          <button type="button" onClick={onClose} className={`${primaryButton} mt-3 w-full`}>
            <CheckIcon className="h-4 w-4" /> Done
          </button>
        </div> :

      <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 rounded-xl bg-subtle p-1" role="radiogroup" aria-label="Invite type">
            <button type="button" role="radio" aria-checked={mode === 'person'} onClick={() => setMode('person')} className={seg(mode === 'person')}>
              <span className="inline-flex items-center gap-1.5">
                <MailIcon className="h-4 w-4" /> One person
              </span>
            </button>
            <button type="button" role="radio" aria-checked={mode === 'open'} onClick={() => setMode('open')} className={seg(mode === 'open')}>
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4" /> Open code
              </span>
            </button>
          </div>

          {mode === 'person' ?
        <div>
              <label htmlFor="inv-email" className="mb-1.5 block text-sm font-medium text-ink">
                Student email
              </label>
              <input id="inv-email" type="email" autoFocus className={inputClass} placeholder="name@alustudent.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              {emailTaken && <p className="mt-1.5 text-xs text-rose-600">Already has an account.</p>}
            </div> :

        <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Max uses</p>
              <div className="grid grid-cols-4 gap-2" role="radiogroup">
                {usesOptions.map((o) =>
            <button
              key={o.label}
              type="button"
              role="radio"
              aria-checked={maxUses === o.value}
              onClick={() => setMaxUses(o.value)}
              className={`tabular rounded-xl border py-2.5 text-sm font-semibold leading-5 transition-colors duration-150 ${maxUses === o.value ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink hover:border-brand-200'}`}>
              
                    {o.label}
                  </button>
            )}
              </div>
            </div>
        }

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Expires in</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {dayOptions.map((d) =>
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
              className={`rounded-xl border py-2.5 text-sm font-medium leading-5 transition-colors duration-150 ${days === d ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink hover:border-brand-200'}`}>
              
                  {d} days
                </button>
            )}
            </div>
          </div>

          <div>
            <label htmlFor="inv-note" className="mb-1.5 block text-sm font-medium text-ink">
              Label <span className="font-normal text-faint">· optional</span>
            </label>
            <input id="inv-note" className={inputClass} placeholder="e.g. Finance club" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-5">
            <button type="button" onClick={onClose} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={!valid} className={primaryButton}>
              Create invite
            </button>
          </div>
        </form>
      }
    </Modal>);

}