import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AwardIcon, CheckIcon, CircleIcon, LoaderIcon, StarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { CredentialCard } from '../../CredentialCard';
import { bestQuiz, isEligible } from '../../../utils/recommendation';
import { primaryButton } from '../../../utils/styles';
import type { Credential, LearningModule, ModuleProgress } from '../../../types/platform';

interface CredentialStepProps {
  module: LearningModule;
  progress: ModuleProgress;
  credential?: Credential;
  rating?: number;
  onIssue: () => Promise<Credential>;
  onRate: (rating: number) => void;
}

const issueSteps = ['Checking progress and quiz score', 'Generating credential hash', 'Registering on Ethereum Sepolia', 'Saving credential record'];

export function CredentialStep({ module, progress, credential, rating, onIssue, onRate }: CredentialStepProps) {
  const [stage, setStage] = useState(-1);
  const eligible = isEligible(progress, module);
  const best = bestQuiz(progress);

  const issue = async () => {
    setStage(0);
    const timer = window.setInterval(() => setStage((s) => s < issueSteps.length - 1 ? s + 1 : s), 420);
    try {
      await onIssue();
      toast.success('Micro-credential issued', { description: module.competency });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Issuance failed. Try again.');
    } finally {
      window.clearInterval(timer);
      setStage(-1);
    }
  };

  if (credential) {
    return (
      <article>
        <p className="text-sm text-muted">Micro-credential</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">You’ve earned “{module.competency}”</h2>
        <p className="mt-2 max-w-prose text-sm text-muted">Share the verification link with anyone who needs to check it. They’ll see the competency and status — never your scores or answers.</p>
        <div className="mt-6 max-w-md">
          <CredentialCard credential={credential} />
        </div>

        <section className="mt-10 border-t border-line pt-6" aria-labelledby="rating">
          <h3 id="rating" className="font-semibold text-ink">
            How relevant was this module to your needs?
          </h3>
          <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Relevance rating">
            {[1, 2, 3, 4, 5].map((n) =>
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} out of 5`}
              onClick={() => {
                onRate(n);
                toast.success('Thanks for the feedback');
              }}
              className="rounded-lg p-1.5 transition-colors duration-150 hover:bg-brand-50">
              
                <StarIcon className={`h-6 w-6 ${rating && n <= rating ? 'fill-accent-500 text-accent-500' : 'text-line'}`} />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">{rating ? `You rated this ${rating}/5. You can change it any time.` : '1 = not relevant, 5 = exactly what I needed'}</p>
        </section>
      </article>);

  }

  const checks = [
  { label: `Read all ${module.lessons.length} lessons`, done: module.lessons.every((_, i) => progress.lessonsDone.includes(i)) },
  { label: 'Complete the practical activity', done: !!progress.activityResponse },
  { label: `Score at least ${module.passingScore}% on the quiz`, done: best !== null && best >= module.passingScore }];


  return (
    <article>
      <p className="text-sm text-muted">Micro-credential</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{module.competency}</h2>
      <p className="mt-2 max-w-prose text-sm text-muted">
        When you meet every requirement, we register a hash of your credential on the Ethereum Sepolia testnet so it can be independently verified.
      </p>

      {stage >= 0 ?
      <ol className="mt-8 max-w-md space-y-3" aria-live="polite">
          {issueSteps.map((label, i) =>
        <motion.li
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: i <= stage ? 1 : 0.4, y: 0 }}
          transition={{ duration: 0.18, delay: i * 0.04 }}
          className="flex items-center gap-3 text-sm text-ink">
          
              {i < stage ?
          <CheckIcon className="h-4 w-4 text-emerald-600" /> :
          i === stage ?
          <LoaderIcon className="h-4 w-4 animate-spin text-brand-600" /> :

          <CircleIcon className="h-4 w-4 text-faint" />
          }
              {label}
            </motion.li>
        )}
        </ol> :

      <>
          <ul className="mt-8 max-w-md space-y-3">
            {checks.map((c) =>
          <li key={c.label} className="flex items-center gap-3 text-sm">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${c.done ? 'bg-emerald-500 text-white' : 'border border-line'}`}>
                  {c.done && <CheckIcon className="h-3 w-3" />}
                </span>
                <span className={c.done ? 'text-ink' : 'text-muted'}>{c.label}</span>
              </li>
          )}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={issue} disabled={!eligible} className={primaryButton}>
              <AwardIcon className="h-4 w-4" /> Issue my credential
            </button>
            {!eligible && <span className="text-sm text-muted">Complete the steps above to unlock.</span>}
          </div>
          <p className="mt-6 text-xs text-muted">
            Already have credentials? <Link to="/app/credentials" className="font-medium text-brand-700 hover:underline">View them here</Link>.
          </p>
        </>
      }
    </article>);

}