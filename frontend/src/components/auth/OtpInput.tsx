import React, { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  invalid?: boolean;
}

export function OtpInput({ value, onChange, length = 6, invalid }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = digits.map((x, j) => j === i ? d : x).join('').slice(0, length);
    onChange(next);
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-between gap-1.5" role="group" aria-label="Verification code">
      {digits.map((d, i) =>
      <input
        key={i}
        ref={(el) => {
          refs.current[i] = el;
        }}
        inputMode="numeric"
        autoComplete={i === 0 ? 'one-time-code' : 'off'}
        maxLength={1}
        aria-label={`Digit ${i + 1}`}
        value={d}
        onPaste={onPaste}
        onKeyDown={(e) => onKey(i, e)}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(-1);
          setAt(i, v);
          if (v && i < length - 1) refs.current[i + 1]?.focus();
        }}
        className={`tabular h-12 w-full min-w-0 rounded-lg border bg-surface text-center text-lg font-semibold md:h-11 text-ink transition-[border-color,box-shadow] duration-150 focus:outline-none focus:ring-4 ${
        invalid ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : 'border-line focus:border-brand-400 focus:ring-brand-100'}`
        } />

      )}
    </div>);

}