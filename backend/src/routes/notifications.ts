import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../auth-plugin.js';

/**
 * Audience-aware notifications (mirrors the RLS read policy):
 *   - direct messages (recipient_id = me)
 *   - 'admins' audience → admins only
 *   - 'students' audience → students who had joined when it was created
 * Unread flag comes from notification_reads.
 */
export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // GET /notifications?limit=50&offset=0
  app.get('/', async (req) => {
    const { limit, offset, kind } = z
      .object({
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
        kind: z
          .enum(['credential', 'invite', 'student', 'assessment', 'course', 'system'])
          .optional(),
      })
      .parse(req.query);
    const userId = req.user!.sub;
    const isAdmin = req.user!.role === 'admin';

    const { rows } = await query<{
      id: string;
      audience: string;
      recipient_id: string | null;
      kind: string;
      title: string;
      body: string | null;
      link: string | null;
      created_at: Date;
      read_at: Date | null;
    }>(
      `select n.id, n.audience, n.recipient_id, n.kind, n.title, n.body, n.link, n.created_at,
              nr.read_at
         from notifications n
         left join notification_reads nr
                on nr.notification_id = n.id and nr.user_id = $1
        where (
                n.recipient_id = $1
             or (n.audience = 'admins'  and $2)
             or (n.audience = 'students' and $3)
            )
          and ($4::text is null or n.kind = $4)
        order by n.created_at desc
        limit $5 offset $6`,
      [
        userId,
        isAdmin,
        req.user!.role === 'student',
        kind ?? null,
        limit,
        offset,
      ],
    );

    const unread = await countUnread(userId, isAdmin, req.user!.role === 'student');

    return {
      notifications: rows.map((r) => ({
        id: r.id,
        recipient: r.recipient_id ?? r.audience,
        kind: r.kind,
        title: r.title,
        body: r.body,
        link: r.link,
        at: r.created_at.toISOString(),
        read: r.read_at !== null,
      })),
      unread,
    };
  });

  // GET /notifications/unread-count — poll-friendly
  app.get('/unread-count', async (req) => ({
    unread: await countUnread(req.user!.sub, req.user!.role === 'admin', req.user!.role === 'student'),
  }));

  // POST /notifications/read — { ids: string[] }; empty array marks everything
  app.post('/read', async (req, reply) => {
    const { ids } = z.object({ ids: z.array(z.string().uuid()).max(200).default([]) }).parse(req.body ?? {});
    const userId = req.user!.sub;
    const isAdmin = req.user!.role === 'admin';

    if (ids.length) {
      await query(
        `insert into notification_reads (notification_id, user_id)
         select n.id, $1 from notifications n
          where n.id = any($2)
            and (n.recipient_id = $1 or (n.audience = 'admins' and $3) or (n.audience = 'students' and $4))
         on conflict do nothing`,
        [userId, ids, isAdmin, req.user!.role === 'student'],
      );
    } else {
      await query(
        `insert into notification_reads (notification_id, user_id)
         select n.id, $1 from notifications n
          where (n.recipient_id = $1 or (n.audience = 'admins' and $2) or (n.audience = 'students' and $3))
         on conflict do nothing`,
        [userId, isAdmin, req.user!.role === 'student'],
      );
    }
    return reply.code(204).send();
  });
}

async function countUnread(userId: string, isAdmin: boolean, isStudent: boolean): Promise<number> {
  const { rows } = await query<{ n: number }>(
    `select count(*)::int as n
       from notifications n
       left join notification_reads nr
              on nr.notification_id = n.id and nr.user_id = $1
      where nr.notification_id is null
        and (n.recipient_id = $1 or (n.audience = 'admins' and $2) or (n.audience = 'students' and $3))`,
    [userId, isAdmin, isStudent],
  );
  return rows[0]?.n ?? 0;
}
