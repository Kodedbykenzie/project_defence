import React, { useMemo, useState } from 'react';
import { ExternalLinkIcon, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { usePlatform } from '../../contexts/PlatformContext';
import { computeAnalytics } from '../../utils/analytics';
import { etherscanTx, shortHash } from '../../utils/credential';
import { formatDate } from '../../utils/format';
import { inputClass, primaryButton, secondaryButton } from '../../utils/styles';
import type { Credential, CredentialStatus } from '../../types/platform';

type Filter = 'all' | CredentialStatus;

export function CredentialsAdmin() {
  const platform = usePlatform();
  const { credentials, setCredentialStatus, issueCredential } = platform;
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [toRevoke, setToRevoke] = useState<Credential | null>(null);
  const [issuing, setIssuing] = useState<string | null>(null);

  const pending = useMemo(
    () => computeAnalytics(Object.values(platform.learners), platform.modules, credentials, platform.threshold).pendingIssuance,
    [platform.learners, platform.modules, credentials, platform.threshold]
  );

  const rows = credentials.
  filter((c) => filter === 'all' || c.status === filter).
  filter((c) => `${c.id} ${c.learnerName} ${c.competency}`.toLowerCase().includes(query.trim().toLowerCase())).
  sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));

  const issue = async (learnerId: string, moduleId: string) => {
    setIssuing(`${learnerId}:${moduleId}`);
    try {
      const c = await issueCredential(learnerId, moduleId);
      toast.success('Credential issued', { description: `${c.competency} · ${c.learnerName}` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Issuance failed');
    } finally {
      setIssuing(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Micro-credentials</h1>
      <p className="mt-1 text-sm text-muted">On Sepolia · revokes apply instantly.</p>

      {pending.length > 0 &&
      <section aria-labelledby="pending-heading" className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/50 p-5">
          <h2 id="pending-heading" className="font-semibold text-ink">
            Eligible, awaiting issuance
          </h2>
          <ul className="mt-3 divide-y divide-brand-100">
            {pending.map(({ learner, module }) => {
            const key = `${learner.id}:${module.id}`;
            return (
              <li key={key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-ink">
                    <span className="font-medium">{learner.name}</span> · {module.competency}
                  </span>
                  <button type="button" disabled={issuing === key} onClick={() => issue(learner.id, module.id)} className={primaryButton}>
                    {issuing === key ? 'Issuing…' : 'Issue credential'}
                  </button>
                </li>);

          })}
          </ul>
        </section>
      }

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2" role="tablist" aria-label="Filter by status">
          {(['all', 'valid', 'revoked'] as Filter[]).map((f) =>
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm capitalize transition-colors duration-150 ${filter === f ? 'bg-brand-600 text-white' : 'bg-subtle text-muted hover:text-ink'}`}>
            
              {f} <span className="tabular opacity-70">{f === 'all' ? credentials.length : credentials.filter((c) => c.status === f).length}</span>
            </button>
          )}
        </div>
        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input type="search" aria-label="Search credentials" placeholder="Search ID, holder or competency" className={`${inputClass} pl-10`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-subtle text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Credential</th>
              <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Holder</th>
              <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Issued</th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Transaction</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">Checks</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) =>
            <tr key={c.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{c.competency}</p>
                  <p className="tabular text-xs text-muted">{c.id}</p>
                  <p className="text-xs text-muted sm:hidden">{c.learnerName}</p>
                </td>
                <td className="hidden px-4 py-3 text-ink sm:table-cell">{c.learnerName}</td>
                <td className="hidden px-4 py-3 text-muted md:table-cell">{formatDate(c.issuedAt)}</td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <a href={etherscanTx(c.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-brand-700">
                    {shortHash(c.txHash)} <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </td>
                <td className="tabular hidden px-4 py-3 text-right text-muted lg:table-cell">{c.verifications}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {c.status === 'valid' ?
                <button type="button" onClick={() => setToRevoke(c)} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
                      Revoke
                    </button> :

                <button
                  type="button"
                  onClick={() => {
                    setCredentialStatus(c.id, 'valid');
                    toast.success('Credential reinstated', { description: c.id });
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
                  
                      Reinstate
                    </button>
                }
                </td>
              </tr>
            )}
            {rows.length === 0 &&
            <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No credentials match.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <Modal
        open={!!toRevoke}
        onClose={() => setToRevoke(null)}
        title="Revoke this credential?"
        description={toRevoke ? `${toRevoke.competency} held by ${toRevoke.learnerName}. Verifiers will see it as revoked.` : ''}>
        
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setToRevoke(null)} className={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (toRevoke) {
                setCredentialStatus(toRevoke.id, 'revoked');
                toast.success('Credential revoked', { description: toRevoke.id });
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