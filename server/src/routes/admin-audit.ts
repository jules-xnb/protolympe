import { Hono } from 'hono';
import { db } from '../db/index.js';
import { adminAuditLog } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';
import { count, desc } from 'drizzle-orm';
import type { JwtPayload } from '../lib/jwt.js';

type Env = { Variables: { user: JwtPayload } };

const app = new Hono<Env>();

app.use('*', authMiddleware);

// GET /admin/audit — admin_delta only, paginated listing of admin_audit_log
app.get('/', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const pagination = parsePaginationParams({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  });

  const [{ total }] = await db.select({ total: count() }).from(adminAuditLog);

  const rows = await db
    .select()
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(pagination.perPage)
    .offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(rows, total, pagination));
});

export default app;
