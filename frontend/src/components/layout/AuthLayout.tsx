import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheckIcon, ShieldCheckIcon } from 'lucide-react';
import { Logo } from '../Logo';
import { LanguageControl, TextSizeControl } from '../settings/PreferenceControls';
import { useAuth } from '../../contexts/AuthContext';
import { homeFor } from '../../utils/format';

const photos = [
{ src: "/828c78d1-6977-426c-a1d5-7d472b30f867.jpg", alt: 'Student checking mobile money', className: 'row-span-2' },
{ src: "/e4792703-b29b-4959-83ed-4335e1d15d9e.jpg", alt: 'Budget notebook', className: '' },
{ src: "/d1ef04d6-5b80-40d2-81a9-bde722c611e4.jpg", alt: 'Savings jar', className: '' }];


export function AuthLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const onRegister = pathname.startsWith('/register');

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-surface lg:flex lg:gap-3 lg:bg-canvas lg:p-3">
      {/* Form column */}
      <div className="flex min-h-[100dvh] w-full min-w-0 flex-col pt-safe px-safe lg:min-h-0 lg:w-[460px] lg:shrink-0 lg:rounded-3xl lg:border lg:border-line lg:bg-surface xl:w-[500px]">
        <header className="flex h-14 shrink-0 items-center justify-between px-5 lg:px-8">
          <Link to="/login" aria-label="Imari home">
            <Logo />
          </Link>
          <Link to="/verify" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
            <ShieldCheckIcon className="h-4 w-4" /> Verify
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center px-5 py-4 lg:px-8">
          <div className="mx-auto w-full max-w-[360px]">
            <Outlet />
          </div>
        </main>

        <footer className="mx-auto w-full max-w-[360px] px-5 pb-[calc(56px+env(safe-area-inset-bottom))] pt-4 lg:px-0 lg:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-subtle p-2">
            <LanguageControl />
            <TextSizeControl />
          </div>
          <p className="mt-3 text-center text-[11px] leading-4 text-faint">
            No bank details or PINs, ever ·{' '}
            <Link to="/legal/cookies" className="underline-offset-2 hover:text-brand-700 hover:underline">
              Cookies
            </Link>
          </p>
        </footer>
      </div>

      {/* Brand panel — tablets landscape and up */}
      <aside className="relative hidden min-w-0 flex-1 flex-col overflow-hidden rounded-3xl bg-brand-900 p-8 text-white lg:flex xl:p-10">
        <div className="grid h-[48%] max-h-[340px] grid-cols-[1.2fr_1fr] grid-rows-2 gap-3">
          {photos.map((p, i) =>
          <motion.img
            key={p.src}
            src={p.src}
            alt={p.alt}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.06, ease: [0.23, 1, 0.32, 1] }}
            className={`h-full w-full rounded-2xl object-cover ${p.className}`} />

          )}
        </div>

        <div className="mt-auto max-w-md">
          <p className="text-sm font-medium text-brand-300">ALU financial literacy pilot</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">{onRegister ? 'Your path starts with one code.' : 'Pick up where you left off.'}</h2>
          <p className="mt-3 text-sm leading-6 text-brand-200">A 15-question diagnostic finds your gaps. Short lessons close them. Credentials prove it.</p>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <BadgeCheckIcon className="h-4 w-4 text-emerald-300" />
            <span className="text-xs">
              <span className="font-semibold">Emergency saving</span> · verified on Sepolia
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur">
            <span className="tabular font-semibold">+24 pts</span>
            <span className="text-brand-200">avg. post-test gain</span>
          </div>
        </div>
      </aside>
    </div>);

}