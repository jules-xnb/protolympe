import { Hono } from 'hono';
import { db } from '../db/index.js';
import { adminAuditLog } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { count, desc } from 'drizzle-orm';
import type { JwtPayload } from '../lib/jwt.js';

type Env = { Variables: { user: JwtPayload } };

const router = new Hono<Env>();

router.use('*', authMiddleware);

// GET /admin/audit — admin_delta only, paginated listing of admin_audit_log
router.get('/', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const pagination = parsePaginationParams({
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
  });

  const [{ total }] = await db.select({ total: count() }).from(adminAuditLog);

  const rows = await db
    .select({
      id: adminAuditLog.id,
      actorId: adminAuditLog.actorId,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      details: adminAuditLog.details,
      createdAt: adminAuditLog.createdAt,
    })
    .from(adminAuditLog)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(pagination.perPage)
    .offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(toSnakeCase(rows) as any[], total, pagination));
});

export default router;
