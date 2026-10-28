import { API_URL } from '../config/chain';
import type { SessionUser } from '../types/platform';

/**
 * Typed client for the Imari API.
 *
 * The client owns the session: the access token, the opaque refresh token and
 * the signed-in user. It refreshes the access token transparently when a
 * request comes back 401, and it notifies subscribers when the session
 * changes so the React contexts can react without importing each other.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const STORAGE_KEY = 'imari:v3:api-session';

// --------------------------------------------------------------- session state

let session: StoredSession | null = readStoredSession();
const listeners = new Set<(next: StoredSession | null) => void>();

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function persist(next: StoredSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private browsing — the session simply does not survive a reload */
  }
}

/** The current session, or null when nobody is signed in. */
export function getSession(): StoredSession | null {
  return session;
}

/** Replace the session and notify every subscriber. */
export function setSession(next: StoredSession | null): void {
  session = next;
  persist(next);
  for (const listener of listeners) listener(next);
}

/** Subscribe to session changes. Returns an unsubscribe function. */
export function onSessionChange(listener: (next: StoredSession | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ------------------------------------------------------------------ requests

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Skip the Authorization header (used by the public auth endpoints). */
  anonymous?: boolean;
  /** Internal: prevents an infinite refresh loop. */
  retry?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the refresh token for a new access token. Concurrent callers share
 * one refresh so a burst of 401s cannot invalidate the token family.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (!session?.refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session!.refreshToken }),
      });
      if (!res.ok) {
        // The refresh token is spent or was revoked — the session is over.
        setSession(null);
        return false;
      }
      const body = await res.json();
      setSession({
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        user: session!.user,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Perform an authenticated request, refreshing the token once on 401. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, anonymous = false, retry = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!anonymous && session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && !anonymous && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, { ...options, retry: false });
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload?.code ?? 'REQUEST_FAILED',
      payload?.message ?? `Request failed (${res.status}).`,
      payload?.details,
    );
  }
  return payload as T;
}

// ------------------------------------------------------------------- auth api

export const authApi = {
  async login(email: string, password: string): Promise<Session> {
    const body = await request<any>('/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
    });
    const session: StoredSession = {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      user: {
        id: body.user.id,
        name: body.user.name,
        email: body.user.email,
        role: body.user.role,
        provider: body.user.provider,
      },
    };
    setSession(session);
    return session;
  },

  async register(input: {
    name: string;
    email: string;
    password: string;
    inviteCode: string;
    university?: string;
    consent?: boolean;
  }): Promise<Session> {
    const body = await request<any>('/v1/auth/register', {
      method: 'POST',
      body: input,
      anonymous: true,
    });
    const session: StoredSession = {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      user: {
        id: body.user.id,
        name: body.user.name,
        email: body.user.email,
        role: body.user.role,
        provider: body.user.provider,
      },
    };
    setSession(session);
    return session;
  },

  async logout(): Promise<void> {
    const token = session?.refreshToken;
    // Clear locally first: the user must never stay "signed in" because the
    // network failed.
    setSession(null);
    if (!token) return;
    try {
      await request('/v1/auth/logout', { method: 'POST', body: { refreshToken: token }, anonymous: true });
    } catch {
      /* the session is already gone locally */
    }
  },

  async checkInvite(code: string, email?: string) {
    return request<any>('/v1/auth/invites/check', {
      method: 'POST',
      body: { code, email },
      anonymous: true,
    });
  },
};
