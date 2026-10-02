import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, BookOpenIcon, CheckIcon, ClockIcon } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '../../components/ui/EmptyState';
import { LessonStep } from '../../components/student/module/LessonStep';
import { ActivityStep } from '../../components/student/module/ActivityStep';
import { QuizStep } from '../../components/student/module/QuizStep';
import { CredentialStep } from '../../components/student/module/CredentialStep';
import { domains } from '../../data/domains';
import { useLearner } from '../../hooks/useLearner';
import { bestQuiz, emptyProgress, progressPercent } from '../../utils/recommendation';
import { primaryButton } from '../../utils/styles';
import { findModule } from '../../utils/slug';

export function ModuleDetail() {
  const { moduleId } = useParams();
  const { learner, recommendations, credentials, platform } = useLearner();
  const found = findModule(platform.modules, moduleId);
  const module = found?.published ? found : undefined;
  const progress = learner && module && learner.progress[module.id] || emptyProgress;
  const credential = credentials.find((c) => c.moduleId === module?.id);
  const best = bestQuiz(progress);

  const steps = module ?
  [
  ...module.lessons.map((l, i) => ({ key: `lesson-${i}`, label: l.title, done: progress.lessonsDone.includes(i) })),
  { key: 'activity', label: 'Practical activity', done: !!progress.activityResponse },
  { key: 'quiz', label: 'Competency quiz', done: best !== null && best >= module.passingScore },
  { key: 'credential', label: 'Micro-credential', done: !!credential }] :

  [];

  const [active, setActive] = useState(() => {
    const first = steps.findIndex((s) => !s.done);
    return first === -1 ? Math.max(steps.length - 1, 0) : first;
  });

  if (!learner) return null;
  if (!module) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
        <EmptyState icon={BookOpenIcon} title="Module not available" description="This module doesn’t exist or has been unpublished." action={<Link to="/app/modules" className={primaryButton}>Back to learning path</Link>} />
      </div>);

  }

  const domain = domains.find((d) => d.id === module.domain);
  const rec = recommendations.find((r) => r.moduleId === module.id);
  const lessonCount = module.lessons.length;
  const activityIdx = lessonCount;
  const quizIdx = lessonCount + 1;
  const credIdx = lessonCount + 2;
  const pct = progressPercent(progress, module);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <Link to="/app/modules" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeftIcon className="h-4 w-4" /> Learning path
      </Link>

      <header className="mt-5 border-b border-line pb-6">
        {domain &&
        <p className="flex items-center gap-2 text-sm text-brand-700">
            <domain.icon className="h-4 w-4" aria-hidden="true" /> {domain.name}
          </p>
        }
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink md:text-2xl">{module.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{module.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4" /> {module.minutes} min
          </span>
          <span className="flex items-center gap-3">
            <span className="h-1.5 w-32 overflow-hidden rounded-full bg-subtle">
              <span className="block h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
            </span>
            <span className="tabular">{pct}% complete</span>
          </span>
        </div>
        {rec && <p className="mt-4 inline-block rounded-xl bg-accent-500/10 px-3 py-2 text-sm text-accent-600">Recommended because {rec.reason.charAt(0).toLowerCase() + rec.reason.slice(1)}</p>}
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[250px_1fr] lg:gap-12">
        <nav aria-label="Module steps" className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:overflow-visible lg:px-0">
          <ol className="flex gap-2 lg:sticky lg:top-6 lg:flex-col lg:gap-1">
            {steps.map((step, i) =>
            <li key={step.key} className="shrink-0">
                <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={active === i ? 'step' : undefined}
                className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 lg:whitespace-normal ${
                active === i ? 'bg-brand-50 font-medium text-brand-800' : 'text-ink hover:bg-subtle'}`
                }>
                
                  <span
                  className={`tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  step.done ? 'bg-emerald-500 text-white' : active === i ? 'bg-brand-600 text-white' : 'bg-subtle text-muted'}`
                  }>
                  
                    {step.done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  {step.label}
                </button>
              </li>
            )}
          </ol>
        </nav>

        <div className="min-w-0 pb-10">
          {active < lessonCount &&
          <LessonStep
            key={active}
            module={module}
            index={active}
            done={steps[active].done}
            onBack={active > 0 ? () => setActive(active - 1) : undefined}
            onComplete={() => {
              platform.completeLesson(learner.id, module.id, active);
              setActive(active + 1);
            }} />

          }
          {active === activityIdx &&
          <ActivityStep
            module={module}
            savedResponse={progress.activityResponse}
            onBack={() => setActive(activityIdx - 1)}
            onSave={(text) => {
              platform.submitActivity(learner.id, module.id, text);
              toast.success('Activity saved');
              setActive(quizIdx);
            }} />

          }
          {active === quizIdx &&
          <QuizStep
            module={module}
            bestScore={best}
            onSubmit={(answers) => platform.submitQuiz(learner.id, module.id, answers)}
            onContinue={() => setActive(credIdx)} />

          }
          {active === credIdx &&
          <CredentialStep
            module={module}
            progress={progress}
            credential={credential}
            rating={learner.feedback[module.id]}
            onIssue={() => platform.issueCredential(learner.id, module.id)}
            onRate={(n) => platform.rateModule(learner.id, module.id, n)} />

          }
        </div>
      </div>
    </div>);

}