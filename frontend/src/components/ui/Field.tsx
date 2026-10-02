import React from 'react';
import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ?
      <p className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p> :

      hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      }
    </div>);

}