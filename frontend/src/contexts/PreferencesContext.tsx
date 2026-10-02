import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { dictionary } from '../data/i18n';
import type { TKey } from '../data/i18n';
import type { Lang, NotificationKind } from '../types/platform';

export type TextSize = 'sm' | 'md' | 'lg';

export interface CookieConsent {
  essential: true;
  analytics: boolean;
  preferences: boolean;
  decidedAt: string;
  version: string;
}

export const COOKIE_POLICY_VERSION = '2026-09';

interface Settings {
  textSize: TextSize;
  reduceMotion: boolean;
  railOpen: boolean;
  toasts: boolean;
  mutedKinds: NotificationKind[];
  emailDigest: 'off' | 'daily' | 'weekly';
}

const defaultSettings: Settings = {
  textSize: 'md',
  reduceMotion: false,
  railOpen: true,
  toasts: true,
  mutedKinds: [],
  emailDigest: 'weekly'
};

interface PreferencesValue extends Settings {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: TKey) => string;
  update: (patch: Partial<Settings>) => void;
  toggleKind: (kind: NotificationKind) => void;
  consent: CookieConsent | null;
  setConsent: (c: Omit<CookieConsent, 'essential' | 'decidedAt' | 'version'> | null) => void;
  welcomed: string[];
  markWelcomed: (userId: string) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: {children: ReactNode;}) {
  const [language, setLanguage] = usePersistentState<Lang>('imari:v2:lang', () => 'en');
  const [settings, setSettings] = usePersistentState<Settings>('imari:v3:settings', () => defaultSettings);
  const [consent, setConsentState] = usePersistentState<CookieConsent | null>('imari:v3:cookies', () => null);
  const [welcomed, setWelcomed] = usePersistentState<string[]>('imari:v3:welcomed', () => []);
  const s = { ...defaultSettings, ...settings };

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.text = s.textSize;
    root.dataset.motion = s.reduceMotion ? 'reduce' : 'full';
    root.lang = language;
  }, [s.textSize, s.reduceMotion, language]);

  const value = useMemo<PreferencesValue>(
    () => ({
      ...s,
      language,
      setLanguage,
      t: (key) => dictionary[language][key] ?? dictionary.en[key],
      update: (patch) => setSettings((prev) => ({ ...defaultSettings, ...prev, ...patch })),
      toggleKind: (kind) =>
      setSettings((prev) => {
        const muted = prev.mutedKinds ?? [];
        return { ...defaultSettings, ...prev, mutedKinds: muted.includes(kind) ? muted.filter((k) => k !== kind) : [...muted, kind] };
      }),
      consent,
      setConsent: (c) => setConsentState(c ? { ...c, essential: true, decidedAt: new Date().toISOString(), version: COOKIE_POLICY_VERSION } : null),
      welcomed,
      markWelcomed: (id) => setWelcomed((prev) => prev.includes(id) ? prev : [...prev, id])
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, language, consent, welcomed]
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}