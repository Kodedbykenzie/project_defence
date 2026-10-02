import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, ChevronRightIcon, LogOutIcon, PanelLeftIcon, SproutIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { initialsOf } from '../../utils/format';
import type { NavEntry, NavSection } from '../../data/navigation';

interface SidebarProps {
  home: NavEntry;
  sections: NavSection[];
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ home, sections, collapsed, onToggle, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside
        className={`hidden shrink-0 flex-col rounded-2xl border border-line bg-surface transition-[width] duration-200 md:flex ${
        collapsed ? 'w-[68px]' : 'w-[220px]'}`
        }>
        
        <SidebarContent home={home} sections={sections} collapsed={collapsed} onToggle={onToggle} />
      </aside>
      <AnimatePresence>
        {mobileOpen &&
        <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
            className="absolute inset-0 bg-brand-950/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCloseMobile} />
          
            <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-y-0 left-0 flex w-[260px] max-w-[85vw] flex-col bg-surface pb-safe pt-safe shadow-2xl">
            
              <SidebarContent home={home} sections={sections} collapsed={false} onClose={onCloseMobile} />
            </motion.aside>
          </div>
        }
      </AnimatePresence>
    </>);

}

interface ContentProps {
  home: NavEntry;
  sections: NavSection[];
  collapsed: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

function SidebarContent({ home, sections, collapsed, onToggle, onClose }: ContentProps) {
  const { user, logout } = useAuth();
  const { t } = usePreferences();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  if (!user) return null;
  const isOpen = (id: string) => open[id] !== false;

  return (
    <>
      <div className={`flex items-center px-3 pt-3 ${collapsed ? 'flex-col gap-2' : 'justify-between'}`}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white">
            <SproutIcon className="h-4 w-4" />
          </span>
          {!collapsed &&
          <>
              <span className="font-semibold text-ink">Imari</span>
              <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">Pilot</span>
            </>
          }
        </div>
        <button
          type="button"
          onClick={onClose ?? onToggle}
          aria-label={onClose ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-md p-1.5 text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
          
          {onClose ? <XIcon className="h-4 w-4" /> : <PanelLeftIcon className="h-4 w-4" />}
        </button>
      </div>

      <button
        type="button"
        onClick={() => toast('You’re in the ALU Financial Literacy Pilot')}
        className={`mx-2 mt-3 flex items-center gap-2 rounded-xl border border-line bg-subtle p-2 text-left transition-colors duration-150 hover:bg-brand-50 ${
        collapsed ? 'justify-center' : ''}`
        }>
        
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500 text-xs font-semibold text-white">A</span>
        {!collapsed &&
        <>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">ALU Financial Literacy Pilot</span>
            <ChevronRightIcon className="h-4 w-4 text-faint" />
          </>
        }
      </button>

      <nav aria-label="Main" className="thin-scroll mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        <NavItem entry={home} collapsed={collapsed} />
        {sections.map((section) =>
        <div key={section.id} className="pt-3">
            {!collapsed ?
          <button
            type="button"
            aria-expanded={isOpen(section.id)}
            onClick={() => setOpen((s) => ({ ...s, [section.id]: !isOpen(section.id) }))}
            className="flex w-full items-center gap-1.5 px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint transition-colors duration-150 hover:text-muted">
            
                <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen(section.id) ? '' : '-rotate-90'}`} />
                {t(section.tKey)}
              </button> :

          <div className="mx-auto mb-2 h-px w-6 bg-line" />
          }
            <AnimatePresence initial={false}>
              {(isOpen(section.id) || collapsed) &&
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden">
              
                  <div
                className={
                section.layout === 'grid' && !collapsed ?
                'grid grid-cols-2 gap-1' :
                section.layout === 'nested' && !collapsed ?
                'ml-3 space-y-0.5 border-l border-line pl-2' :
                'space-y-1'
                }>
                
                    {section.items.map((item) =>
                <NavItem key={item.to} entry={item} collapsed={collapsed} compact={section.layout !== 'list'} />
                )}
                  </div>
                </motion.div>
            }
            </AnimatePresence>
          </div>
        )}
      </nav>

      <div className="border-t border-line p-2">
        <div className={`flex items-center gap-2.5 p-1.5 ${collapsed ? 'justify-center' : ''}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{initialsOf(user.name)}</span>
          {!collapsed &&
          <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">
                {user.role === 'admin' ? 'Admin · Researcher' : 'Student'} · {user.email}
              </p>
            </div>
          }
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Log out"
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl bg-subtle py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-brand-50 hover:text-brand-700">
          
          <LogOutIcon className="h-4 w-4" />
          {!collapsed && t('logout')}
        </button>
        {!collapsed &&
        <p className="mt-2.5 text-center text-[11px] text-faint">
            <NavLink to={user.role === 'admin' ? '/admin/settings?tab=privacy' : '/app/settings?tab=privacy'} className="hover:text-brand-700">Privacy</NavLink> ·{' '}
            <NavLink to="/legal/cookies" className="hover:text-brand-700">Cookies</NavLink>
          </p>
        }
      </div>
    </>);

}

function NavItem({ entry, collapsed, compact }: {entry: NavEntry;collapsed: boolean;compact?: boolean;}) {
  const Icon = entry.icon;
  const { t } = usePreferences();
  const label = t(entry.tKey);
  return (
    <NavLink
      to={entry.to}
      end={entry.end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
      `relative flex items-center gap-2.5 rounded-xl text-sm transition-colors duration-150 ${compact ? 'px-2 py-2' : 'px-3 py-2.5'} ${
      collapsed ? 'justify-center' : ''} ${
      isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink hover:bg-subtle'}`
      }>
      
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate leading-5">{label}</span>}
      {!!entry.badge &&
      <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white">
          {entry.badge}
        </span>
      }
    </NavLink>);

}