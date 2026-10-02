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

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

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
}
