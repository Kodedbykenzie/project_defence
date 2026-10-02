import type { LearningModule } from '../types/platform';

export interface CourseIssue {
  section: string;
  message: string;
}

export function courseIssues(m: LearningModule): CourseIssue[] {
  const issues: CourseIssue[] = [];
  if (!m.title.trim()) issues.push({ section: 'overview', message: 'Add a course title' });
  if (!m.competency.trim()) issues.push({ section: 'overview', message: 'Name the competency the credential proves' });
  if (!m.summary.trim()) issues.push({ section: 'overview', message: 'Write a short summary' });
  if (m.lessons.length === 0) issues.push({ section: 'overview', message: 'Add at least one lesson' });
  m.lessons.forEach((l, i) => {
    if (!l.title.trim()) issues.push({ section: `lesson-${i}`, message: `Lesson ${i + 1} needs a title` });
    if (!l.paragraphs.join('').trim()) issues.push({ section: `lesson-${i}`, message: `Lesson ${i + 1} has no content` });
  });
  if (!m.activity.prompt.trim()) issues.push({ section: 'activity', message: 'Write an activity prompt' });
  if (m.quiz.length === 0) issues.push({ section: 'quiz', message: 'Add at least one quiz question' });
  m.quiz.forEach((q, i) => {
    if (!q.prompt.trim() || q.options.some((o) => !o.trim())) issues.push({ section: 'quiz', message: `Question ${i + 1} is incomplete` });
  });
  return issues;
}