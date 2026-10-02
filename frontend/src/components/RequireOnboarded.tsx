import React from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';

/** Sends first-time students to the preference selector before they reach the app. */
export function RequireOnboarded({ children }: {children: ReactNode;}) {
  const { user } = useAuth();
  const { learners } = usePlatform();
  const learner = user ? learners[user.id] : undefined;
  if (user?.role === 'student' && learner && !learner.preferences) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}