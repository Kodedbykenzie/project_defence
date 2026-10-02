import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

/** Textarea that grows with its content so long lesson text never gets clipped. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function AutoTextarea({ value, onChange, className = '', ...props }, forwarded) {
  const inner = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, []);

  useEffect(resize, [value, resize]);

  return (
    <textarea
      ref={(el) => {
        inner.current = el;
        if (typeof forwarded === 'function') forwarded(el);else
        if (forwarded) forwarded.current = el;
      }}
      value={value}
      onChange={onChange}
      className={`resize-none overflow-hidden ${className}`}
      {...props} />);


});