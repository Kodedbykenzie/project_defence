import React from 'react';

interface StripItem {
  key: string;
  label: string;
  value: number;
}

interface ScoreStripProps {
  title: string;
  summary: string;
  items: StripItem[];
  marker: number;
  emptyText?: string;
}

const ROW = 30;
const pos = (v: number) => 3 + v * 0.94;

/** A 0–100% scale with each domain placed at its score and the threshold drawn as a marker. */
export function ScoreStrip({ title, summary, items, marker, emptyText }: ScoreStripProps) {
  const height = Math.max(items.length, 4) * ROW + 52;
  return (
    <section aria-labelledby="score-strip">
      <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2 id="score-strip" className="font-semibold leading-snug text-ink">
          {title}
        </h2>
        <p className="text-sm leading-snug text-muted sm:text-right">{summary}</p>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-subtle" style={{ height }}>
        {Array.from({ length: 11 }, (_, i) =>
        <div key={i} className="absolute bottom-8 top-0 w-px bg-line" style={{ left: `${pos(i * 10)}%` }} />
        )}
        {[0, 20, 40, 60, 80, 100].map((v) =>
        <span key={v} className="tabular absolute bottom-2.5 -translate-x-1/2 text-[11px] leading-none text-faint" style={{ left: `${pos(v)}%` }}>
            {v}%
          </span>
        )}
        {items.map((item, i) => {
          const weak = item.value < marker;
          return (
            <div
              key={item.key}
              title={`${item.label}: ${item.value}%`}
              className={`absolute flex h-6 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-xs leading-none ${
              weak ? 'border-accent-500/30 bg-accent-500/10 text-accent-600' : 'border-brand-200 bg-brand-100 text-brand-800'}`
              }
              style={{ left: `${pos(Math.min(Math.max(item.value, 7), 93))}%`, top: 12 + i * ROW }}>
              
              <span className="tabular font-semibold">{item.value}%</span>
              <span className="hidden sm:inline">{item.label}</span>
            </div>);

        })}
        <div className="absolute bottom-8 top-0 w-0.5 -translate-x-1/2 bg-accent-500" style={{ left: `${pos(marker)}%` }} aria-label={`Threshold ${marker}%`}>
          <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-500" />
        </div>
        {items.length === 0 && emptyText && <p className="absolute inset-x-6 top-1/3 text-center text-sm text-muted">{emptyText}</p>}
      </div>
    </section>);

}