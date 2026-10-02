import React from 'react';
import { SproutIcon } from 'lucide-react';

interface LogoProps {
  compact?: boolean;
  inverted?: boolean;
}

export function Logo({ compact, inverted }: LogoProps) {
  return (
    <span className="flex items-center gap-2">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${inverted ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'}`}>
        <SproutIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      {!compact && <span className={`text-[17px] font-semibold tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}>Imari</span>}
    </span>);

}