import type { Account, AppNotification, Invite, Learner, SeedCredential } from '../types/platform';

export const DEMO_INVITE_CODE = 'ALU-PILOT';

export const seedInvites: Invite[] = [
{ id: 'inv-1', code: DEMO_INVITE_CODE, note: 'ALU cohort · open code', maxUses: 50, uses: 7, createdAt: '2026-09-10T08:00:00.000Z', expiresAt: '2026-10-31T23:59:00.000Z', revoked: false, redeemedBy: [
  { id: 'u-diane', name: 'Diane Uwase', at: '2026-09-11T14:00:00.000Z' },
  { id: 'u-eric', name: 'Eric Mugisha', at: '2026-09-12T10:00:00.000Z' },
  { id: 'u-sandrine', name: 'Sandrine Mukamana', at: '2026-09-12T13:00:00.000Z' },
  { id: 'u-grace', name: 'Grace Ishimwe', at: '2026-09-13T08:30:00.000Z' },
  { id: 'u-aline', name: 'Aline Uwimana', at: '2026-09-14T09:00:00.000Z' },
  { id: 'u-kevin', name: 'Kevin Niyonzima', at: '2026-09-15T12:00:00.000Z' }]
},
{ id: 'inv-2', code: 'UR-4QXA', note: 'University of Rwanda', maxUses: 10, uses: 1, createdAt: '2026-09-16T09:00:00.000Z', expiresAt: '2026-10-16T23:59:00.000Z', revoked: false, redeemedBy: [{ id: 'u-jean', name: 'Jean Bosco Habimana', at: '2026-09-18T15:00:00.000Z' }] },
{ id: 'inv-3', code: 'ALU-7K2P', email: 'claudine.u@alustudent.com', maxUses: 1, uses: 0, createdAt: '2026-09-25T10:00:00.000Z', expiresAt: '2026-10-02T23:59:00.000Z', revoked: false, redeemedBy: [] },
{ id: 'inv-4', code: 'AUCA-9RLE', email: 'patrick.n@auca.ac.rw', maxUses: 1, uses: 1, createdAt: '2026-09-24T10:00:00.000Z', expiresAt: '2026-10-01T23:59:00.000Z', revoked: false, redeemedBy: [{ id: 'u-patrick', name: 'Patrick Nkurunziza', at: '2026-09-26T08:00:00.000Z' }] },
{ id: 'inv-5', code: 'ALU-3MNB', note: 'Workshop test', maxUses: 20, uses: 0, createdAt: '2026-09-01T10:00:00.000Z', expiresAt: '2026-09-15T23:59:00.000Z', revoked: false, redeemedBy: [] }];


export const seedNotifications: AppNotification[] = [
{ id: 'n-1', recipient: 'admins', kind: 'student', title: 'Patrick joined', body: 'Used invite AUCA-9RLE', link: '/admin/students', at: '2026-09-26T08:00:00.000Z', readBy: [] },
{ id: 'n-2', recipient: 'admins', kind: 'assessment', title: 'Grace finished the post-test', body: 'Scored 73% · up 20 points', link: '/admin/students', at: '2026-09-25T11:05:00.000Z', readBy: [] },
{ id: 'n-3', recipient: 'admins', kind: 'assessment', title: 'Eric finished the post-test', body: 'Scored 80% · up 33 points', link: '/admin/students', at: '2026-09-24T16:40:00.000Z', readBy: ['u-admin'] },
{ id: 'n-4', recipient: 'admins', kind: 'invite', title: 'Invite ALU-7K2P sent', body: 'claudine.u@alustudent.com', link: '/admin/invites', at: '2026-09-25T10:00:00.000Z', readBy: ['u-admin'] },
{ id: 'n-5', recipient: 'u-aline', kind: 'credential', title: 'Credential issued', body: 'Emergency saving · IMR-4QXA-7K2P', link: '/app/credentials', at: '2026-09-21T14:12:00.000Z', readBy: ['u-aline'] },
{ id: 'n-6', recipient: 'u-aline', kind: 'system', title: 'Keep going on Debt & interest', body: '2 lessons left', link: '/app/modules/m-debt', at: '2026-09-26T09:00:00.000Z', readBy: [] },
{ id: 'n-7', recipient: 'students', kind: 'course', title: 'New: Digital money safety', body: '11 min · earn a credential', link: '/app/modules/m-digital', at: '2026-09-24T08:00:00.000Z', readBy: [] }];


export const DEMO_PASSWORD = 'demo1234';
export const DEMO_STUDENT_EMAIL = 'aline@alustudent.com';
export const DEMO_ADMIN_EMAIL = 'admin@imari.rw';

export const seedAccounts: Account[] = [
{ id: 'u-aline', name: 'Aline Uwimana', email: DEMO_STUDENT_EMAIL, password: DEMO_PASSWORD, role: 'student' },
{ id: 'u-admin', name: 'Precious Mozia', email: DEMO_ADMIN_EMAIL, password: DEMO_PASSWORD, role: 'admin' }];


