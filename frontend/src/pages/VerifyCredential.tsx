import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FingerprintIcon,
  LockIcon,
  SearchIcon,
  SearchXIcon,
  ShieldCheckIcon,
  ShieldXIcon } from
'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui/Spinner';
import { usePlatform } from '../contexts/PlatformContext';
import { useAuth } from '../contexts/AuthContext';
import { etherscanTx, shortHash, verifyCredential } from '../utils/credential';
import { formatDate, homeFor } from '../utils/format';
import type { Credential, VerificationOutcome } from '../types/platform';

const outcomes: Record<VerificationOutcome, {title: string;icon: typeof BadgeCheckIcon;band: string;seal: string;}> = {
  valid: { title: 'Valid credential', icon: BadgeCheckIcon, band: 'bg-emerald-50 text-emerald-800', seal: 'bg-emerald-500' },
  revoked: { title: 'Revoked', icon: ShieldXIcon, band: 'bg-rose-50 text-rose-800', seal: 'bg-rose-500' },
  mismatch: { title: 'Hash mismatch', icon: AlertTriangleIcon, band: 'bg-amber-50 text-amber-800', seal: 'bg-amber-500' },
  not_found: { title: 'Not found', icon: SearchXIcon, band: 'bg-subtle text-ink', seal: 'bg-faint' }
};

const steps = ['Find credential', 'Read Sepolia record', 'Compare hash'];
const samples = [
{ id: 'IMR-4QXA-7K2P', label: 'Valid' },
{ id: 'IMR-7DUQ-2HKS', label: 'Revoked' }];


type Result = {outcome: VerificationOutcome;credential?: Credential;};

