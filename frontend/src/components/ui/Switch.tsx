import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-50 ${
      checked ? 'bg-brand-600' : 'bg-line'}`
      }>
      
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>);

}