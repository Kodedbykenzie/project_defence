/**
 * Seeds the database from the frontend's canonical content files so the API,
 * the web client and the SQL schema all agree:
 *
 *   - 5 learning modules (lessons, objectives, activities, resources, quizzes)
 *   - 15 diagnostic questions
 *   - demo accounts (admin + student), demo invites, demo learners with
 *     attempts / progress / credentials matching data/seed.ts
 *
 * Idempotent: skips when modules already exist.
 *
 *   npm run db:seed
 */
import { hashPassword } from '../src/security.js';
import { query, withTx } from '../src/db.js';
import { contentHash } from '../src/lib/credential.js';
import { initialModules } from '../../frontend/src/data/modules.js';
import { diagnosticQuestions } from '../../frontend/src/data/questions.js';
import { seedLearners, seedInvites, DEMO_PASSWORD } from '../../frontend/src/data/seed.js';

const SLUG_OVERRIDES: Record<string, string> = {
  'm-budgeting': 'student-budget',
  'm-saving': 'emergency-saving',
  'm-debt': 'borrowing-wisely',
  'm-investing': 'investment-basics',
  'm-digital': 'digital-money-safety',
};

const slugify = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'course';

async function seedContent(): Promise<Map<string, string>> {
  const slugByModuleId = new Map<string, string>();
  const existing = await query<{ n: number }>(`select count(*)::int as n from modules`);
  if ((existing.rows[0]?.n ?? 0) > 0) {
    const rows = await query<{ id: string; slug: string }>(`select id, slug from modules`);
    // Reconstruct the frontend-id → slug mapping from titles via overrides first.
    for (const m of initialModules) {
      const slug = SLUG_OVERRIDES[m.id] ?? slugify(m.title);
      const hit = rows.rows.find((r) => r.slug === slug);
      if (hit) slugByModuleId.set(m.id, hit.slug);
    }
    console.log(`  · modules already present (${rows.rowCount}), skipping content`);
    return slugByModuleId;
  }

  for (const m of initialModules) {
    const slug = SLUG_OVERRIDES[m.id] ?? slugify(m.title);
    const moduleId = await withTx(async (client) => {
      const mod = await client.query<{ id: string }>(
        `insert into modules (slug, domain_id, title, competency, summary, minutes,
                              passing_score, published, is_starter)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
        [slug, m.domain, m.title, m.competency, m.summary, m.minutes, m.passingScore, m.published, m.onboarding ?? false],
      );
      const id = mod.rows[0]!.id;

      for (let i = 0; i < m.objectives.length; i++) {
        await client.query(
          `insert into module_objectives (module_id, position, text) values ($1, $2, $3)`,
          [id, i, m.objectives[i]],
        );
      }
      for (let i = 0; i < m.lessons.length; i++) {
        const l = m.lessons[i]!;
        await client.query(
          `insert into lessons (module_id, position, title, paragraphs, example) values ($1, $2, $3, $4, $5)`,
          [id, i, l.title, l.paragraphs, l.example],
        );
      }
      await client.query(
        `insert into activities (module_id, title, prompt) values ($1, $2, $3)`,
        [id, m.activity.title, m.activity.prompt],
      );
      for (const r of m.resources) {
        await client.query(
          `insert into module_resources (module_id, title, source, url) values ($1, $2, $3, $4)`,
          [id, r.title, r.source, r.url],
        );
      }
      for (let i = 0; i < m.quiz.length; i++) {
        const q = m.quiz[i]!;
        await client.query(
          `insert into questions (domain_id, module_id, prompt, options, answer_index, explanation, position)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [m.domain, id, q.prompt, JSON.stringify(q.options), q.answer, q.explanation, i],
        );
      }
      return id;
    });
    slugByModuleId.set(m.id, slug);
    console.log(`  ✓ module ${slug}`);
  }

  // Diagnostic items (module_id NULL)
  for (let i = 0; i < diagnosticQuestions.length; i++) {
    const q = diagnosticQuestions[i]!;
    await query(
      `insert into questions (domain_id, module_id, prompt, options, answer_index, explanation, position)
       values ($1, null, $2, $3, $4, $5, $6)
       on conflict do nothing`,
      [q.domain, q.prompt, JSON.stringify(q.options), q.answer, q.explanation, i],
    );
  }
  console.log(`  ✓ ${diagnosticQuestions.length} diagnostic questions`);
  return slugByModuleId;
}

