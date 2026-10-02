import React from 'react';
import { Link } from 'react-router-dom';
import { AwardIcon } from 'lucide-react';
import { CredentialCard } from '../../components/CredentialCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLearner } from '../../hooks/useLearner';
import { primaryButton } from '../../utils/styles';

export function Credentials() {
  const { learner, credentials } = useLearner();
  if (!learner) return null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:py-10">
      <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">Credentials</h1>
      <p className="mt-1 text-sm text-muted">One competency each · verifiable on Sepolia.</p>

      <div className="mt-8">
        {credentials.length === 0 ?
        <EmptyState
          icon={AwardIcon}
          title="No credentials yet"
          description="Finish a module’s lessons and activity, then pass its quiz to earn your first micro-credential."
          action={<Link to="/app/modules" className={primaryButton}>Go to learning path</Link>} /> :


        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {credentials.map((c) =>
          <li key={c.id}>
                <CredentialCard credential={c} />
              </li>
          )}
          </ul>
        }
      </div>
    </div>);

}