import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { usePlatform } from './PlatformContext';
import { seedAccounts } from '../data/seed';
import type { Account, SessionUser } from '../types/platform';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  university: string;
  inviteCode: string;
}

type AuthResult = {ok: true;user: SessionUser;isNew?: boolean;} | {ok: false;error: string;needsInvite?: boolean;};

interface AuthValue {
  user: SessionUser | null;
  login: (email: string, password: string) => AuthResult;
  loginWithGoogle: (email: string, name: string, inviteCode?: string) => AuthResult;
  register: (input: RegisterInput) => AuthResult;
  resetPassword: (email: string, password: string) => boolean;
  logout: () => void;
  updateName: (name: string) => void;
  emailExists: (email: string) => boolean;
  resetDemo: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const strip = ({ password: _password, ...rest }: Account): SessionUser => rest;
const normalise = (email: string) => email.trim().toLowerCase();

export function AuthProvider({ children }: {children: ReactNode;}) {
  const platform = usePlatform();
  const [accounts, setAccounts] = usePersistentState<Account[]>('imari:v3:accounts', () => seedAccounts);
  const [sessionId, setSessionId] = usePersistentState<string | null>('imari:v3:session', () => null);

  const value = useMemo<AuthValue>(() => {
    const current = accounts.find((a) => a.id === sessionId);
    const create = (name: string, email: string, password: string, provider: 'password' | 'google', university: string, inviteCode: string) => {
      const account: Account = { id: `u-${Date.now()}`, name: name.trim(), email: email.trim(), password, role: 'student', provider };
      setAccounts((prev) => [...prev, account]);
      platform.addLearner({ id: account.id, name: account.name, email: account.email, university, program: 'Not set', inviteCode });
      setSessionId(account.id);
      return account;
    };
    return {
      user: current ? strip(current) : null,
      login: (email, password) => {
        const account = accounts.find((a) => normalise(a.email) === normalise(email));
        if (!account || !account.password || account.password !== password) {
          return { ok: false, error: account?.provider === 'google' ? 'This account uses Google.' : 'Email or password is incorrect.' };
        }
        setSessionId(account.id);
        return { ok: true, user: strip(account) };
      },
      loginWithGoogle: (email, name, inviteCode) => {
        const existing = accounts.find((a) => normalise(a.email) === normalise(email));
        if (existing) {
          setSessionId(existing.id);
          return { ok: true, user: strip(existing) };
        }
        if (!inviteCode) return { ok: false, error: 'No account yet. Join with an invite code.', needsInvite: true };
        const check = platform.checkInvite(inviteCode, email);
        if (!check.ok) return { ok: false, error: check.error };
        return { ok: true, user: strip(create(name, email, '', 'google', 'African Leadership University', check.invite.code)), isNew: true };
      },
      register: (input) => {
        if (accounts.some((a) => normalise(a.email) === normalise(input.email))) return { ok: false, error: 'This email already has an account.' };
        const check = platform.checkInvite(input.inviteCode, input.email);
        if (!check.ok) return { ok: false, error: check.error };
        return { ok: true, user: strip(create(input.name, input.email, input.password, 'password', input.university, check.invite.code)), isNew: true };
      },
      resetPassword: (email, password) => {
        const account = accounts.find((a) => normalise(a.email) === normalise(email));
        if (!account) return false;
        setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, password, provider: 'password' } : a));
        return true;
      },
      logout: () => setSessionId(null),
      updateName: (name) => {
        if (!current) return;
        setAccounts((prev) => prev.map((a) => a.id === current.id ? { ...a, name } : a));
        platform.renameLearner(current.id, name);
      },
      emailExists: (email) => accounts.some((a) => normalise(a.email) === normalise(email)),
      resetDemo: () => {
        setAccounts(seedAccounts);
        platform.resetPlatform();
        setSessionId(null);
      }
    };
  }, [accounts, sessionId, setAccounts, setSessionId, platform]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}