import React from 'react';
import type { CredentialStatus, ModuleStatus } from '../../types/platform';

type Status = ModuleStatus | CredentialStatus | 'recommended';

const styles: Record<Status, {label: string;className: string;}> = {
  not_started: { label: 'Not started', className: 'bg-subtle text-muted' },
  in_progress: { label: 'In progress', className: 'bg-brand-50 text-brand-700' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700' },
  valid: { label: 'Valid', className: 'bg-emerald-50 text-emerald-700' },
  revoked: { label: 'Revoked', className: 'bg-rose-50 text-rose-700' },
  recommended: { label: 'Recommended', className: 'bg-accent-500/10 text-accent-600' }
};

export function StatusBadge({ status }: {status: Status;}) {
  const s = styles[status];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}