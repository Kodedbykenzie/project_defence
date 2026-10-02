import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config, isProd } from './config.js';
import { errorHandler } from './errors.js';
import { attachUser } from './auth-plugin.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { assessmentRoutes } from './routes/assessment.js';
import { moduleRoutes } from './routes/modules.js';
import { credentialRoutes } from './routes/credentials.js';
import { notificationRoutes } from './routes/notifications.js';
import { adminRoutes } from './routes/admin.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Never log tokens or passwords.
      redact: ['req.headers.authorization', 'req.body.password', 'req.body.newPassword'],
    },
    trustProxy: true,       // behind nginx / caddy in production
    bodyLimit: 256 * 1024,  // 256 KB JSON payloads
    disableRequestLogging: false,
  });

  // --- security middleware -------------------------------------------------
  await app.register(helmet, {
    contentSecurityPolicy: false,   // API responses; the SPA sets its own CSP
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(cors, {
    origin: config.APP_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });

  // --- auth: parse bearer token on every request, guards decide ------------
  app.addHook('onRequest', attachUser);

  // --- health --------------------------------------------------------------
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
  app.get('/ready', async (_req, reply) => {
    try {
      const { query } = await import('./db.js');
      await query('select 1');
      return { status: 'ready' };
    } catch {
      return reply.code(503).send({ status: 'degraded' });
    }
  });

  // --- api -----------------------------------------------------------------
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(meRoutes, { prefix: '/me' });
      await api.register(assessmentRoutes, { prefix: '/assessment' });
      await api.register(moduleRoutes, { prefix: '/modules' });
      await api.register(credentialRoutes);   // /verify/:id, /modules/:slug/credential lives in modules
      await api.register(notificationRoutes, { prefix: '/notifications' });
      await api.register(adminRoutes, { prefix: '/admin' });
    },
    { prefix: '/v1' },
  );

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ code: 'NOT_FOUND', message: `No route for ${req.method} ${req.url}` });
  });

  if (!isProd) {
    app.log.warn('Running in development mode — do not expose publicly.');
  }
  return app;
}
