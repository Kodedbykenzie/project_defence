import React, { useState, ReactNode } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon, Trash2Icon, BoxIcon } from "lucide-react";
import { Modal } from "../Modal";
import { Spinner } from "./Spinner";
import { dangerButton, primaryButton, secondaryButton } from "../../utils/styles";
type Tone = 'danger' | 'warning' | 'info' | 'success';
const tones: Record<Tone, {
  icon: BoxIcon;
  ring: string;
  button: string;
}> = {
  danger: {
    icon: Trash2Icon,
    ring: 'bg-rose-50 text-rose-600',
    button: dangerButton
  },
  warning: {
    icon: AlertTriangleIcon,
    ring: 'bg-amber-50 text-amber-600',
    button: primaryButton
  },
  info: {
    icon: InfoIcon,
    ring: 'bg-brand-50 text-brand-600',
    button: primaryButton
  },
  success: {
    icon: CheckCircle2Icon,
    ring: 'bg-emerald-50 text-emerald-600',
    button: primaryButton
  }
};
interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  tone?: Tone;
  confirmLabel?: string;
  cancelLabel?: string | null;
  /** Require the user to type this word before confirming. */
  confirmWord?: string;
  icon?: BoxIcon;
}
export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  tone = 'info',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmWord,
  icon
}: AlertDialogProps) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const t = tones[tone];
  const Icon = icon ?? t.icon;
  const blocked = !!confirmWord && typed.trim().toUpperCase() !== confirmWord.toUpperCase();
  const close = () => {
    if (busy) return;
    setTyped('');
    onClose();
  };
  const confirm = async () => {
    if (blocked) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
      setTyped('');
      onClose();
    }
  };
  return <Modal open={open} onClose={close} title={title} size="sm" bare>
      <div role="alertdialog" className="text-center">
        <span className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${t.ring}`}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-3 text-base font-semibold text-ink">{title}</p>
        {description && <div className="mt-1 text-sm leading-5 text-muted">{description}</div>}
        {confirmWord && <label className="mt-4 block text-left text-xs text-muted">
            Type <span className="font-mono font-semibold text-ink">{confirmWord}</span> to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-line px-3 font-mono text-sm uppercase focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </label>}
        <div className={`mt-5 grid gap-2 ${cancelLabel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {cancelLabel && <button type="button" onClick={close} className={secondaryButton}>
              {cancelLabel}
            </button>}
          <button type="button" onClick={onConfirm ? confirm : close} disabled={busy || blocked} className={t.button}>
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>;
}