async function seedAccounts(): Promise<Map<string, string>> {
  const userIdByEmail = new Map<string, string>();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const accounts = [
    { name: 'Precious Mozia', email: 'admin@imari.rw', role: 'admin', university: 'African Leadership University' },
    { name: 'Aline Uwimana', email: 'aline@alustudent.com', role: 'student', university: 'African Leadership University' },
  ];
  for (const a of accounts) {
    const { rows } = await query<{ id: string }>(
      `insert into users (email, password_hash, provider, role, full_name, email_verified_at)
       values ($1, $2, 'password', $3, $4, now())
       on conflict (email) do update set full_name = excluded.full_name
       returning id`,
      [a.email, passwordHash, a.role, a.name],
    );
    userIdByEmail.set(a.email, rows[0]!.id);
    await query(
      `update student_profiles sp set institution_id = (
         select id from institutions where lower(name) = lower($2) limit 1
       ), onboarded_at = coalesce(sp.onboarded_at, now())
       where sp.user_id = $1 and $3 = 'student'`,
      [rows[0]!.id, a.university, a.role],
    );
  }
  console.log(`  ✓ demo accounts (${DEMO_PASSWORD} for both)`);

  // Demo learners (students only, password for the cohort)
  const cohortHash = await hashPassword(DEMO_PASSWORD);
  for (const l of seedLearners) {
    if (userIdByEmail.has(l.email)) continue;
    const { rows } = await query<{ id: string }>(
      `insert into users (email, password_hash, provider, role, full_name, email_verified_at, created_at)
       values ($1, $2, 'password', 'student', $3, now(), $4)
       on conflict (email) do nothing
       returning id`,
      [l.email, cohortHash, l.name, new Date(l.joinedAt)],
    );
    const id = rows[0]?.id;
    if (!id) continue;
    userIdByEmail.set(l.email, id);
    await query(
      `update student_profiles sp
          set institution_id = (select id from institutions where lower(name) = lower($2) limit 1),
              programme = $3,
              onboarded_at = $4
        where sp.user_id = $1`,
      [id, l.university, l.program, new Date(l.joinedAt)],
    );
    if (l.preferences) {
      await query(
        `insert into user_preferences (user_id, interests, goal, weekly_time, learning_style, language)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (user_id) do update
           set interests = $2, goal = $3, weekly_time = $4, learning_style = $5, language = $6`,
        [id, l.preferences.interests, l.preferences.goal, l.preferences.weeklyTime, l.preferences.style, l.preferences.language],
      );
    }
  }
  console.log(`  ✓ ${userIdByEmail.size} learner accounts`);
  return userIdByEmail;
}

async function seedInvitesFn(): Promise<void> {
  for (const inv of seedInvites) {
    await query(
      `insert into invites (code, email, note, max_uses, uses, expires_at, revoked_at, created_at)
       values ($1, $2, $3, $4, 0, $5, $6, $7)
       on conflict (code) do nothing`,
      [inv.code, inv.email ?? null, inv.note ?? null, inv.maxUses, new Date(inv.expiresAt),
       inv.revoked ? new Date(inv.createdAt) : null, new Date(inv.createdAt)],
    );
  }
  console.log(`  ✓ ${seedInvites.length} invites (ALU-PILOT works)`);
}

async function seedAttemptsAndProgress(
  userIdByEmail: Map<string, string>,
  slugByModuleId: Map<string, string>,
): Promise<void> {
  const existingAttempts = await query<{ n: number }>(`select count(*)::int as n from assessment_attempts`);
  const skipAttempts = (existingAttempts.rows[0]?.n ?? 0) > 0;

  const { rows: domains } = await query<{ id: string }>(`select id from domains order by sort_order`);
  const domainIds = domains.map((d) => d.id);

  for (const l of seedLearners) {
    const userId = userIdByEmail.get(l.email);
    if (!userId) continue;

    if (!skipAttempts) {
      for (const a of l.attempts) {
        const att = await query<{ id: string }>(
          `insert into assessment_attempts
             (user_id, kind, total_score, threshold_used, duration_ms, recommendation_ms, started_at, completed_at)
           values ($1, $2, $3, 60, $4, $5, $6 - ($4 || ' milliseconds')::interval, $6)
           returning id`,
          [userId, a.kind, a.total, a.durationMs, a.recommendationMs, new Date(a.completedAt)],
        );
        const attemptId = att.rows[0]!.id;

        let priority = 0;
        for (const domainId of domainIds) {
          const score = a.domainScores[domainId as keyof typeof a.domainScores] ?? 0;
          // 3 questions per domain in the diagnostic → correct count from %.
          const correct = Math.round((score / 100) * 3);
          await query(
            `insert into domain_scores (attempt_id, domain_id, correct, total) values ($1, $2, $3, 4-1)`,
            [attemptId, domainId, Math.min(correct, 3)],
          );
        }
        // Recommendations for weak domains (published modules)
        const weak = domainIds
          .map((d) => ({ d, score: a.domainScores[d as keyof typeof a.domainScores] ?? 0 }))
          .filter((x) => x.score < 60)
          .sort((x, y) => x.score - y.score);
        for (const w of weak) {
          const { rows: mods } = await query<{ id: string }>(
            `select id from modules where domain_id = $1 and published order by created_at`,
            [w.d],
          );
          for (const mod of mods) {
            priority += 1;
            const { rows: nameRows } = await query<{ name: string }>(`select name from domains where id = $1`, [w.d]);
            await query(
              `insert into recommendations
                 (attempt_id, user_id, module_id, domain_id, priority, domain_score, threshold, reason, is_correct)
               values ($1, $2, $3, $4, $5, $6, 60, $7, true)
               on conflict (attempt_id, module_id) do nothing`,
              [attemptId, userId, mod.id, w.d, priority, w.score,
               `You scored ${w.score}% in ${nameRows[0]?.name ?? w.d}, below the 60% threshold.`],
            );
          }
        }
      }
    }

    // Progress rows (trigger derives completed status)
    for (const [frontendModuleId, progress] of Object.entries(l.progress)) {
      const slug = slugByModuleId.get(frontendModuleId);
      if (!slug) continue;
      const { rows: modRows } = await query<{ id: string }>(`select id from modules where slug = $1`, [slug]);
      const moduleId = modRows[0]?.id;
      if (!moduleId) continue;

      await query(
        `insert into module_progress (user_id, module_id, status, lessons_done, activity_response, best_quiz_score, started_at, completed_at)
         values ($1, $2, 'in_progress', $3, $4, $5, now(), case when $6 then now() else null end)
         on conflict (user_id, module_id) do nothing`,
        [
          userId, moduleId,
          progress.lessonsDone,
          progress.activityResponse,
          progress.quizScores.length ? Math.max(...progress.quizScores) : null,
          progress.status === 'completed',
        ],
      );
      // quiz attempt history so Results pages show scores
      for (const s of progress.quizScores) {
        await query(
          `insert into quiz_attempts (user_id, module_id, answers, score, passed, created_at)
           values ($1, $2, '{}'::smallint[], $3, $4, now())
           on conflict do nothing`,
          [userId, moduleId, s, s >= 67],
        );
      }
      if (l.feedback[frontendModuleId as keyof typeof l.feedback]) {
        await query(
          `insert into module_feedback (user_id, module_id, rating) values ($1, $2, $3)
           on conflict (user_id, module_id) do nothing`,
          [userId, moduleId, l.feedback[frontendModuleId as keyof typeof l.feedback]],
        );
      }
    }
  }
  console.log(`  ✓ attempts, scores, recommendations, progress`);
}

