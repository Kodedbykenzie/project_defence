import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChevronDownIcon, CopyIcon, LinkIcon, MailIcon, PlusIcon, TicketIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '../../components/Avatar';
import { Modal } from '../../components/Modal';
import { InviteCreateModal, copyText } from '../../components/admin/InviteCreateModal';
import { usePlatform } from '../../contexts/PlatformContext';
import { formatDate, initialsOf } from '../../utils/format';
import { inviteLink, inviteStatus, usesLabel } from '../../utils/invite';
import { primaryButton, secondaryButton } from '../../utils/styles';
import type { Invite, InviteStatus } from '../../types/platform';

type Filter = 'all' | InviteStatus;

const statusStyle: Record<InviteStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  used: 'bg-brand-50 text-brand-700',
  expired: 'bg-amber-50 text-amber-700',
  revoked: 'bg-rose-50 text-rose-700'
};

export function InvitesAdmin() {
  const { invites, revokeInvite, extendInvite } = usePlatform();
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toRevoke, setToRevoke] = useState<Invite | null>(null);

  const withStatus = invites.map((i) => ({ invite: i, status: inviteStatus(i) }));
  const rows = withStatus.filter((r) => filter === 'all' || r.status === filter);
  const count = (s: InviteStatus) => withStatus.filter((r) => r.status === s).length;
  const joined = invites.reduce((n, i) => n + i.uses, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 lg:py-10">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight tracking-tight text-ink md:text-2xl">Invites</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-ink">{count('active')}</span> active · <span className="font-semibold text-ink">{joined}</span> joined
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className={`${primaryButton} shrink-0`}>
          <PlusIcon className="h-4 w-4" /> <span className="hidden sm:inline">New invite</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      <div role="tablist" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(['all', 'active', 'used', 'expired', 'revoked'] as Filter[]).map((f) =>
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={filter === f}
          onClick={() => setFilter(f)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium capitalize leading-5 transition-colors duration-150 ${filter === f ? 'bg-brand-600 text-white' : 'bg-subtle text-muted hover:text-ink'}`}>
          
            {f} <span className="tabular opacity-70">{f === 'all' ? invites.length : count(f)}</span>
          </button>
        )}
      </div>

      {rows.length === 0 ?
      <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-line py-12 text-center">
          <TicketIcon className="h-6 w-6 text-faint" />
          <p className="mt-2 text-sm text-muted">No invites here.</p>
        </div> :

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {rows.map(({ invite: i, status }) => {
          const isOpen = expanded === i.id;
          const pct = i.maxUses ? Math.min(100, i.uses / i.maxUses * 100) : 0;
          const expires = new Date(i.expiresAt);
          return (
            <li key={i.id}>
                <div className="flex items-center gap-3 p-4">
                  <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : i.id)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${i.email ? 'bg-sky-100 text-sky-700' : 'bg-brand-100 text-brand-700'}`}>
                      {i.email ? <MailIcon className="h-4 w-4" /> : <UsersIcon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="tabular truncate font-mono text-[15px] font-semibold leading-6 tracking-wide text-ink">{i.code}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize leading-4 ${statusStyle[status]}`}>{status}</span>
                      </span>
                      <span className="block truncate text-xs leading-5 text-muted">
                        {i.email ?? i.note ?? 'Open code'} · {status === 'active' ? `expires in ${formatDistanceToNowStrict(expires)}` : `until ${formatDate(i.expiresAt)}`}
                      </span>
                    </span>
                    <span className="hidden w-28 shrink-0 sm:block">
                      <span className="tabular block text-right text-xs font-medium text-ink">{usesLabel(i)}</span>
                      {i.maxUses !== null &&
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-subtle">
                          <span className="block h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                        </span>
                    }
                    </span>
                    <ChevronDownIcon className={`h-4 w-4 shrink-0 text-faint transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  {isOpen &&
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden">
                  
                      <div className="space-y-4 bg-subtle px-4 pb-4 pt-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => copyText(i.code, 'Code')} className={`${secondaryButton} px-3 py-2`}>
                            <CopyIcon className="h-4 w-4" /> Code
                          </button>
                          <button type="button" onClick={() => copyText(inviteLink(i.code), 'Link')} className={`${secondaryButton} px-3 py-2`}>
                            <LinkIcon className="h-4 w-4" /> Link
                          </button>
                          {status === 'active' ?
                      <button type="button" onClick={() => setToRevoke(i)} className="rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
                              Revoke
                            </button> :
                      status !== 'used' ?
                      <button
                        type="button"
                        onClick={() => {
                          extendInvite(i.id, 7);
                          toast.success('Invite reactivated for 7 days', { description: i.code });
                        }}
                        className="rounded-xl px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
                        
                              Reactivate
                            </button> :
                      null}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted">Joined with this code · {i.redeemedBy.length}</p>
                          {i.redeemedBy.length === 0 ?
                      <p className="mt-1.5 text-sm text-faint">Nobody yet.</p> :

                      <ul className="mt-2 flex flex-wrap gap-2">
                              {i.redeemedBy.map((r) =>
                        <li key={r.id} className="flex max-w-full items-center gap-2 rounded-full bg-surface py-1 pl-1 pr-3 ring-1 ring-line">
                                  <Avatar initials={initialsOf(r.name)} size="xs" />
                                  <span className="truncate text-xs font-medium text-ink">{r.name}</span>
                                  <span className="shrink-0 text-[11px] text-faint">{formatDate(r.at)}</span>
                                </li>
                        )}
                            </ul>
                      }
                        </div>
                      </div>
                    </motion.div>
                }
                </AnimatePresence>
              </li>);

        })}
        </ul>
      }

      <InviteCreateModal open={creating} onClose={() => setCreating(false)} />

      <Modal open={!!toRevoke} onClose={() => setToRevoke(null)} title={`Revoke ${toRevoke?.code ?? ''}?`} description="The code stops working immediately.">
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setToRevoke(null)} className={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (toRevoke) {
                revokeInvite(toRevoke.id);
                toast.success('Invite revoked', { description: toRevoke.code });
              }
              setToRevoke(null);
            }}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">
            
            Revoke
          </button>
        </div>
      </Modal>
    </div>);

}