import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import type { AppNotification } from '../types/platform';

export interface NotificationView extends AppNotification {
  unread: boolean;
}

/** Notifications addressed to the signed-in user, their role audience, or them directly. */
export function useNotifications() {
  const { user } = useAuth();
  const { notifications, learners, markRead } = usePlatform();

  const items = useMemo<NotificationView[]>(() => {
    if (!user) return [];
    const joined = learners[user.id]?.joinedAt ?? '';
    return notifications.
    filter(
      (n) =>
      n.recipient === user.id ||
      n.recipient === 'admins' && user.role === 'admin' ||
      n.recipient === 'students' && user.role === 'student' && n.at >= joined
    ).
    sort((a, b) => b.at.localeCompare(a.at)).
    map((n) => ({ ...n, unread: !n.readBy.includes(user.id) }));
  }, [user, notifications, learners]);

  const unread = items.filter((i) => i.unread).length;

  return {
    items,
    unread,
    markRead: (ids: string[]) => user && markRead(user.id, ids),
    markAllRead: () => user && markRead(user.id, items.filter((i) => i.unread).map((i) => i.id))
  };
}