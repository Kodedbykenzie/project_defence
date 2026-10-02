import React from 'react';

interface AvatarProps {
  initials: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizes = {
  xs: 'h-6 w-6 text-[10px] leading-none',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg'
};

export function Avatar({ initials, color = 'bg-brand-500', size = 'sm' }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${sizes[size]}`}>
      
      {initials}
    </span>);

}