import React from 'react';
import { Link } from 'react-router-dom';
import { AwardIcon, CopyIcon, ExternalLinkIcon, ShieldCheckIcon } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge } from './ui/StatusBadge';
import { etherscanTx, shortHash } from '../utils/credential';
import { formatDate } from '../utils/format';
import type { Credential } from '../types/platform';

interface CredentialCardProps {
  credential: Credential;
  showActions?: boolean;
}

export function CredentialCard({ credential, showActions = true }: CredentialCardProps) {
  const link = `${window.location.origin}/verify/${credential.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Verification link copied');
    } catch {
      toast.error('Couldn’t copy — select the link manually', { description: link });
    }
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={`flex items-start justify-between gap-3 p-5 ${credential.status === 'revoked' ? 'bg-subtle' : 'bg-brand-900 text-white'}`}>
        <div className="min-w-0">
          <p className={`text-xs ${credential.status === 'revoked' ? 'text-muted' : 'text-brand-200'}`}>Imari micro-credential</p>
          <h3 className={`mt-1 text-lg font-semibold leading-snug ${credential.status === 'revoked' ? 'text-muted line-through' : ''}`}>{credential.competency}</h3>
          <p className={`mt-1 text-sm ${credential.status === 'revoked' ? 'text-muted' : 'text-brand-100'}`}>{credential.learnerName}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${credential.status === 'revoked' ? 'bg-line text-muted' : 'bg-white/10 text-accent-400'}`}>
          <AwardIcon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
        <div>
          <dt className="text-xs text-muted">Credential ID</dt>
          <dd className="tabular font-medium text-ink">{credential.id}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Issued</dt>
          <dd className="font-medium text-ink">{formatDate(credential.issuedAt)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-muted">On-chain hash · Sepolia block {credential.block.toLocaleString()}</dt>
          <dd className="tabular truncate font-mono text-xs text-ink" title={credential.hash}>
            {shortHash(credential.hash)}
          </dd>
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <StatusBadge status={credential.status} />
          <a href={etherscanTx(credential.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-brand-700">
            Transaction <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      </dl>
      {showActions &&
      <div className="mt-auto flex border-t border-line">
          <button type="button" onClick={copyLink} className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700">
            <CopyIcon className="h-4 w-4" /> Copy link
          </button>
          <Link
          to={`/verify/${credential.id}`}
          className="flex flex-1 items-center justify-center gap-2 border-l border-line py-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700">
          
            <ShieldCheckIcon className="h-4 w-4" /> Verify
          </Link>
        </div>
      }
    </article>);

}