const done = (quizScores: number[], activityResponse = 'Completed the practical activity with my own numbers.') => ({
  lessonsDone: [0, 1, 2],
  activityResponse,
  quizScores,
  status: 'completed' as const
});

export const seedLearners: Learner[] = [
{
  id: 'u-aline', name: 'Aline Uwimana', email: DEMO_STUDENT_EMAIL, university: 'African Leadership University', program: 'BSc Software Engineering', joinedAt: '2026-09-14T09:00:00.000Z',
  attempts: [{ id: 'at-aline-1', kind: 'pre', domainScores: { budgeting: 67, saving: 33, debt: 33, investing: 67, digital: 100 }, total: 60, completedAt: '2026-09-14T09:22:00.000Z', durationMs: 512000, recommendationMs: 3.1 }],
  progress: {
    'm-saving': done([67, 100], 'Essentials cost about 95,000 RWF. First target is 95,000 RWF, saving 8,000 RWF a week.'),
    'm-debt': { lessonsDone: [0], activityResponse: null, quizScores: [], status: 'in_progress' }
  },
  feedback: { 'm-saving': 5 },
  preferences: { interests: ['saving', 'debt', 'digital'], goal: 'emergency', weeklyTime: '30', style: 'examples', language: 'en', completedAt: '2026-09-14T09:02:00.000Z' }
},
{
  id: 'u-eric', name: 'Eric Mugisha', email: 'eric.m@alustudent.com', university: 'African Leadership University', program: 'BA International Business & Trade', joinedAt: '2026-09-12T10:00:00.000Z',
  attempts: [
  { id: 'at-eric-1', kind: 'pre', domainScores: { budgeting: 67, saving: 67, debt: 33, investing: 0, digital: 67 }, total: 47, completedAt: '2026-09-12T10:18:00.000Z', durationMs: 604000, recommendationMs: 2.7 },
  { id: 'at-eric-2', kind: 'post', domainScores: { budgeting: 100, saving: 67, debt: 67, investing: 67, digital: 100 }, total: 80, completedAt: '2026-09-24T16:40:00.000Z', durationMs: 455000, recommendationMs: 2.4 }],

  progress: { 'm-debt': done([100]), 'm-investing': done([67]) },
  feedback: { 'm-debt': 4, 'm-investing': 5 }
},
{
  id: 'u-grace', name: 'Grace Ishimwe', email: 'grace.i@alustudent.com', university: 'African Leadership University', program: 'BSc Computer Science', joinedAt: '2026-09-13T08:30:00.000Z',
  attempts: [
  { id: 'at-grace-1', kind: 'pre', domainScores: { budgeting: 33, saving: 67, debt: 67, investing: 33, digital: 67 }, total: 53, completedAt: '2026-09-13T08:51:00.000Z', durationMs: 690000, recommendationMs: 3.6 },
  { id: 'at-grace-2', kind: 'post', domainScores: { budgeting: 67, saving: 67, debt: 100, investing: 67, digital: 67 }, total: 73, completedAt: '2026-09-25T11:05:00.000Z', durationMs: 520000, recommendationMs: 2.9 }],

  progress: { 'm-budgeting': done([100]), 'm-investing': done([33, 67]) },
  feedback: { 'm-budgeting': 4, 'm-investing': 4 }
},
{
  id: 'u-kevin', name: 'Kevin Niyonzima', email: 'kevin.n@alustudent.com', university: 'African Leadership University', program: 'BSc Entrepreneurial Leadership', joinedAt: '2026-09-15T12:00:00.000Z',
  attempts: [{ id: 'at-kevin-1', kind: 'pre', domainScores: { budgeting: 100, saving: 33, debt: 0, investing: 67, digital: 33 }, total: 47, completedAt: '2026-09-15T12:20:00.000Z', durationMs: 580000, recommendationMs: 4.2 }],
  progress: { 'm-debt': done([67]), 'm-saving': { lessonsDone: [0, 1], activityResponse: null, quizScores: [], status: 'in_progress' } },
  feedback: { 'm-debt': 3 }
},
{
  id: 'u-diane', name: 'Diane Uwase', email: 'diane.u@alustudent.com', university: 'African Leadership University', program: 'BSc Global Challenges', joinedAt: '2026-09-11T14:00:00.000Z',
  attempts: [
  { id: 'at-diane-1', kind: 'pre', domainScores: { budgeting: 67, saving: 100, debt: 67, investing: 67, digital: 33 }, total: 67, completedAt: '2026-09-11T14:15:00.000Z', durationMs: 430000, recommendationMs: 2.2 },
  { id: 'at-diane-2', kind: 'post', domainScores: { budgeting: 67, saving: 100, debt: 67, investing: 100, digital: 100 }, total: 87, completedAt: '2026-09-22T09:30:00.000Z', durationMs: 398000, recommendationMs: 2.1 }],

  progress: { 'm-digital': done([100]) },
  feedback: { 'm-digital': 5 }
},
{
  id: 'u-jean', name: 'Jean Bosco Habimana', email: 'jeanbosco.h@ur.ac.rw', university: 'University of Rwanda', program: 'BCom Accounting', joinedAt: '2026-09-18T15:00:00.000Z',
  attempts: [{ id: 'at-jean-1', kind: 'pre', domainScores: { budgeting: 33, saving: 33, debt: 33, investing: 33, digital: 67 }, total: 40, completedAt: '2026-09-18T15:25:00.000Z', durationMs: 720000, recommendationMs: 5.3 }],
  progress: { 'm-budgeting': { lessonsDone: [0, 1, 2], activityResponse: 'Stipend 120,000 RWF: 60k needs, 36k wants, 24k savings.', quizScores: [33], status: 'in_progress' } },
  feedback: {}
},
{
  id: 'u-sandrine', name: 'Sandrine Mukamana', email: 'sandrine.m@alustudent.com', university: 'African Leadership University', program: 'BSc Software Engineering', joinedAt: '2026-09-12T13:00:00.000Z',
  attempts: [
  { id: 'at-sandrine-1', kind: 'pre', domainScores: { budgeting: 67, saving: 67, debt: 100, investing: 33, digital: 0 }, total: 53, completedAt: '2026-09-12T13:19:00.000Z', durationMs: 560000, recommendationMs: 3.0 },
  { id: 'at-sandrine-2', kind: 'post', domainScores: { budgeting: 67, saving: 67, debt: 100, investing: 67, digital: 67 }, total: 73, completedAt: '2026-09-23T17:10:00.000Z', durationMs: 470000, recommendationMs: 2.6 }],

  progress: { 'm-investing': done([67]), 'm-digital': done([100]) },
  feedback: { 'm-investing': 4, 'm-digital': 5 }
},
{
  id: 'u-patrick', name: 'Patrick Nkurunziza', email: 'patrick.n@auca.ac.rw', university: 'Adventist University of Central Africa', program: 'BSc Information Management', joinedAt: '2026-09-26T08:00:00.000Z',
  attempts: [], progress: {}, feedback: {}
}];


