import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2Icon, ClockIcon, LightbulbIcon, MonitorIcon, PenLineIcon, SmartphoneIcon, TargetIcon, XCircleIcon } from 'lucide-react';
import { domains } from '../../../data/domains';
import { renderRich } from '../../../utils/richText';
import type { LearningModule } from '../../../types/platform';

interface CoursePreviewProps {
  module: LearningModule;
  section: string;
}

export function CoursePreview({ module, section }: CoursePreviewProps) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [picked, setPicked] = useState<Record<number, number>>({});
  const domain = domains.find((d) => d.id === module.domain)!;
  const lessonIdx = section.startsWith('lesson-') ? Number(section.split('-')[1]) : -1;
  const steps = [...module.lessons.map((l) => l.title || 'Untitled'), 'Activity', 'Quiz'];
  const activeStep = lessonIdx >= 0 ? lessonIdx : section === 'activity' ? module.lessons.length : section === 'quiz' ? module.lessons.length + 1 : -1;

  useEffect(() => setPicked({}), [section]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold leading-5 text-ink">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live preview
        </p>
        <div className="flex rounded-lg bg-subtle p-0.5" role="radiogroup" aria-label="Preview device">
          {(['mobile', 'desktop'] as const).map((d) =>
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={device === d}
            aria-label={d === 'mobile' ? 'Phone' : 'Desktop'}
            onClick={() => setDevice(d)}
            className={`rounded-md p-1.5 transition-colors duration-150 ${device === d ? 'bg-surface text-brand-700 shadow-sm' : 'text-muted hover:text-ink'}`}>
            
              {d === 'mobile' ? <SmartphoneIcon className="h-4 w-4" /> : <MonitorIcon className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface ${device === 'mobile' ? 'max-w-[320px] rounded-[36px] border-[10px] border-ink shadow-xl shadow-brand-900/10' : 'rounded-xl border border-line shadow-lg shadow-brand-900/5'}`}>
        {device === 'mobile' ?
        <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[10px] font-semibold text-ink">
            <span>9:41</span>
            <span className="h-4 w-16 rounded-full bg-ink" />
            <span>5G</span>
          </div> :

        <div className="flex items-center gap-1.5 border-b border-line bg-subtle px-3 py-2">
            {[0, 1, 2].map((i) =>
          <span key={i} className="h-2 w-2 rounded-full bg-line" />
          )}
            <span className="ml-2 truncate rounded bg-surface px-2 py-0.5 text-[10px] text-faint">imari.rw/app/modules/{module.id}</span>
          </div>
        }

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold leading-none text-white ${domain.color}`}>
            <domain.icon className="h-3 w-3" /> {domain.short}
          </span>
          <h3 className="mt-2.5 text-[17px] font-semibold leading-snug text-ink">{module.title || 'Untitled course'}</h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] leading-4 text-muted">
            <ClockIcon className="h-3 w-3" /> {module.minutes} min · {module.lessons.length} lessons · pass {module.passingScore}%
          </p>

          {activeStep >= 0 &&
          <div className="mt-4 flex gap-1">
              {steps.map((s, i) =>
            <span key={i} title={s} className={`h-1 flex-1 rounded-full ${i <= activeStep ? 'bg-brand-600' : 'bg-line'}`} />
            )}
            </div>
          }

          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }} className="mt-4">
              {section === 'overview' &&
              <>
                  <p className="text-[13px] leading-relaxed text-muted">{module.summary || <span className="italic text-faint">Course summary appears here…</span>}</p>
                  <p className="mt-5 text-[11px] font-semibold leading-4 text-ink">You’ll be able to</p>
                  <ul className="mt-2 space-y-2">
                    {module.objectives.filter((o) => o.trim()).map((o, i) =>
                  <li key={i} className="flex gap-2 text-[12px] leading-5 text-ink">
                        <TargetIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" /> {o}
                      </li>
                  )}
                  </ul>
                  <div className="mt-5 rounded-xl bg-brand-50 p-3">
                    <p className="text-[11px] leading-4 text-brand-800">Earn the credential</p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-5 text-brand-900">{module.competency || '—'}</p>
                  </div>
                  <span className="mt-5 flex h-10 items-center justify-center rounded-xl bg-brand-600 text-[13px] font-semibold text-white">Start course</span>
                </>
              }

              {lessonIdx >= 0 && module.lessons[lessonIdx] &&
              <>
                  <p className="text-[10px] font-medium leading-4 text-brand-700">
                    Lesson {lessonIdx + 1} of {module.lessons.length}
                  </p>
                  <h4 className="mt-1 text-[15px] font-semibold leading-snug text-ink">{module.lessons[lessonIdx].title || 'Untitled lesson'}</h4>
                  <div className="mt-3 space-y-3">
                    {module.lessons[lessonIdx].paragraphs.filter((p) => p.trim()).length === 0 && <p className="text-[12px] italic text-faint">Start writing to see the lesson here…</p>}
                    {module.lessons[lessonIdx].paragraphs.filter((p) => p.trim()).map((p, i) =>
                  <p key={i} className="text-[13px] leading-relaxed text-muted">
                        {renderRich(p)}
                      </p>
                  )}
                  </div>
                  {module.lessons[lessonIdx].example.trim() &&
                <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <LightbulbIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <p className="text-[12px] leading-5 text-amber-900">{renderRich(module.lessons[lessonIdx].example)}</p>
                    </div>
                }
                  <span className="mt-5 flex h-10 items-center justify-center rounded-xl bg-brand-600 text-[13px] font-semibold text-white">Mark as read</span>
                </>
              }

              {section === 'activity' &&
              <>
                  <p className="flex items-center gap-1.5 text-[10px] font-medium leading-4 text-brand-700">
                    <PenLineIcon className="h-3 w-3" /> Practical activity
                  </p>
                  <h4 className="mt-1 text-[15px] font-semibold leading-snug text-ink">{module.activity.title || 'Activity'}</h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{module.activity.prompt || <span className="italic text-faint">Activity prompt appears here…</span>}</p>
                  <div className="mt-3 h-24 rounded-xl border border-line bg-subtle p-2.5 text-[11px] text-faint">Type your response…</div>
                </>
              }

              {section === 'quiz' &&
              <div className="space-y-5">
                  {module.quiz.length === 0 && <p className="text-[12px] italic text-faint">Add questions to preview the quiz.</p>}
                  {module.quiz.map((q, qi) =>
                <div key={q.id}>
                      <p className="text-[10px] font-medium leading-4 text-brand-700">Question {qi + 1}</p>
                      <p className="mt-1 text-[13px] font-medium leading-snug text-ink">{q.prompt || <span className="italic text-faint">Question text…</span>}</p>
                      <div className="mt-2 space-y-1.5">
                        {q.options.map((o, oi) => {
                      const chosen = picked[qi] === oi;
                      const reveal = picked[qi] !== undefined;
                      const correct = oi === q.answer;
                      return (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                          className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12px] leading-4 transition-colors duration-150 ${
                          reveal && correct ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : chosen ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-line text-ink hover:border-brand-200'}`
                          }>
                          
                              <span className="flex-1">{o || <span className="text-faint">Option {String.fromCharCode(65 + oi)}</span>}</span>
                              {reveal && correct && <CheckCircle2Icon className="h-3.5 w-3.5 shrink-0" />}
                              {chosen && !correct && <XCircleIcon className="h-3.5 w-3.5 shrink-0" />}
                            </button>);

                    })}
                      </div>
                      {picked[qi] !== undefined && q.explanation && <p className="mt-2 text-[11px] leading-4 text-muted">{q.explanation}</p>}
                    </div>
                )}
                </div>
              }
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-3 text-center text-xs leading-4 text-faint">Exactly what students see · updates as you type</p>
    </div>);

}