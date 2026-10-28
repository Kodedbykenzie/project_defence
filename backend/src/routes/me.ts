import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { one, query, withTx } from '../db.js';
import { AppError, notFound } from '../errors.js';
import { requireAuth } from '../auth-plugin.js';
import { hashIp } from '../security.js';

const Preferences = z.object({
  language: z.enum(['en', 'rw', 'fr']).optional(),
  textSize: z.enum(['sm', 'md', 'lg']).optional(),
  reduceMotion: z.boolean().optional(),
  railOpen: z.boolean().optional(),
  interests: z.array(z.string().max(40)).max(20).optional(),
  goal: z.string().max(300).nullable().optional(),
  weeklyTime: z.string().max(40).nullable().optional(),
  learningStyle: z.string().max(60).nullable().optional(),
  toasts: z.boolean().optional(),
  mutedKinds: z
    .array(z.enum(['credential', 'invite', 'student', 'assessment', 'course', 'system']))
    .max(10)
    .optional(),
  emailDigest: z.enum(['off', 'daily', 'weekly']).optional(),
  // onboarding answers
  completedAt: z.string().datetime().optional(),
});

const CookieConsent = z.object({
  analytics: z.boolean().default(false),
  preferences: z.boolean().default(false),
  policyVersion: z.string().min(1).max(20),
  anonymousId: z.string().max(100).optional(),
});

interface PrefsRow {
  language: string;
  text_size: string;
  reduce_motion: boolean;
  rail_open: boolean;
  interests: string[];
  goal: string | null;
  weekly_time: string | null;
  learning_style: string | null;
  toasts_enabled: boolean;
  muted_kinds: string[];
  email_digest: string;
}

const prefsView = (r: PrefsRow) => ({
  language: r.language,
  textSize: r.text_size,
  reduceMotion: r.reduce_motion,
  railOpen: r.rail_open,
  interests: r.interests,
  goal: r.goal,
  weeklyTime: r.weekly_time,
  learningStyle: r.learning_style,
  toasts: r.toasts_enabled,
  mutedKinds: r.muted_kinds,
  emailDigest: r.email_digest,
});

/** Same data as `prefsView`, under the key the profile screen expects. */
const mePrefsView = (r: PrefsRow, onboardedAt?: Date | null) => ({
  language: r.language,
  textSize: r.text_size,
  reduceMotion: r.reduce_motion,
  railOpen: r.rail_open,
  interests: r.interests,
  goal: r.goal,
  weeklyTime: r.weekly_time,
  learningStyle: r.learning_style,
  toastsEnabled: r.toasts_enabled,
  mutedKinds: r.muted_kinds,
  emailDigest: r.email_digest,
  // When the learner last finished onboarding — the client uses this to
  // decide whether to show the preference selector again.
  completedAt: onboardedAt ? onboardedAt.toISOString() : null,
});

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'admin' | 'verifier';
  provider: 'password' | 'google';
  email_verified_at: Date | null;
}

interface ProfileRow {
  institution_name: string | null;
  programme: string | null;
  research_consent: boolean;
  consent_version: string | null;
  onboarded_at: Date | null;
}

/** Defaults mirror the column defaults, used when the row is missing. */
const emptyPrefs = () => ({
  language: 'en',
  textSize: 'md',
  reduceMotion: false,
  railOpen: true,
  interests: [] as string[],
  goal: null as string | null,
  weeklyTime: null as string | null,
  learningStyle: null as string | null,
  toastsEnabled: true,
  mutedKinds: [] as string[],
  emailDigest: 'weekly',
});

const emptyProfile = () => ({
  university: null as string | null,
  programme: null as string | null,
  researchConsent: false,
  consentVersion: null as string | null,
  onboardedAt: null as string | null,
});

