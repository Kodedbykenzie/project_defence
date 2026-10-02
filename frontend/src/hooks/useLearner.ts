import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import { getRecommendations } from '../utils/recommendation';

export function useLearner() {
  const { user } = useAuth();
  const platform = usePlatform();
  const learner = user ? platform.learners[user.id] : undefined;

  const derived = useMemo(() => {
    const attempts = learner?.attempts ?? [];
    const pre = [...attempts].reverse().find((a) => a.kind === 'pre');
    const post = [...attempts].reverse().find((a) => a.kind === 'post');
    const recommendations = pre ? getRecommendations(pre.domainScores, platform.modules, platform.threshold) : [];
    const credentials = platform.credentials.filter((c) => c.learnerId === learner?.id);
    return { pre, post, recommendations, credentials };
  }, [learner, platform.modules, platform.threshold, platform.credentials]);

  return { learner, ...derived, platform };
}