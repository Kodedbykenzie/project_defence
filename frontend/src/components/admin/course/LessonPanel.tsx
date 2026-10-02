import React, { useRef } from 'react';
import { ArrowDownIcon, ArrowUpIcon, BoldIcon, LightbulbIcon, PilcrowIcon, Trash2Icon } from 'lucide-react';
import { AutoTextarea } from '../../ui/AutoTextarea';
import { readMinutes, wordCount } from '../../../utils/richText';
import type { LearningModule } from '../../../types/platform';

type Lesson = LearningModule['lessons'][number];

interface LessonPanelProps {
  lesson: Lesson;
  index: number;
  total: number;
  onChange: (patch: Partial<Lesson>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

export function LessonPanel({ lesson, index, total, onChange, onMove, onRemove }: LessonPanelProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const body = lesson.paragraphs.join('\n\n');
  const words = wordCount(body);

  const setBody = (text: string) => onChange({ paragraphs: text.split(/\n\s*\n/) });

  const wrapBold = () => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = body.slice(s, e) || 'bold text';
    const next = `${body.slice(0, s)}**${selected}**${body.slice(e)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + 2, s + 2 + selected.length);
    });
  };

  const newParagraph = () => {
    const el = bodyRef.current;
    setBody(`${body.trimEnd()}\n\n`);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const tool = 'flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted transition-colors duration-150 hover:bg-subtle hover:text-ink disabled:opacity-40';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold leading-4 text-brand-700">
          Lesson {index + 1} of {total}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move lesson up" className={tool}>
            <ArrowUpIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move lesson down" className={tool}>
            <ArrowDownIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={onRemove} disabled={total === 1} aria-label="Delete lesson" className={`${tool} hover:bg-rose-50 hover:text-rose-600`}>
            <Trash2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input
        aria-label="Lesson title"
        value={lesson.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Lesson title"
        className="w-full border-0 bg-transparent p-0 text-2xl font-semibold leading-tight tracking-tight text-ink placeholder:text-faint focus:outline-none focus:ring-0" />
      

      <div className="overflow-hidden rounded-2xl border border-line transition-[border-color,box-shadow] duration-150 focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
        <div className="flex items-center gap-1 border-b border-line bg-subtle px-2 py-1.5">
          <button type="button" onClick={wrapBold} className={tool} aria-label="Bold selected text">
            <BoldIcon className="h-4 w-4" /> Bold
          </button>
          <button type="button" onClick={newParagraph} className={tool}>
            <PilcrowIcon className="h-4 w-4" /> Paragraph
          </button>
          <span className="tabular ml-auto pr-2 text-xs text-faint">
            {words} words · ~{readMinutes(words)} min read
          </span>
        </div>
        <AutoTextarea
          ref={bodyRef}
          aria-label="Lesson content"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Write the lesson. Leave a blank line between paragraphs. Wrap words in **double asterisks** to bold them."
          className="block min-h-[200px] w-full border-0 bg-surface px-4 py-3.5 text-[15px] leading-7 text-ink placeholder:text-faint focus:outline-none focus:ring-0" />
        
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
        <label htmlFor={`ex-${index}`} className="flex items-center gap-2 text-sm font-medium leading-5 text-amber-900">
          <LightbulbIcon className="h-4 w-4 text-amber-600" /> Real-life example
        </label>
        <AutoTextarea
          id={`ex-${index}`}
          value={lesson.example}
          onChange={(e) => onChange({ example: e.target.value })}
          rows={2}
          placeholder="A short Kigali-based example, e.g. splitting a 120,000 RWF stipend…"
          className="mt-2 w-full border-0 bg-transparent p-0 text-sm leading-6 text-amber-950 placeholder:text-amber-700/50 focus:outline-none focus:ring-0" />
        
      </div>
    </div>);

}