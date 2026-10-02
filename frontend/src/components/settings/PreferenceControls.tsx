import React from 'react';
import { motion } from 'framer-motion';
import { usePreferences } from '../../contexts/PreferencesContext';
import type { TextSize } from '../../contexts/PreferencesContext';
import { languageOptions } from '../../data/i18n';

interface SegmentOption<T extends string> {
  id: T;
  label: React.ReactNode;
  aria?: string;
}

export function Segmented<T extends string>({ value, options, onChange, name, full }: {value: T;options: SegmentOption<T>[];onChange: (v: T) => void;name: string;full?: boolean;}) {
  return (
    <div role="radiogroup" aria-label={name} className={`${full ? 'grid' : 'inline-grid'} rounded-lg bg-subtle p-0.5`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.aria}
            onClick={() => onChange(o.id)}
            className="relative min-w-[40px] rounded-md px-2.5 py-1.5 text-xs font-semibold leading-4">
            
            {active && <motion.span layoutId={`seg-${name}`} className="absolute inset-0 rounded-md bg-surface shadow-sm" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <span className={`relative ${active ? 'text-brand-700' : 'text-muted'}`}>{o.label}</span>
          </button>);

      })}
    </div>);

}

export function LanguageControl({ full }: {full?: boolean;}) {
  const { language, setLanguage } = usePreferences();
  return <Segmented name="Language" full={full} value={language} onChange={setLanguage} options={languageOptions.map((l) => ({ id: l.id, label: l.short, aria: l.native }))} />;
}

export function TextSizeControl({ full }: {full?: boolean;}) {
  const { textSize, update } = usePreferences();
  return (
    <Segmented<TextSize>
      name="Text size"
      full={full}
      value={textSize}
      onChange={(v) => update({ textSize: v })}
      options={[
      { id: 'sm', label: <span className="text-[10px]">A</span>, aria: 'Small text' },
      { id: 'md', label: <span className="text-xs">A</span>, aria: 'Default text' },
      { id: 'lg', label: <span className="text-sm">A</span>, aria: 'Large text' }]
      } />);


}