import React, { ReactNode } from "react";
import { BoxIcon } from "lucide-react";
interface EmptyStateProps {
  icon: BoxIcon;
  title: string;
  description: string;
  action?: ReactNode;
}
export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>;
}