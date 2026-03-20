import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, or, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  accounts,
  clients,
  integratorClientAssignments,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { JwtPayload } from '../lib/jwt.js';
import { logAdminAction } from '../lib/audit.js';

type Env = { Variables: { user: JwtPayload } };

const app = new Hono<Env>();

app.use('*', authMiddleware);

// ─── Schemas ─────────────────────────────────────────────────────────────────

const inviteIntegratorSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  persona: z.enum(['integrator_delta', 'integrator_external']),
});

const updateIntegratorSchema = z.object({
  persona: z.enum(['integrator_delta', 'integrator_external']).optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
});

const assignClientSchema = z.object({
  client_id: z.string().uuid(),
});

// ─── GET / ───────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });
  const where = or(
    eq(accounts.persona, 'integrator_delta'),
    eq(accounts.persona, 'integrator_external')
  );

  const [{ total }] = await db.select({ total: count() }).from(accounts).where(where);
  const rows = await db
    .select()
    .from(accounts)
    .where(where)
    .orderBy(accounts.lastName, accounts.firstName)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(rows.map(accountToSnake), total, pagination));
});

// ─── POST /invite ─────────────────────────────────────────────────────────────

app.post('/invite', rateLimit(5, 60_000), async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const rawBody = await c.req.json();
  const parsed = inviteIntegratorSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, body.email));

  if (existing) {
    return c.json({ error: 'Un compte avec cet email existe déjà' }, 409);
  }

  // No default password: account is created with passwordHash = null.
  // The integrator must set their password via the reset-password flow on first login.
  const [created] = await db
    .insert(accounts)
    .values({
      email: body.email,
      firstName: body.first_name,
      lastName: body.last_name,
      persona: body.persona,
      passwordHash: null,
    })
    .returning();

  await logAdminAction(user.sub, 'integrator.invite', 'account', created.id, { email: created.email, persona: created.persona });

  return c.json(accountToSnake(created), 201);
});

// ─── PATCH /:id ───────────────────────────────────────────────────────────────

app.patch('/:id', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id } = c.req.param();

  const [existing] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.id, id),
        or(
          eq(accounts.persona, 'integrator_delta'),
          eq(accounts.persona, 'integrator_external')
        )
      )
    );

  if (!existing) return c.json({ error: 'Intégrateur introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsed = updateIntegratorSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.persona !== undefined) updateData.persona = body.persona;
  if (body.first_name !== undefined) updateData.firstName = body.first_name;
  if (body.last_name !== undefined) updateData.lastName = body.last_name;

  const [updated] = await db
    .update(accounts)
    .set(updateData)
    .where(eq(accounts.id, id))
    .returning();

  await logAdminAction(user.sub, 'integrator.update', 'account', id, body as Record<string, unknown>);

  return c.json(accountToSnake(updated));
});

// ─── GET /:id/clients ─────────────────────────────────────────────────────────

app.get('/:id/clients', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id } = c.req.param();

  const [existing] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.id, id),
        or(
          eq(accounts.persona, 'integrator_delta'),
          eq(accounts.persona, 'integrator_external')
        )
      )
    );

  if (!existing) return c.json({ error: 'Intégrateur introuvable' }, 404);

  const rows = await db
    .select({
      assignment_id: integratorClientAssignments.id,
      assigned_at: integratorClientAssignments.createdAt,
      assigned_by: integratorClientAssignments.assignedBy,
      client_id: clients.id,
      client_name: clients.name,
      client_is_active: clients.isActive,
    })
    .from(integratorClientAssignments)
    .innerJoin(clients, eq(clients.id, integratorClientAssignments.clientId))
    .where(eq(integratorClientAssignments.userId, id))
    .orderBy(clients.name);

  return c.json(rows);
});

// ─── POST /:id/clients ────────────────────────────────────────────────────────

app.post('/:id/clients', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id } = c.req.param();

  const [integrator] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.id, id),
        or(
          eq(accounts.persona, 'integrator_delta'),
          eq(accounts.persona, 'integrator_external')
        )
      )
    );

  if (!integrator) return c.json({ error: 'Intégrateur introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsed = assignClientSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, body.client_id));

  if (!client) return c.json({ error: 'Client introuvable' }, 404);

  const [alreadyAssigned] = await db
    .select()
    .from(integratorClientAssignments)
    .where(
      and(
        eq(integratorClientAssignments.userId, id),
        eq(integratorClientAssignments.clientId, body.client_id)
      )
    );

  if (alreadyAssigned) {
    return c.json({ error: 'Cet intégrateur est déjà assigné à ce client' }, 409);
  }

  const [created] = await db
    .insert(integratorClientAssignments)
    .values({
      userId: id,
      clientId: body.client_id,
      assignedBy: user.sub,
    })
    .returning();

  await logAdminAction(user.sub, 'integrator.client.assign', 'account', id, { client_id: body.client_id });

  return c.json(
    {
      id: created.id,
      user_id: created.userId,
      client_id: created.clientId,
      assigned_by: created.assignedBy,
      created_at: created.createdAt,
    },
    201
  );
});

// ─── DELETE /:id/clients/:clientId ────────────────────────────────────────────

app.delete('/:id/clients/:clientId', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id, clientId } = c.req.param();

  const [existing] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.id, id),
        or(
          eq(accounts.persona, 'integrator_delta'),
          eq(accounts.persona, 'integrator_external')
        )
      )
    );

  if (!existing) return c.json({ error: 'Intégrateur introuvable' }, 404);

  const [deleted] = await db
    .delete(integratorClientAssignments)
    .where(
      and(
        eq(integratorClientAssignments.userId, id),
        eq(integratorClientAssignments.clientId, clientId)
      )
    )
    .returning();

  if (!deleted) return c.json({ error: 'Assignation introuvable' }, 404);

  await logAdminAction(user.sub, 'integrator.client.remove', 'account', id, { client_id: clientId });

  return c.json({ success: true });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accountToSnake(account: typeof accounts.$inferSelect) {
  return {
    id: account.id,
    email: account.email,
    first_name: account.firstName,
    last_name: account.lastName,
    persona: account.persona,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  };
}

export default app;