async function seedCredentials(
  userIdByEmail: Map<string, string>,
  slugByModuleId: Map<string, string>,
): Promise<void> {
  const { seedCredentials } = await import('../../frontend/src/data/seed.js');
  for (const c of seedCredentials) {
    const userId =
      userIdByEmail.get(c.learnerId === 'u-aline' ? 'aline@alustudent.com' : '') ??
      [...userIdByEmail.entries()].find(([, id]) => id === c.learnerId)?.[1];
    // learner ids in seed data are frontend ids; map via seedLearners emails
    const learner = seedLearners.find((l) => l.id === c.learnerId);
    const resolvedUser = learner ? userIdByEmail.get(learner.email) : undefined;
    const uid = resolvedUser ?? userId;
    if (!uid) continue;

    const slug = slugByModuleId.get(c.moduleId);
    if (!slug) continue;
    const { rows: modRows } = await query<{ id: string }>(`select id from modules where slug = $1`, [slug]);
    const moduleId = modRows[0]?.id;
    if (!moduleId) continue;

    const issuedAt = new Date(c.issuedAt);
    const hash = contentHash({
      id: c.id,
      learnerId: uid,
      moduleId,
      competency: c.competency,
      issuedAt: issuedAt.toISOString(),
    });

    await query(
      `insert into credentials
         (id, user_id, module_id, competency, holder_name, hash, status, issued_at, confirmed_at, revoked_at, revoked_reason, tx_hash, block_number)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12)
       on conflict (id) do nothing`,
      [
        c.id, uid, moduleId, c.competency, c.learnerName, hash,
        c.status, issuedAt,
        (c.status as string) !== 'pending' ? issuedAt : null,
        c.status === 'revoked' ? issuedAt : null,
        c.status === 'revoked' ? 'Demo revocation' : null,
        `0x${contentHash({ id: `sepolia-tx:${c.id}`, learnerId: uid, moduleId, competency: c.competency, issuedAt: issuedAt.toISOString() }).slice(2)}`,
        6_800_000 + (parseInt(hash.slice(2, 8), 16) % 90_000),
      ],
    );
  }
  console.log(`  ✓ credentials anchored (simulated hashes)`);
}

async function main(): Promise<void> {
  console.log('Seeding imari…');
  const slugByModuleId = await seedContent();
  const userIdByEmail = await seedAccounts();
  await seedInvitesFn();
  await seedAttemptsAndProgress(userIdByEmail, slugByModuleId);
  await seedCredentials(userIdByEmail, slugByModuleId);
  console.log('Seed complete.');
  console.log('  student: aline@alustudent.com / ' + DEMO_PASSWORD);
  console.log('  admin:   admin@imari.rw / ' + DEMO_PASSWORD);
  console.log('  invite:  ALU-PILOT');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
