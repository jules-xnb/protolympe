import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { globalRateLimit } from './middleware/rate-limit.js';
import authRouter from './routes/auth.js';
import adminAuditRouter from './routes/admin-audit.js';
import clientsRouter from './routes/clients.js';
import integratorsRouter from './routes/integrators.js';
import modulesRouter from './routes/modules.js';
import eoRouter from './routes/eo.js';
import profilesRouter from './routes/profiles.js';
import usersRouter from './routes/users.js';
import listsRouter from './routes/lists.js';
import designRouter from './routes/design.js';
import translationsRouter from './routes/translations.js';
import cvConfigRouter from './routes/cv-config.js';
import cvCampaignsRouter from './routes/cv-campaigns.js';
import displayConfigsRouter from './routes/display-configs.js';

const app = new Hono();

// --- Middleware chain (order matters) ---

// 1. Request ID — generates a UUID per request
app.use(requestId());

// 2. Security headers
app.use(
  secureHeaders({
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  })
);

// 3. CORS
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'],
    credentials: true,
  })
);

// 4. Compression
app.use(compress());

// 5. Body size limit — 1 MB
app.use(bodyLimit({ maxSize: 1024 * 1024 }));

// 6. Global rate limit — 100 requests per minute per IP
app.use(globalRateLimit(100, 60_000));

// 7. Structured JSON logger (replaces hono/logger)
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration_ms: duration,
      user_id: (() => { try { return ((c.get as (key: string) => unknown)('user') as { sub?: string })?.sub ?? 'anonymous'; } catch { return 'anonymous'; } })(),
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      user_agent: c.req.header('user-agent'),
      request_id: c.get('requestId'),
    })
  );
});

// --- Routes ---

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Auth
app.route('/api/auth', authRouter);

// Admin audit log
app.route('/api/admin/audit', adminAuditRouter);

// Admin / Integrator management
app.route('/api/clients', clientsRouter);
app.route('/api/integrators', integratorsRouter);

// Modules (mounted under /api for flexibility — routes handle their own prefixes)
app.route('/api', modulesRouter);

// Socle — scoped by client
app.route('/api/clients/:clientId/eo', eoRouter);
app.route('/api/clients/:clientId/profiles', profilesRouter);
app.route('/api/clients/:clientId/users', usersRouter);
app.route('/api/clients/:clientId/lists', listsRouter);
app.route('/api/clients/:clientId/design', designRouter);
app.route('/api/clients/:clientId/translations', translationsRouter);

// Module CV
app.route('/api/modules/:moduleId/cv', cvConfigRouter);
app.route('/api/modules/:moduleId/cv', cvCampaignsRouter);

// Display configs (all modules)
app.route('/api/modules/:moduleId', displayConfigsRouter);

// --- Global error handler ---
app.onError((err, c) => {
  const requestId = c.get('requestId');
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      request_id: requestId,
      error: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
    })
  );

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        request_id: requestId,
      },
      err.status
    );
  }

  return c.json(
    {
      error: 'Internal Server Error',
      request_id: requestId,
    },
    500
  );
});

const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
