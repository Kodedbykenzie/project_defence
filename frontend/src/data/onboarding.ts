import { ClockIcon, PiggyBankIcon, ShieldCheckIcon, TrendingUpIcon, WalletIcon, PercentIcon } from 'lucide-react';
import type { DomainId } from '../types/platform';

export const goals = [
{ id: 'budget', label: 'Make my money last the whole month', domain: 'budgeting' as DomainId, icon: WalletIcon },
{ id: 'emergency', label: 'Build an emergency fund', domain: 'saving' as DomainId, icon: PiggyBankIcon },
{ id: 'debt', label: 'Avoid expensive loans and debt', domain: 'debt' as DomainId, icon: PercentIcon },
{ id: 'invest', label: 'Start investing safely', domain: 'investing' as DomainId, icon: TrendingUpIcon },
{ id: 'safety', label: 'Stay safe with mobile money', domain: 'digital' as DomainId, icon: ShieldCheckIcon }];


export const weeklyTimes = [
{ id: '15', label: '15 min', hint: 'A lesson or two' },
{ id: '30', label: '30 min', hint: 'About one module' },
{ id: '60', label: '1 hour', hint: 'Steady progress' },
{ id: '120', label: '2+ hours', hint: 'Fast track' }];


export const learningStyles = [
{ id: 'reads', label: 'Short reads' },
{ id: 'examples', label: 'Worked examples' },
{ id: 'practice', label: 'Practice quizzes' }];


export const TimeIcon = ClockIcon;