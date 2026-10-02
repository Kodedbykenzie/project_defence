import React from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { AwardIcon, BookOpenIcon, ClipboardCheckIcon, SparklesIcon, TicketIcon, UserPlusIcon, BoxIcon } from "lucide-react";
import { NotificationView } from "../../hooks/useNotifications";
import { NotificationKind } from "../../types/platform";
export const kindStyle: Record<NotificationKind, {
  icon: BoxIcon;
  tone: string;
}> = {
  credential: {
    icon: AwardIcon,
    tone: 'bg-brand-100 text-brand-700'
  },
  invite: {
    icon: TicketIcon,
    tone: 'bg-sky-100 text-sky-700'
  },
  student: {
    icon: UserPlusIcon,
    tone: 'bg-emerald-100 text-emerald-700'
  },
  assessment: {
    icon: ClipboardCheckIcon,
    tone: 'bg-amber-100 text-amber-700'
  },
  course: {
    icon: BookOpenIcon,
    tone: 'bg-accent-500/10 text-accent-600'
  },
  system: {
    icon: SparklesIcon,
    tone: 'bg-subtle text-muted'
  }
};
export function NotificationRow({
  item,
  onOpen,
  compact




}: {item: NotificationView;onOpen: (item: NotificationView) => void;compact?: boolean;}) {
  const {
    icon: Icon,
    tone
  } = kindStyle[item.kind];
  return <button type="button" onClick={() => onOpen(item)} className={`flex w-full min-w-0 items-start gap-3 rounded-xl text-left transition-colors duration-150 hover:bg-subtle ${compact ? 'px-2.5 py-2' : 'px-3 py-3'}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-full ${tone} ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm leading-5 ${item.unread ? 'font-semibold text-ink' : 'text-ink'}`}>{item.title}</span>
        <span className="block truncate text-xs leading-5 text-muted">{item.body}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
        <span className="tabular whitespace-nowrap text-[11px] leading-4 text-faint">{formatDistanceToNowStrict(new Date(item.at))}</span>
        {item.unread && <span className="h-2 w-2 rounded-full bg-accent-500" aria-label="Unread" />}
      </span>
    </button>;
}