export function VerifyCredential() {
  const { credentialId } = useParams();
  const navigate = useNavigate();
  const { credentials, recordVerification } = usePlatform();
  const { user } = useAuth();
  const [id, setId] = useState(credentialId ?? '');
  const [hash, setHash] = useState('');
  const [showHash, setShowHash] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<Result | null>(null);
  const checking = step >= 0 && step < steps.length;

  const run = (targetId: string, presentedHash?: string) => {
    if (!targetId.trim()) return;
    setResult(null);
    setStep(0);
    steps.forEach((_, i) => window.setTimeout(() => setStep(i + 1), (i + 1) * 350));
    window.setTimeout(() => {
      const r = verifyCredential(credentials, targetId, presentedHash);
      if (r.credential) recordVerification(r.credential.id);
      setResult(r);
    }, steps.length * 350 + 50);
  };

  useEffect(() => {
    if (credentialId) run(credentialId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentialId]);

  const submit = (target: string, e?: FormEvent) => {
    e?.preventDefault();
    const clean = target.trim().toUpperCase();
    setId(clean);
    if (credentialId !== clean) navigate(`/verify/${clean}`, { replace: true });
    run(clean, showHash ? hash : undefined);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Couldn’t copy');
    }
  };

  const o = result ? outcomes[result.outcome] : null;

  return (
    <div className="flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-canvas px-2 pb-[calc(56px+env(safe-area-inset-bottom))] pt-[max(8px,env(safe-area-inset-top))] sm:px-3 md:pb-3">
      <header className="flex h-14 shrink-0 items-center justify-between px-2 sm:px-3">
        <Link to="/" aria-label="Imari home">
          <Logo />
        </Link>
        <Link to={user ? homeFor(user.role) : '/login'} className="rounded-xl bg-surface px-3.5 py-2 text-sm font-semibold text-ink ring-1 ring-line transition-colors duration-150 hover:text-brand-700">
          {user ? 'Workspace' : 'Sign in'}
        </Link>
      </header>

      <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col justify-center rounded-3xl border border-line bg-surface px-5 py-10 sm:px-10">
          <div className="mx-auto w-full max-w-md">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <ShieldCheckIcon className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-ink md:text-3xl">Verify a credential</h1>
            <p className="mt-2 text-muted">Checked against its Ethereum Sepolia record.</p>

            <form onSubmit={(e) => submit(id, e)} className="mt-8">
              <label htmlFor="cred-id" className="sr-only">
                Credential ID
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 shadow-sm transition-[border-color,box-shadow] duration-150 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
                <SearchIcon className="ml-2.5 h-5 w-5 shrink-0 text-faint" />
                <input
                  id="cred-id"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="IMR-XXXX-XXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="tabular h-11 min-w-0 flex-1 border-0 bg-transparent font-mono text-base uppercase tracking-wider text-ink placeholder:text-faint focus:outline-none focus:ring-0" />
                
                <button type="submit" disabled={!id.trim() || checking} className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 disabled:bg-brand-200">
                  {checking ? <Spinner /> : <ArrowRightIcon className="h-4 w-4" />}
                  <span className="hidden sm:inline">Verify</span>
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showHash &&
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line px-3.5">
                      <FingerprintIcon className="h-4 w-4 shrink-0 text-faint" />
                      <input aria-label="Presented hash" value={hash} onChange={(e) => setHash(e.target.value)} placeholder="Presented hash 0x…" className="h-11 min-w-0 flex-1 border-0 bg-transparent font-mono text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-0" />
                    </div>
                  </motion.div>
                }
              </AnimatePresence>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-faint">Try</span>
                {samples.map((s) =>
                <button key={s.id} type="button" onClick={() => submit(s.id)} className="tabular rounded-full bg-subtle px-3 py-1.5 font-mono font-medium text-ink transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700">
                    {s.id}
                  </button>
                )}
                <button type="button" onClick={() => setShowHash((v) => !v)} className="ml-auto font-medium text-brand-700 hover:underline">
                  {showHash ? 'Hide hash' : 'Check hash'}
                </button>
              </div>
            </form>

            <p className="mt-10 flex items-center gap-2 text-xs text-muted">
              <LockIcon className="h-3.5 w-3.5 shrink-0" /> On-chain: ID, hash, status. Never scores or answers.
            </p>
          </div>
        </section>

        <section aria-live="polite" className="flex min-h-[420px] items-center justify-center rounded-3xl border border-line bg-subtle p-5 sm:p-10">
          <AnimatePresence mode="wait">
            {step < 0 && !result &&
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-sm text-center">
                <div className="mx-auto flex aspect-[4/3] w-full flex-col justify-between rounded-3xl border-2 border-dashed border-line p-6 text-left">
                  <span className="h-10 w-10 rounded-full bg-line" />
                  <span className="space-y-2">
                    <span className="block h-3 w-2/3 rounded-full bg-line" />
                    <span className="block h-3 w-1/3 rounded-full bg-line" />
                  </span>
                </div>
                <p className="mt-5 text-sm text-muted">Results appear here</p>
              </motion.div>
            }

            {checking &&
            <motion.ol key="checking" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full max-w-xs space-y-3">
                {steps.map((s, i) =>
              <li key={s} className={`flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 text-sm transition-opacity duration-200 ${i > step ? 'opacity-40' : ''}`}>
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${i < step ? 'bg-emerald-500 text-white' : 'bg-brand-100 text-brand-700'}`}>
                      {i < step ? <CheckIcon className="h-4 w-4" /> : i === step ? <Spinner className="h-3.5 w-3.5" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                    </span>
                    <span className="truncate font-medium text-ink">{s}</span>
                  </li>
              )}
              </motion.ol>
            }

            {result && o &&
            <motion.article
              key={`${result.outcome}-${result.credential?.id ?? 'none'}`}
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-xl shadow-brand-900/10">
              
                <div className={`flex items-center gap-3 px-5 py-4 ${o.band}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${o.seal}`}>
                    <o.icon className="h-5 w-5" />
                  </span>
                  <p className="min-w-0 truncate font-semibold">{o.title}</p>
                </div>

                {result.credential ?
              <div className="p-5 sm:p-6">
                    <p className="text-xs font-medium text-muted">Imari micro-credential</p>
                    <h2 className="mt-1 truncate text-2xl font-semibold leading-tight tracking-tight text-ink">{result.credential.competency}</h2>
                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                      <Detail label="Holder" value={result.credential.learnerName} />
                      <Detail label="Issued" value={formatDate(result.credential.issuedAt)} />
                      <Detail label="ID" value={result.credential.id} mono />
                      <Detail label="Issuer" value="ALU pilot" />
                    </dl>
                    <div className="mt-5 space-y-2 border-t border-line pt-4">
                      <Row label="Hash" value={shortHash(result.credential.hash)} onCopy={() => copy(result.credential!.hash, 'Hash')} />
                      <Row
                    label="Tx"
                    value={shortHash(result.credential.txHash)}
                    href={etherscanTx(result.credential.txHash)}
                    extra={`Block ${result.credential.block.toLocaleString()}`} />
                  
                    </div>
                    <button type="button" onClick={() => copy(window.location.href, 'Link')} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-subtle py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700">
                      <CopyIcon className="h-4 w-4" /> Copy verification link
                    </button>
                  </div> :

              <div className="p-6 text-sm text-muted">No credential registered with that ID.</div>
              }
              </motion.article>
            }
          </AnimatePresence>
        </section>
      </div>
    </div>);

}

function Detail({ label, value, mono }: {label: string;value: string;mono?: boolean;}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 truncate font-medium text-ink ${mono ? 'tabular font-mono text-xs leading-5' : ''}`}>{value}</dd>
    </div>);

}

function Row({ label, value, onCopy, href, extra }: {label: string;value: string;onCopy?: () => void;href?: string;extra?: string;}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-10 shrink-0 text-muted">{label}</span>
      <span className="tabular min-w-0 flex-1 truncate font-mono text-ink">{value}</span>
      {extra && <span className="hidden shrink-0 text-faint sm:inline">{extra}</span>}
      {onCopy &&
      <button type="button" onClick={onCopy} aria-label={`Copy ${label}`} className="shrink-0 rounded-md p-1.5 text-muted hover:bg-subtle hover:text-ink">
          <CopyIcon className="h-3.5 w-3.5" />
        </button>
      }
      {href &&
      <a href={href} target="_blank" rel="noreferrer" aria-label="View on Etherscan" className="shrink-0 rounded-md p-1.5 text-muted hover:bg-subtle hover:text-ink">
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      }
    </div>);

}