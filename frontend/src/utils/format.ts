import { format } from 'date-fns';
import type { Role } from '../types/platform';

export const formatDate = (iso: string) => format(new Date(iso), 'd MMM yyyy');
export const formatDateTime = (iso: string) => format(new Date(iso), 'd MMM yyyy, HH:mm');

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const initialsOf = (name: string) =>
name.
split(' ').
filter(Boolean).
slice(0, 2).
map((w) => w[0].toUpperCase()).
join('');

export const homeFor = (role: Role) => role === 'admin' ? '/admin' : '/app';

export const average = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;