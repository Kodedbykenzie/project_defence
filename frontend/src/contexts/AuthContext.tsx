import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { usePlatform } from './PlatformContext';
import { seedAccounts } from '../data/seed';
import { API_CONFIGURED } from '../config/chain';
import { ApiError, authApi, getSession, onSessionChange, setSession } from '../utils/api';
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
  /** True when the account lives in the API rather than in local storage. */
  isApiBacked: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

const strip = ({ password: _password, ...rest }: Account): SessionUser => rest;
const normalise = (email: string) => email.trim().toLowerCase();

/** Turn an ApiError into the message the learner should read. */
function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
        return 'Email or password is incorrect.';
      case 'INVITE_INVALID':
        return 'That invite code doesn’t exist.';
      case 'INVITE_EXPIRED':
        return 'That invite code has expired.';
      case 'INVITE_REVOKED':
        return 'That invite code was revoked.';
      case 'INVITE_USED':
        return 'That invite code has already been used.';
      case 'INVITE_EMAIL_MISMATCH':
        return 'That invite was issued for a different email address.';
      case 'EMAIL_TAKEN':
        return 'This email already has an account.';
      case 'NEEDS_INVITE':
        return 'Join with an invite code to create a Google account.';
      case 'GOOGLE_DISABLED':
        return 'Google sign-in is not available on this deployment.';
      default:
        return err.message || fallback;
    }
  }
  if (err instanceof TypeError) return 'Cannot reach the Imari service. Check that the API is running.';
  return fallback;
}

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

    // --- API-backed session -------------------------------------------------
    // When the API is reachable the account lives in Postgres and the session
    // is a JWT pair; the local account list is only the offline fallback.
    const apiSession = getSession();

    const apiLogin = async (email: string, password: string): Promise<AuthResult> => {
      try {
        const session = await authApi.login(email, password);
        platform.adoptApiLearner(session.user.id, session.user.name, session.user.email);
        return { ok: true, user: session.user };
      } catch (err) {
        return { ok: false, error: messageFor(err, 'Email or password is incorrect.') };
      }
    };

    const apiRegister = async (input: RegisterInput): Promise<AuthResult> => {
      try {
        const session = await authApi.register({
          name: input.name,
          email: input.email,
          password: input.password,
          inviteCode: input.inviteCode,
          university: input.university,
        });
        platform.adoptApiLearner(session.user.id, session.user.name, session.user.email);
        return { ok: true, user: session.user, isNew: true };
      } catch (err) {
        return { ok: false, error: messageFor(err, 'Could not create your account.') };
      }
    };

    return {
      // In API mode the signed-in user comes from the API session.
      user: API_CONFIGURED && apiSession ? apiSession.user : current ? strip(current) : null,
      isApiBacked: API_CONFIGURED && Boolean(apiSession),

      login: async (email, password) => {
        if (API_CONFIGURED) {
          const result = await apiLogin(email, password);
          if (result.ok) return result;
          // Fall back to the offline accounts when the API cannot be reached.
          if (!(result.error.includes('Cannot reach'))) return result;
        }
        const account = accounts.find((a) => normalise(a.email) === normalise(email));
        if (!account || !account.password || account.password !== password) {
          return { ok: false, error: account?.provider === 'google' ? 'This account uses Google.' : 'Email or password is incorrect.' };
        }
        setSessionId(account.id);
        return { ok: true, user: strip(account) };
      },

      loginWithGoogle: async (email, name, inviteCode) => {
        if (API_CONFIGURED) {
          return { ok: false, error: 'Google sign-in is handled by the API — continue with your email and password.' };
        }
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

      register: async (input) => {
        if (API_CONFIGURED) {
          const result = await apiRegister(input);
          if (result.ok) return result;
          if (!(result.error.includes('Cannot reach'))) return result;
        }
        if (accounts.some((a) => normalise(a.email) === normalise(input.email))) return { ok: false, error: 'This email already has an account.' };
        const check = platform.checkInvite(input.inviteCode, input.email);
        if (!check.ok) return { ok: false, error: check.error };
        return { ok: true, user: strip(create(input.name, input.email, input.password, 'password', input.university, check.invite.code)), isNew: true };
      },

      resetPassword: (email, password) => {
        const account = accounts.find((a) => normalise(a.email) === normalise(email));
        if (!account) return false;
        setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, password, provider: 'password' } : a)));
        return true;
      },

      logout: () => {
        if (API_CONFIGURED) {
          void authApi.logout();
          setSession(null);
        }
        // Always clear the offline fallback session too — otherwise a stale
        // local account keeps the UI "signed in" after an API logout.
        setSessionId(null);
      },

      updateName: (name) => {
        if (API_CONFIGURED) {
          const session = getSession();
          if (!session) return;
          setSession({ ...session, user: { ...session.user, name } });
          platform.adoptApiLearner(session.user.id, name, session.user.email);
          return;
        }
        if (!current) return;
        setAccounts((prev) => prev.map((a) => (a.id === current.id ? { ...a, name } : a)));
        platform.renameLearner(current.id, name);
      },

      emailExists: (email) => accounts.some((a) => normalise(a.email) === normalise(email)),

      resetDemo: () => {
        setAccounts(seedAccounts);
        platform.resetPlatform();
        setSessionId(null);
        setSession(null);
      },
    };
  }, [accounts, sessionId, setAccounts, setSessionId, platform]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/** Re-render the tree when the API session changes. */
export function useSessionListener(onChange: (userId: string | null) => void): void {
  React.useEffect(() => {
    const handler = (next: { user: { id: string } } | null) => onChange(next?.user.id ?? null);
    handler(getSession());
    return onSessionChange(handler);
  }, [onChange]);
}
