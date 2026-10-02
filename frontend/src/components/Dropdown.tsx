import React, { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useClickOutside } from '../hooks/useClickOutside';

interface DropdownProps {
  label: string;
  trigger: (open: boolean) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  widthClass?: string;
  triggerClassName?: string;
}

export function Dropdown({ label, trigger, children, align = 'left', widthClass = 'w-56', triggerClassName = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}>
        
        {trigger(open)}
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          role="menu"
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className={`absolute top-full z-40 mt-2 rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-brand-900/10 ${widthClass} ${
          align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`
          }>
          
            {children(close)}
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}

interface MenuItemProps {
  children: ReactNode;
  onSelect: () => void;
  active?: boolean;
}

export function MenuItem({ children, onSelect, active }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-brand-50 ${
      active ? 'font-medium text-brand-700' : 'text-ink'}`
      }>
      
      {children}
    </button>);

}