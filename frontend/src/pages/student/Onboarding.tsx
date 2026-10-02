import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClipboardCheckIcon, ClockIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '../../components/Logo';
import { Avatar } from '../../components/Avatar';
import { domains } from '../../data/domains';
import { goals, learningStyles, weeklyTimes } from '../../data/onboarding';
import { languageOptions } from '../../data/i18n';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useLearner } from '../../hooks/useLearner';
import { curateModules } from '../../utils/curation';
import { primaryButton, secondaryButton } from '../../utils/styles';
import type { DomainId, Lang, LearnerPreferences } from '../../types/platform';

const STEPS = 4;

export function Onboarding() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get('edit') === '1';
  const { learner, platform } = useLearner();
  const { language, setLanguage } = usePreferences();
  const existing = learner?.preferences;
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<DomainId[]>(existing?.interests ?? []);
  const [goal, setGoal] = useState(existing?.goal ?? '');
  const [weeklyTime, setWeeklyTime] = useState(existing?.weeklyTime ?? '30');
  const [style, setStyle] = useState(existing?.style ?? 'examples');
  const [lang, setLang] = useState<Lang>(existing?.language ?? language);
  const [saved, setSaved] = useState<LearnerPreferences | null>(null);

  if (!learner) return null;
  if (existing && !editing && !saved) return <Navigate to="/app" replace />;

  const canContinue = [interests.length > 0, !!goal, !!weeklyTime && !!style, !!lang][step] ?? true;

  const save = (prefs: Omit<LearnerPreferences, 'completedAt'>) => {
    const full = { ...prefs, completedAt: new Date().toISOString() };
    platform.savePreferences(learner.id, full);
    setLanguage(full.language);
    setSaved(full);
  };

  const next = () => {
    if (step === STEPS - 1) {
      save({ interests, goal, weeklyTime, style, language: lang });
      toast.success('Preferences saved');
    }
    setStep((s) => s + 1);
  };

  const skip = () => {
    save({ interests: domains.map((d) => d.id), goal: goal || 'budget', weeklyTime, style, language: lang });
    navigate('/app', { replace: true });
  };

  const curated = saved ? curateModules(platform.modules, saved).slice(0, 3) : [];

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <Logo />
        {step < STEPS && !editing &&
        <button type="button" onClick={skip} className="rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:text-ink">
            Skip for now
          </button>
        }
      </header>

      {step < STEPS &&
      <div className="mx-auto flex w-full max-w-3xl gap-1.5 px-5" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) =>
        <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <motion.span className="block h-full rounded-full bg-brand-600" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} />
            </span>
        )}
        </div>
      }

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-32 pt-8 sm:pt-12">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
            {step === 0 &&
            <>
                <Heading title={`Hi ${learner.name.split(' ')[0]} — what do you want to get better at?`} text="Pick as many as you like. We’ll use this to curate your first courses." />
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {domains.map((d) => {
                  const on = interests.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setInterests((xs) => on ? xs.filter((x) => x !== d.id) : [...xs, d.id])}
                      className={`relative flex gap-3.5 rounded-2xl border p-4 text-left transition-colors duration-150 ${on ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface hover:border-brand-200'}`}>
                      
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${d.color}`}>
                          <d.icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 pr-6">
                          <span className="block font-medium leading-6 text-ink">{d.name}</span>
                          <span className="mt-0.5 block text-sm leading-5 text-muted">{d.description}</span>
                        </span>
                        <Check on={on} />
                      </button>);

                })}
                </div>
              </>
            }

            {step === 1 &&
            <>
                <Heading title="What’s your main goal right now?" text="We’ll put courses for this goal at the top of your list." />
                <div role="radiogroup" className="mt-8 space-y-2.5">
                  {goals.map((g) => {
                  const on = goal === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setGoal(g.id)}
                      className={`relative flex w-full items-center gap-3.5 rounded-2xl border px-4 py-4 text-left transition-colors duration-150 ${on ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface hover:border-brand-200'}`}>
                      
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-brand-600 text-white' : 'bg-subtle text-muted'}`}>
                          <g.icon className="h-4 w-4" />
                        </span>
                        <span className="pr-6 font-medium leading-6 text-ink">{g.label}</span>
                        <Check on={on} />
                      </button>);

                })}
                </div>
              </>
            }

            {step === 2 &&
            <>
                <Heading title="How much time can you give each week?" text="Modules take 10–15 minutes, so even a little time goes a long way." />
                <div role="radiogroup" aria-label="Weekly time" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {weeklyTimes.map((w) => {
                  const on = weeklyTime === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setWeeklyTime(w.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors duration-150 ${on ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface hover:border-brand-200'}`}>
                      
                        <ClockIcon className={`h-4 w-4 ${on ? 'text-brand-700' : 'text-faint'}`} />
                        <span className="mt-3 block text-lg font-semibold leading-6 text-ink">{w.label}</span>
                        <span className="mt-0.5 block text-xs leading-4 text-muted">{w.hint}</span>
                      </button>);

                })}
                </div>
                <h2 className="mt-10 font-semibold text-ink">How do you like to learn?</h2>
                <div role="radiogroup" aria-label="Learning style" className="mt-3 flex flex-wrap gap-2">
                  {learningStyles.map((s) => {
                  const on = style === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setStyle(s.id)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium leading-5 transition-colors duration-150 ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-surface text-ink hover:border-brand-200'}`}>
                      
                        {on && <CheckIcon className="h-4 w-4" />}
                        {s.label}
                      </button>);

                })}
                </div>
              </>
            }

            {step === 3 &&
            <>
                <Heading title="Which language do you prefer?" text="You can switch any time from the language button." />
                <div role="radiogroup" className="mt-8 grid gap-3 sm:grid-cols-3">
                  {languageOptions.map((l) => {
                  const on = lang === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setLang(l.id)}
                      className={`relative rounded-2xl border p-5 text-left transition-colors duration-150 ${on ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface hover:border-brand-200'}`}>
                      
                        <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold ${on ? 'bg-brand-600 text-white' : 'bg-subtle text-muted'}`}>{l.short}</span>
                        <span className="mt-4 block text-lg font-semibold leading-6 text-ink">{l.native}</span>
                        <span className="block text-sm leading-5 text-muted">{l.label}</span>
                        <Check on={on} />
                      </button>);

                })}
                </div>
              </>
            }

            {step === STEPS &&
            <>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
                  <SparklesIcon className="h-6 w-6" />
                </span>
                <Heading title="Your starter plan is ready" text="Curated from your interests and goal. The diagnostic will fine-tune it by finding your exact gaps." />
                <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {curated.map(({ module, reason }) => {
                  const d = domains.find((x) => x.id === module.domain)!;
                  return (
                    <li key={module.id} className="flex items-center gap-4 px-4 py-4">
                        <Avatar initials={d.code} color={d.color} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium leading-6 text-ink">{module.title}</p>
                          <p className="text-xs leading-4 text-muted">
                            {module.minutes} min · {d.short}
                          </p>
                        </div>
                        {reason && <span className="hidden whitespace-nowrap rounded-full bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-600 sm:inline">{reason}</span>}
                      </li>);

                })}
                </ul>
                <div className="mt-6 flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm leading-6 text-brand-900">
                  <ClipboardCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                  Next, take the 15-question diagnostic (about 8 minutes). Any domain under {platform.threshold}% becomes part of your personal learning path.
                </div>
                <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => navigate('/app/assessment', { replace: true })} className={`${primaryButton} h-12 sm:px-6`}>
                    Take the diagnostic <ArrowRightIcon className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => navigate('/app', { replace: true })} className={`${secondaryButton} h-12`}>
                    Go to dashboard
                  </button>
                </div>
              </>
            }
          </motion.div>
        </AnimatePresence>
      </main>

      {step < STEPS &&
      <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
            <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0} className={secondaryButton}>
              <ArrowLeftIcon className="h-4 w-4" /> Back
            </button>
            <button type="button" onClick={next} disabled={!canContinue} className={`${primaryButton} min-w-[140px]`}>
              {step === STEPS - 1 ? 'Build my plan' : 'Continue'} <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </footer>
      }
    </div>);

}

function Heading({ title, text }: {title: string;text: string;}) {
  return (
    <div className="mt-5 first:mt-0">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">{title}</h1>
      <p className="mt-2 leading-relaxed text-muted">{text}</p>
    </div>);

}

function Check({ on }: {on: boolean;}) {
  return (
    <span className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-150 ${on ? 'bg-brand-600 text-white' : 'border border-line bg-surface'}`}>
      {on && <CheckIcon className="h-3 w-3" />}
    </span>);

}