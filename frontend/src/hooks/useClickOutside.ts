import { useEffect } from 'react';
import type { RefObject } from 'react';

export function useClickOutside(ref: RefObject<HTMLElement>, active: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!active) return;
    const handlePointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside();
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [ref, active, onOutside]);
}