export const seedCredentials: SeedCredential[] = [
{ id: 'IMR-4QXA-7K2P', learnerId: 'u-aline', learnerName: 'Aline Uwimana', moduleId: 'm-saving', competency: 'Emergency saving', issuedAt: '2026-09-21T14:12:00.000Z', status: 'valid', verifications: 1 },
{ id: 'IMR-8TWD-3MNB', learnerId: 'u-eric', learnerName: 'Eric Mugisha', moduleId: 'm-debt', competency: 'Responsible borrowing', issuedAt: '2026-09-17T11:02:00.000Z', status: 'valid', verifications: 2 },
{ id: 'IMR-2HJC-9RLE', learnerId: 'u-eric', learnerName: 'Eric Mugisha', moduleId: 'm-investing', competency: 'Investment fundamentals', issuedAt: '2026-09-20T15:44:00.000Z', status: 'valid', verifications: 0 },
{ id: 'IMR-6PZV-1QSA', learnerId: 'u-grace', learnerName: 'Grace Ishimwe', moduleId: 'm-budgeting', competency: 'Monthly budgeting', issuedAt: '2026-09-16T10:20:00.000Z', status: 'valid', verifications: 1 },
{ id: 'IMR-5KFY-8DGU', learnerId: 'u-grace', learnerName: 'Grace Ishimwe', moduleId: 'm-investing', competency: 'Investment fundamentals', issuedAt: '2026-09-22T09:13:00.000Z', status: 'valid', verifications: 0 },
{ id: 'IMR-9BNE-4TCX', learnerId: 'u-kevin', learnerName: 'Kevin Niyonzima', moduleId: 'm-debt', competency: 'Responsible borrowing', issuedAt: '2026-09-19T18:30:00.000Z', status: 'valid', verifications: 0 },
{ id: 'IMR-3LMR-6WPA', learnerId: 'u-diane', learnerName: 'Diane Uwase', moduleId: 'm-digital', competency: 'Digital financial safety', issuedAt: '2026-09-15T16:05:00.000Z', status: 'valid', verifications: 3 },
{ id: 'IMR-7DUQ-2HKS', learnerId: 'u-sandrine', learnerName: 'Sandrine Mukamana', moduleId: 'm-investing', competency: 'Investment fundamentals', issuedAt: '2026-09-18T12:40:00.000Z', status: 'revoked', verifications: 1 },
{ id: 'IMR-1XCV-5NZF', learnerId: 'u-sandrine', learnerName: 'Sandrine Mukamana', moduleId: 'm-digital', competency: 'Digital financial safety', issuedAt: '2026-09-21T08:55:00.000Z', status: 'valid', verifications: 0 }];