const profileView = (r: ProfileRow) => ({
  university: r.institution_name,
  programme: r.programme,
  researchConsent: r.research_consent,
  consentVersion: r.consent_version,
  onboardedAt: r.onboarded_at ? r.onboarded_at.toISOString() : null,
});

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // GET /me — the signed-in user with their preferences and student profile.
  app.get('/', async (req) => {
    const userId = req.user!.sub;

    const user = await one<UserRow>(
      `select id, email, full_name, role, provider, email_verified_at
         from users where id = $1 and deleted_at is null`,
      [userId],
    );
    if (!user) throw notFound('USER_NOT_FOUND');

    const [prefs, profile] = await Promise.all([
      one<PrefsRow>(
        `select language, text_size, reduce_motion, rail_open, interests, goal,
                weekly_time, learning_style, toasts_enabled,
                muted_kinds::text[] as muted_kinds, email_digest
           from user_preferences where user_id = $1`,
        [userId],
      ),
      one<ProfileRow>(
        `select i.name as institution_name, sp.programme, sp.research_consent,
                sp.consent_version, sp.onboarded_at
           from student_profiles sp
           left join institutions i on i.id = sp.institution_id
          where sp.user_id = $1`,
        [userId],
      ),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        provider: user.provider,
        emailVerified: Boolean(user.email_verified_at),
      },
      preferences: prefs ? mePrefsView(prefs, profile?.onboarded_at) : emptyPrefs(),
      profile: profile ? profileView(profile) : emptyProfile(),
    };
  });

  // GET /me/credentials — the signed-in learner's own credentials.
  // Only the holder can list their own; the admin register lives under
  // /admin/credentials.
  app.get('/credentials', async (req) => {
    const { rows } = await query<{
      id: string;
      module_id: string;
      module_title: string;
      module_slug: string;
      competency: string;
      holder_name: string;
      hash: string;
      tx_hash: string | null;
      block_number: number | null;
      status: string;
      issued_at: Date;
    }>(
      `select c.id, c.module_id, m.title as module_title, m.slug as module_slug,
              c.competency, c.holder_name, c.hash, c.tx_hash, c.block_number,
              c.status, c.issued_at
         from credentials c
         join modules m on m.id = c.module_id
        where c.user_id = $1
        order by c.issued_at desc`,
      [req.user!.sub],
    );
    return rows.map((r) => ({
      id: r.id,
      moduleId: r.module_id,
      moduleTitle: r.module_title,
      moduleSlug: r.module_slug,
      competency: r.competency,
      holderName: r.holder_name,
      hash: r.hash,
      txHash: r.tx_hash,
      block: r.block_number,
      status: r.status,
      issuedAt: r.issued_at.toISOString(),
    }));
  });

  // GET /me/preferences
  app.get('/preferences', async (req) => {
    const row = await one<PrefsRow>(
      `select language, text_size, reduce_motion, rail_open, interests, goal,
              weekly_time, learning_style, toasts_enabled, muted_kinds, email_digest
         from user_preferences where user_id = $1`,
      [req.user!.sub],
    );
    if (!row) throw notFound('PREFERENCES_MISSING');
    return prefsView(row);
  });

  // PUT /me/preferences — partial update (Settings page + onboarding share this)
  app.put('/preferences', async (req) => {
    const patch = Preferences.parse(req.body);
    const userId = req.user!.sub;

    const row = await withTx(async (client) => {
      const { rows } = await client.query<PrefsRow>(
        `insert into user_preferences (user_id) values ($1)
         on conflict (user_id) do update set updated_at = now()
         returning language, text_size, reduce_motion, rail_open, interests, goal,
                   weekly_time, learning_style, toasts_enabled, muted_kinds, email_digest`,
        [userId],
      );
      const current = rows[0]!;

      await client.query(
        `update user_preferences set
           language         = $2,
           text_size        = $3,
           reduce_motion    = $4,
           rail_open        = $5,
           interests        = $6,
           goal             = $7,
           weekly_time      = $8,
           learning_style   = $9,
           toasts_enabled   = $10,
           muted_kinds      = $11,
           email_digest     = $12
         where user_id = $1`,
        [
          userId,
          patch.language ?? current.language,
          patch.textSize ?? current.text_size,
          patch.reduceMotion ?? current.reduce_motion,
          patch.railOpen ?? current.rail_open,
          patch.interests ?? current.interests,
          patch.goal === undefined ? current.goal : patch.goal,
          patch.weeklyTime === undefined ? current.weekly_time : patch.weeklyTime,
          patch.learningStyle === undefined ? current.learning_style : patch.learningStyle,
          patch.toasts ?? current.toasts_enabled,
          patch.mutedKinds ?? current.muted_kinds,
          patch.emailDigest ?? current.email_digest,
        ],
      );

      // Onboarding completion timestamp lives on the profile.
      if (patch.completedAt) {
        await client.query(
          `update student_profiles set onboarded_at = coalesce(onboarded_at, $2)
            where user_id = $1`,
          [userId, new Date(patch.completedAt)],
        );
      }

      const saved = await client.query<PrefsRow>(
        `select language, text_size, reduce_motion, rail_open, interests, goal,
                weekly_time, learning_style, toasts_enabled, muted_kinds, email_digest
           from user_preferences where user_id = $1`,
        [userId],
      );
      return saved.rows[0]!;
    });

    return prefsView(row);
  });

  // POST /me/cookie-consent — stores a cookie_consents row (public endpoint
  // per openapi, but accepts the token when present so we can link the row).
  app.post('/cookie-consent', async (req, reply) => {
    const input = CookieConsent.parse(req.body);
    const userId = req.user?.sub ?? null;

    if (!userId && !input.anonymousId) {
      // DB constraint consent_owner requires one of the two identifiers.
      throw new AppError(422, 'ANONYMOUS_ID_REQUIRED', 'anonymousId is required when signed out.');
    }

    await query(
      `insert into cookie_consents (user_id, anonymous_id, analytics, preferences, policy_version, ip_hash, user_agent)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        userId ? null : input.anonymousId,
        input.analytics,
        input.preferences,
        input.policyVersion,
        hashIp(req.ip),
        req.headers['user-agent']?.slice(0, 300) ?? null,
      ],
    );
    return reply.code(201).send({ stored: true });
  });

  // GET /me/dashboard — everything the learner dashboard renders, in one call.
  app.get('/dashboard', async (req) => {
    const userId = req.user!.sub;

    const learner = await one<{ full_name: string; email: string; created_at: Date }>(
      `select full_name, email, created_at from users where id = $1 and deleted_at is null`,
      [userId],
    );
    if (!learner) throw notFound('USER_NOT_FOUND');

    const counts = await one<{
      modules_started: number;
      modules_completed: number;
      lessons_done: number;
      credentials: number;
      quizzes: number;
      activities: number;
      lessons_available: number;
    }>(
      `select
         (select count(*)::int from module_progress where user_id = $1) as modules_started,
         (select count(*)::int from module_progress
           where user_id = $1 and status = 'completed') as modules_completed,
         (select coalesce(sum(cardinality(lessons_done)), 0)::int from module_progress
           where user_id = $1) as lessons_done,
         (select count(*)::int from credentials
           where user_id = $1 and status <> 'revoked') as credentials,
         (select count(*)::int from quiz_attempts where user_id = $1) as quizzes,
         (select count(*)::int from module_progress
           where user_id = $1 and activity_response is not null) as activities,
         (select count(*)::int from lessons l join modules m on m.id = l.module_id
           where m.published) as lessons_available`,
      [userId],
    );

    const threshold = await thresholdValue();
    const weakDomains = await weakDomainsFor(userId, threshold);
    const days = await activeDays(userId);
    const streak = streakFrom(days);

    const next = await one<{
      slug: string;
      title: string;
      domain: string;
      domain_name: string;
      minutes: number;
      in_progress: boolean;
    }>(
      `select m.slug, m.title, m.domain_id as domain, d.name as domain_name, m.minutes,
              (mp.status = 'in_progress') as in_progress
         from modules m
         join domains d on d.id = m.domain_id
         left join module_progress mp on mp.module_id = m.id and mp.user_id = $1
        where m.published and (mp.status is null or mp.status <> 'completed')
        order by (mp.status = 'in_progress') desc nulls last,
                 (m.domain_id = any($2::text[])) desc,
                 m.is_starter desc, m.published_at nulls last, m.created_at
        limit 1`,
      [userId, weakDomains.map((d) => d.id)],
    );

    const activity = await query<{ event: string; success: boolean; props: unknown; at: Date }>(
      `select event, success, props, created_at as at
         from event_logs where user_id = $1
        order by created_at desc limit 8`,
      [userId],
    );

    const unread = await one<{ n: number }>(
      `select count(*)::int as n
         from notifications n
         left join notification_reads nr
                on nr.notification_id = n.id and nr.user_id = $1
        where nr.read_at is null
          and (n.recipient_id = $1
               or (n.audience = 'admins'   and $2)
               or (n.audience = 'students' and $3))`,
      [userId, req.user!.role === 'admin', req.user!.role === 'student'],
    );

    const available = counts?.lessons_available ?? 0;
    const done = counts?.lessons_done ?? 0;

    return {
      learner: {
        id: userId,
        name: learner.full_name,
        email: learner.email,
        joinedAt: learner.created_at.toISOString(),
      },
      progress: {
        modulesStarted: counts?.modules_started ?? 0,
        modulesCompleted: counts?.modules_completed ?? 0,
        lessonsCompleted: done,
        lessonsAvailable: available,
        quizzesTaken: counts?.quizzes ?? 0,
        activitiesSubmitted: counts?.activities ?? 0,
        credentials: counts?.credentials ?? 0,
        completionRate: available ? Math.round((done / available) * 100) : 0,
      },
      streak,
      weakDomains,
      nextModule: next
        ? {
            slug: next.slug,
            title: next.title,
            domain: next.domain,
            domainName: next.domain_name,
            minutes: next.minutes,
            inProgress: next.in_progress === true,
          }
        : null,
      recentActivity: activity.rows.map((r) => ({
        event: r.event,
        success: r.success,
        at: r.at.toISOString(),
      })),
      unreadNotifications: unread?.n ?? 0,
    };
  });

  // GET /me/recommendations — module suggestions from the latest diagnostic.
  app.get('/recommendations', async (req) => {
    const userId = req.user!.sub;
    const threshold = await thresholdValue();

    const prefs = await one<{ interests: string[] }>(
      `select interests from user_preferences where user_id = $1`,
      [userId],
    );

    const latest = await one<{ id: string; completed_at: Date }>(
      `select id, completed_at from assessment_attempts
        where user_id = $1 and completed_at is not null
        order by completed_at desc limit 1`,
      [userId],
    );

    const { rows } = await query<{
      slug: string;
      title: string;
      domain: string;
      domain_name: string;
      minutes: number;
      competency: string;
      correct: number | null;
      total: number | null;
    }>(
      `select m.slug, m.title, m.domain_id as domain, d.name as domain_name,
              m.minutes, m.competency, ds.correct, ds.total
         from modules m
         join domains d on d.id = m.domain_id
         left join domain_scores ds
                on ds.domain_id = m.domain_id and ds.attempt_id = $2
         left join module_progress mp
                on mp.module_id = m.id and mp.user_id = $1
        where m.published and (mp.status is null or mp.status <> 'completed')
        order by (ds.correct::numeric / nullif(ds.total, 0)) asc nulls last,
                 m.is_starter desc, m.minutes asc
        limit 5`,
      [userId, latest?.id ?? null],
    );

    return {
      threshold,
      hasDiagnostic: Boolean(latest),
      diagnosedAt: latest ? latest.completed_at.toISOString() : null,
      interests: prefs?.interests ?? [],
      recommendations: rows.map((r, i) => {
        const score = r.total ? Math.round((r.correct ?? 0) / r.total * 100) : null;
        return {
          slug: r.slug,
          title: r.title,
          domain: r.domain,
          domainName: r.domain_name,
          competency: r.competency,
          minutes: r.minutes,
          domainScore: score,
          weak: score !== null && score < threshold,
          priority: i + 1,
          reason:
            score === null
              ? 'Starter module — no diagnostic on file yet.'
              : score < threshold
                ? `You scored ${score}% in ${r.domain_name}, below the ${threshold}% threshold.`
                : `Builds on ${r.domain_name}, where you scored ${score}%.`,
        };
      }),
    };
  });

  // GET /me/achievements — milestones, badges and streak progress.
  app.get('/achievements', async (req) => {
    const userId = req.user!.sub;

    const counts = await one<{
      modules_completed: number;
      lessons_done: number;
      credentials: number;
      quizzes_passed: number;
      attempts: number;
      feedback: number;
    }>(
      `select
         (select count(*)::int from module_progress where user_id = $1 and status = 'completed') as modules_completed,
         (select coalesce(sum(cardinality(lessons_done)), 0)::int from module_progress where user_id = $1) as lessons_done,
         (select count(*)::int from credentials where user_id = $1 and status <> 'revoked') as credentials,
         (select count(*)::int from quiz_attempts where user_id = $1 and passed) as quizzes_passed,
         (select count(*)::int from assessment_attempts where user_id = $1) as attempts,
         (select count(*)::int from module_feedback where user_id = $1) as feedback`,
      [userId],
    );

    const marks = await one<{
      first_lesson: Date | null;
      first_module: Date | null;
      first_credential: Date | null;
      first_attempt: Date | null;
      last_active: Date | null;
    }>(
      `select
         (select min(started_at) from module_progress where user_id = $1) as first_lesson,
         (select min(completed_at) from module_progress where user_id = $1 and completed_at is not null) as first_module,
         (select min(issued_at) from credentials where user_id = $1 and status <> 'revoked') as first_credential,
         (select min(completed_at) from assessment_attempts where user_id = $1 and completed_at is not null) as first_attempt,
         (select max(created_at) from event_logs where user_id = $1) as last_active`,
      [userId],
    );

    const days = await activeDays(userId);
    const streak = streakFrom(days);
    const at = (d: Date | null | undefined) => (d ? d.toISOString() : null);

    const lessons = counts?.lessons_done ?? 0;
    const completed = counts?.modules_completed ?? 0;
    const credentials = counts?.credentials ?? 0;

    const badges = [
      {
        id: 'diagnostic',
        title: 'Knows where they stand',
        description: 'Complete the financial-literacy diagnostic.',
        earned: (counts?.attempts ?? 0) > 0,
        earnedAt: at(marks?.first_attempt),
      },
      {
        id: 'first-lesson',
        title: 'First step',
        description: 'Complete your first lesson.',
        earned: lessons > 0,
        earnedAt: at(marks?.first_lesson),
      },
      {
        id: 'first-module',
        title: 'Module complete',
        description: 'Finish every lesson, the activity and a passing quiz.',
        earned: completed > 0,
        earnedAt: at(marks?.first_module),
      },
      {
        id: 'quiz-pass',
        title: 'Quiz passer',
        description: 'Pass a module quiz.',
        earned: (counts?.quizzes_passed ?? 0) > 0,
        earnedAt: null,
      },
      {
        id: 'first-credential',
        title: 'Credentialed',
        description: 'Earn your first micro-credential.',
        earned: credentials > 0,
        earnedAt: at(marks?.first_credential),
      },
      {
        id: 'ten-lessons',
        title: 'Ten lessons in',
        description: 'Complete ten lessons.',
        earned: lessons >= 10,
        earnedAt: null,
      },
      {
        id: 'three-modules',
        title: 'Three modules down',
        description: 'Complete three modules.',
        earned: completed >= 3,
        earnedAt: null,
      },
      {
        id: 'five-day-streak',
        title: 'Five-day streak',
        description: 'Learn five days in a row.',
        earned: streak.longest >= 5,
        earnedAt: null,
      },
      {
        id: 'feedback',
        title: 'Told us what you think',
        description: 'Rate a module.',
        earned: (counts?.feedback ?? 0) > 0,
        earnedAt: null,
      },
    ];

    const earned = badges.filter((b) => b.earned).length;
    return {
      streak,
      counts: {
        modulesCompleted: completed,
        lessonsCompleted: lessons,
        credentials,
        quizzesPassed: counts?.quizzes_passed ?? 0,
        diagnosticAttempts: counts?.attempts ?? 0,
      },
      badges,
      earned,
      total: badges.length,
      lastActiveAt: at(marks?.last_active),
    };
  });
}

// ------------------------------------------------------------------ helpers

/** Platform recommendation threshold, defaulting to the seeded 60. */
async function thresholdValue(): Promise<number> {
  const row = await one<{ value: unknown }>(
    `select value from platform_settings where key = 'recommendation.threshold'`,
  );
  const raw = row?.value;
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(raw.replace(/"/g, ''))
        : NaN;
  return Number.isFinite(n) ? n : 60;
}

/** Domains where the latest diagnostic scored below the threshold. */
async function weakDomainsFor(
  userId: string,
  threshold: number,
): Promise<Array<{ id: string; name: string; score: number }>> {
  const { rows } = await query<{ id: string; name: string; correct: number; total: number }>(
    `select d.id, d.name, ds.correct, ds.total
       from domain_scores ds
       join domains d on d.id = ds.domain_id
      where ds.attempt_id = (
        select id from assessment_attempts
         where user_id = $1 and completed_at is not null
         order by completed_at desc limit 1)`,
    [userId],
  );
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      score: Math.round((r.correct / Math.max(r.total, 1)) * 100),
    }))
    .filter((d) => d.score < threshold)
    .sort((a, b) => a.score - b.score);
}

/** Distinct UTC days on which the learner produced an event. */
async function activeDays(userId: string): Promise<string[]> {
  const { rows } = await query<{ d: string }>(
    `select distinct (created_at at time zone 'UTC')::date::text as d
       from event_logs
      where user_id = $1 and created_at > now() - interval '120 days'
      order by d desc`,
    [userId],
  );
  return rows.map((r) => r.d);
}

const DAY_MS = 86_400_000;

/** Current and longest run of consecutive active days (UTC). */
function streakFrom(days: string[]): {
  current: number;
  longest: number;
  lastActiveAt: string | null;
} {
  if (days.length === 0) return { current: 0, longest: 0, lastActiveAt: null };
  const set = new Set(days);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const now = new Date();
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Today may not be an activity day yet — the streak still stands from yesterday.
  if (!set.has(iso(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  let current = 0;
  while (set.has(iso(cursor))) {
    current += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    const t = Date.parse(`${day}T00:00:00Z`);
    run = prev !== null && t - prev === DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }

  return { current, longest, lastActiveAt: `${sorted[sorted.length - 1]}T00:00:00.000Z` };
}
