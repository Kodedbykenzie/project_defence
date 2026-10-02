import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications } from './useNotifications';
import { usePreferences } from '../contexts/PreferencesContext';

/** Pops a toast when a new notification arrives while the user is in the app. */
export function useNotificationToasts() {
  const { items, markRead } = useNotifications();
  const navigate = useNavigate();
  const { toasts, mutedKinds } = usePreferences();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(items.map((i) => i.id));
      return;
    }
    const fresh = items.filter((i) => !seen.current!.has(i.id));
    fresh.forEach((i) => {
      seen.current!.add(i.id);
      if (!i.unread || !toasts || mutedKinds.includes(i.kind)) return;
      toast(i.title, {
        description: i.body,
        action: i.link ?
        {
          label: 'View',
          onClick: () => {
            markRead([i.id]);
            navigate(i.link!);
          }
        } :
        undefined
      });
    });
  }, [items, markRead, navigate, toasts, mutedKinds]);
}