import React from 'react';

const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const tones = ['bg-line', 'bg-rose-400', 'bg-amber-400', 'bg-brand-500', 'bg-emerald-500'];

export function passwordScore(pw: string) {
  if (pw.length < 8) return 0;
  return 1 + [/[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
}

export function PasswordStrength({ password }: {password: string;}) {
  if (!password) return null;
  const score = passwordScore(password);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) =>
        <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${score >= i ? tones[score] : 'bg-line'}`} />
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {labels[score]}
        {score < 3 && ' · add a capital, a number or a symbol'}
      </p>
    </div>);

}