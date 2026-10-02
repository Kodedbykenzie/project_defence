import { useEffect, useState } from 'react';

export function usePersistentState<T>(key: string, init: () => T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {

      /* fall back to initial state */}
    return init();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {

      /* storage unavailable */}
  }, [key, state]);

  return [state, setState] as const;
}