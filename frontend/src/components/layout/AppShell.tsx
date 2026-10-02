import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { RightPanel } from './RightPanel';
import { MobileBottomNav } from './MobileBottomNav';
import { RouteProgress } from '../ui/RouteProgress';
import { WelcomeModal } from '../WelcomeModal';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useNotificationToasts } from '../../hooks/useNotificationToasts';
import { adminHome, adminMobileNav, adminNav, studentHome, studentMobileNav, studentNav } from '../../data/navigation';
import type { Role } from '../../types/platform';

const isWide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;

export function AppShell({ role }: {role: Role;}) {
  // Tablets/small laptops get an icon-only sidebar so the side panel and content both fit.
  const [collapsed, setCollapsed] = useState(() => !isWide());
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t, railOpen, update } = usePreferences();
  useNotificationToasts();
  const home = role === 'admin' ? adminHome : studentHome;
  const sections = role === 'admin' ? adminNav : studentNav;
  const inEditor = /\/admin\/modules\/(new|.+\/edit)/.test(location.pathname);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = () => setCollapsed(!mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    document.getElementById('main-content')?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const match = [home, ...sections.flatMap((s) => s.items)].
  filter((i) => i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)).
  sort((a, b) => b.to.length - a.to.length)[0];

  return (
    <div className="flex h-[100dvh] w-full gap-2 overflow-hidden bg-canvas text-ink md:p-2 md:pl-[max(8px,env(safe-area-inset-left))] md:pr-[max(8px,env(safe-area-inset-right))]">
      <RouteProgress />
      <Sidebar
        home={home}
        sections={sections}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)} />
      
      <div className="flex min-w-0 flex-1 flex-col pt-safe md:pt-0">
        <TopBar panelOpen={railOpen && !inEditor} onTogglePanel={() => update({ railOpen: !railOpen })} onOpenMenu={() => setMobileOpen(true)} />
        <main
          id="main-content"
          className="thin-scroll min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden border-t border-line bg-surface pb-[calc(88px+env(safe-area-inset-bottom))] md:rounded-2xl md:border md:pb-20">
          
          <Outlet />
        </main>
      </div>
      <AnimatePresence>{railOpen && !inEditor && <RightPanel title={match ? t(match.tKey) : ''} onClose={() => update({ railOpen: false })} />}</AnimatePresence>
      <MobileBottomNav items={role === 'admin' ? adminMobileNav : studentMobileNav} />
      <WelcomeModal />
    </div>);

}