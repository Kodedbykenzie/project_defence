import React, { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Hide the header row (for custom layouts like welcome screens). */
  bare?: boolean;
  /** Block closing via backdrop / Escape (e.g. required choices). */
  dismissible?: boolean;
  footer?: ReactNode;
}

const widths = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-2xl' };
let openCount = 0;

export function Modal({ open, title, description, onClose, children, size = 'md', bare, dismissible = true, footer }: ModalProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  // Callers often pass inline handlers; keep the latest without re-running focus/scroll-lock setup.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onClose = () => closeRef.current();
    const prevFocus = document.activeElement as HTMLElement | null;
    openCount += 1;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => {
      const target = panel.current?.querySelector<HTMLElement>('[autofocus],input,select,textarea') ?? panel.current;
      target?.focus({ preventScroll: true });
    }, 30);
    return () => {
      openCount -= 1;
      if (openCount <= 0) document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [open, dismissible]);

  return (
    <AnimatePresence>
      {open &&
      <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:p-4">
          <motion.div
          className="absolute inset-0 bg-brand-950/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={dismissible ? onClose : undefined} />
        
          <motion.div
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          aria-describedby={description ? `${id}-desc` : undefined}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          className={`relative flex max-h-[calc(100dvh-env(safe-area-inset-top)-12px)] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl shadow-brand-900/25 outline-none md:max-h-[88vh] md:rounded-2xl ${widths[size]}`}>
          
            <span aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line md:hidden" />
            {!bare &&
          <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-3 md:px-5 md:pt-5">
                <div className="min-w-0">
                  <h2 id={`${id}-title`} className="text-base font-semibold text-ink">
                    {title}
                  </h2>
                  {description &&
              <p id={`${id}-desc`} className="mt-0.5 text-sm leading-5 text-muted">
                      {description}
                    </p>
              }
                </div>
                {dismissible &&
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 shrink-0 rounded-lg p-1.5 text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink">
                    <XIcon className="h-4 w-4" />
                  </button>
            }
              </div>
          }
            {bare &&
          <h2 id={`${id}-title`} className="sr-only">
                {title}
              </h2>
          }
            <div className={`thin-scroll min-h-0 flex-1 overflow-y-auto px-4 md:px-5 ${footer ? 'pb-3' : 'pb-[calc(16px+env(safe-area-inset-bottom))] md:pb-5'} ${bare ? 'pt-3 md:pt-5' : ''}`}>
              {children}
            </div>
            {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-line px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 md:px-5 md:pb-4">{footer}</div>}
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}