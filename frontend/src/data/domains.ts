import { PiggyBankIcon, ShieldCheckIcon, TrendingUpIcon, WalletIcon, PercentIcon } from 'lucide-react';
import type { Domain } from '../types/platform';

export const domains: Domain[] = [
{ id: 'budgeting', name: 'Budgeting', short: 'Budget', code: 'BU', color: 'bg-sky-500', description: 'Planning where your allowance, stipend or income goes each month.', icon: WalletIcon },
{ id: 'saving', name: 'Saving & emergency funds', short: 'Saving', code: 'SA', color: 'bg-emerald-500', description: 'Building a cushion for the unexpected and a habit of paying yourself first.', icon: PiggyBankIcon },
{ id: 'debt', name: 'Debt & interest', short: 'Debt', code: 'DE', color: 'bg-amber-500', description: 'Understanding the true cost of borrowing, including digital loans.', icon: PercentIcon },
{ id: 'investing', name: 'Investment basics', short: 'Investing', code: 'IN', color: 'bg-rose-500', description: 'Risk, return, diversification and spotting investment scams.', icon: TrendingUpIcon },
{ id: 'digital', name: 'Digital financial safety', short: 'Digital', code: 'DS', color: 'bg-brand-500', description: 'Using mobile money and financial apps safely and recognising fraud.', icon: ShieldCheckIcon }];


export const defaultThreshold = 60;

export const universities = [
'African Leadership University',
'University of Rwanda',
'Adventist University of Central Africa',
'Mount Kenya University Rwanda',
'Other university in Kigali'];