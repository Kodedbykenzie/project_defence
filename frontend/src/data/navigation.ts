import {
  AwardIcon,
  BarChart3Icon,
  BellIcon,
  SettingsIcon,
  TicketIcon,
  BookOpenIcon,
  ClipboardCheckIcon,
  FileQuestionIcon,
  HomeIcon,
  LibraryIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon } from
'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TKey } from './i18n';

export interface NavEntry {
  label: string;
  tKey: TKey;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

export interface NavSection {
  id: string;
  tKey: TKey;
  layout: 'list' | 'grid' | 'nested';
  items: NavEntry[];
}

export const studentHome: NavEntry = { label: 'Home', tKey: 'home', to: '/app', icon: HomeIcon, end: true };
export const adminHome: NavEntry = { label: 'Home', tKey: 'home', to: '/admin', icon: HomeIcon, end: true };

export const studentNav: NavSection[] = [
{
  id: 'learning',
  tKey: 'learning',
  layout: 'list',
  items: [
  { label: 'Diagnostic', tKey: 'diagnostic', to: '/app/assessment', icon: ClipboardCheckIcon },
  { label: 'Learning path', tKey: 'learningPath', to: '/app/modules', icon: BookOpenIcon }]

},
{
  id: 'tools',
  tKey: 'tools',
  layout: 'grid',
  items: [
  { label: 'Results', tKey: 'results', to: '/app/results', icon: BarChart3Icon },
  { label: 'Credentials', tKey: 'credentials', to: '/app/credentials', icon: AwardIcon },
  { label: 'Settings', tKey: 'settings', to: '/app/settings', icon: SettingsIcon },
  { label: 'Verify', tKey: 'verify', to: '/verify', icon: ShieldCheckIcon }]

},
{
  id: 'records',
  tKey: 'records',
  layout: 'nested',
  items: [
  { label: 'Progress', tKey: 'progress', to: '/app/progress', icon: TrendingUpIcon },
  { label: 'Notifications', tKey: 'notifications', to: '/app/notifications', icon: BellIcon }]

}];


export const adminNav: NavSection[] = [
{
  id: 'content',
  tKey: 'content',
  layout: 'list',
  items: [
  { label: 'Modules', tKey: 'modules', to: '/admin/modules', icon: LibraryIcon },
  { label: 'Assessment', tKey: 'assessment', to: '/admin/assessment', icon: FileQuestionIcon }]

},
{
  id: 'people',
  tKey: 'people',
  layout: 'list',
  items: [
  { label: 'Students', tKey: 'students', to: '/admin/students', icon: UsersIcon },
  { label: 'Invites', tKey: 'invites', to: '/admin/invites', icon: TicketIcon }]

},
{
  id: 'tools',
  tKey: 'tools',
  layout: 'grid',
  items: [
  { label: 'Credentials', tKey: 'credentials', to: '/admin/credentials', icon: AwardIcon },
  { label: 'Notifications', tKey: 'notifications', to: '/admin/notifications', icon: BellIcon },
  { label: 'Settings', tKey: 'settings', to: '/admin/settings', icon: SettingsIcon },
  { label: 'Verify', tKey: 'verify', to: '/verify', icon: ShieldCheckIcon }]

}];


export const studentMobileNav: NavEntry[] = [
studentHome,
{ label: 'Diagnostic', tKey: 'diagnostic', to: '/app/assessment', icon: ClipboardCheckIcon },
{ label: 'Learn', tKey: 'learn', to: '/app/modules', icon: BookOpenIcon },
{ label: 'Progress', tKey: 'progress', to: '/app/progress', icon: TrendingUpIcon },
{ label: 'Awards', tKey: 'awards', to: '/app/credentials', icon: AwardIcon }];


export const adminMobileNav: NavEntry[] = [
adminHome,
{ label: 'Modules', tKey: 'modules', to: '/admin/modules', icon: LibraryIcon },
{ label: 'Students', tKey: 'students', to: '/admin/students', icon: UsersIcon },
{ label: 'Invites', tKey: 'invites', to: '/admin/invites', icon: TicketIcon },
{ label: 'Credentials', tKey: 'credentials', to: '/admin/credentials', icon: AwardIcon }];