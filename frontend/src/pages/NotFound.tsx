import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { homeFor } from '../utils/format';
import { primaryButton } from '../utils/styles';

export function NotFound() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-canvas px-6 text-center">
      <Logo />
      <p className="tabular mt-10 text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">We couldn’t find that page</h1>
      <p className="mt-2 text-sm text-muted">The link may be broken or the page may have moved.</p>
      <Link to={user ? homeFor(user.role) : '/login'} className={`${primaryButton} mt-6`}>
        {user ? 'Back to your workspace' : 'Go to sign in'}
      </Link>
    </div>);

}