import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  clients,
  integratorClientAssignments,
  userClientMemberships,
  clientSsoConfigs,
  accounts,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import type { JwtPayload } from '../lib/jwt.js';

type Env = { Variables: { user: JwtPayload } };

const app = new Hono<Env>();

app.use('*', authMiddleware);

// ─── Schemas ────────────────────────────────────────────────────────────────

const createClientSchema = z.object({
  name: z.string().min(1),
});

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

const ssoUpsertSchema = z.object({
  provider: z.string().min(1),
  issuer_url: z.string().url(),
  client_id_oidc: z.string().min(1),
  client_secret: z.string().min(1),
  is_enabled: z.boolean().optional(),
});

// ─── GET / ──────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const user = c.get('user');

  if (user.persona === 'admin_delta') {
    const rows = await db.select().from(clients).orderBy(clients.name);
    return c.json(rows.map(toSnake));
  }

  if (user.persona === 'integrator_delta' || user.persona === 'integrator_external') {
    const rows = await db
      .select({ client: clients })
      .from(clients)
      .innerJoin(
        integratorClientAssignments,
        and(
          eq(integratorClientAssignments.clientId, clients.id),
          eq(integratorClientAssignments.userId, user.sub)
        )
      )
      .orderBy(clients.name);
    return c.json(rows.map((r) => toSnake(r.client)));
  }

  if (user.persona === 'client_user') {
    const rows = await db
      .select({ client: clients })
      .from(clients)
      .innerJoin(
        userClientMemberships,
        and(
          eq(userClientMemberships.clientId, clients.id),
          eq(userClientMemberships.userId, user.sub),
          eq(userClientMemberships.isActive, true)
        )
      )
      .orderBy(clients.name);
    return c.json(rows.map((r) => toSnake(r.client)));
  }

  return c.json({ error: 'Accès refusé' }, 403);
});

// ─── GET /:id ────────────────────────────────────────────────────────────────

app.get('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) return c.json({ error: 'Client introuvable' }, 404);

  if (user.persona === 'admin_delta') {
    return c.json(toSnake(client));
  }

  if (user.persona === 'integrator_delta' || user.persona === 'integrator_external') {
    const [assignment] = await db
      .select()
      .from(integratorClientAssignments)
      .where(
        and(
          eq(integratorClientAssignments.clientId, id),
          eq(integratorClientAssignments.userId, user.sub)
        )
      );
    if (!assignment) return c.json({ error: 'Accès refusé' }, 403);
    return c.json(toSnake(client));
  }

  if (user.persona === 'client_user') {
    const [membership] = await db
      .select()
      .from(userClientMemberships)
      .where(
        and(
          eq(userClientMemberships.clientId, id),
          eq(userClientMemberships.userId, user.sub),
          eq(userClientMemberships.isActive, true)
        )
      );
    if (!membership) return c.json({ error: 'Accès refusé' }, 403);
    return c.json(toSnake(client));
  }

  return c.json({ error: 'Accès refusé' }, 403);
});

// ─── POST / ──────────────────────────────────────────────────────────────────

app.post('/', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const rawBody = await c.req.json();
  const parsed = createClientSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;
  const [created] = await db
    .insert(clients)
    .values({ name: body.name })
    .returning();

  return c.json(toSnake(created), 201);
});

// ─── PATCH /:id ──────────────────────────────────────────────────────────────

app.patch('/:id', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  const [existing] = await db.select().from(clients).where(eq(clients.id, id));
  if (!existing) return c.json({ error: 'Client introuvable' }, 404);

  if (user.persona === 'admin_delta') {
    // allowed
  } else if (user.persona === 'integrator_delta' || user.persona === 'integrator_external') {
    const [assignment] = await db
      .select()
      .from(integratorClientAssignments)
      .where(
        and(
          eq(integratorClientAssignments.clientId, id),
          eq(integratorClientAssignments.userId, user.sub)
        )
      );
    if (!assignment) return c.json({ error: 'Accès refusé' }, 403);
  } else {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const rawBody = await c.req.json();
  const parsed = updateClientSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.is_active !== undefined) updateData.isActive = body.is_active;

  const [updated] = await db
    .update(clients)
    .set(updateData)
    .where(eq(clients.id, id))
    .returning();

  return c.json(toSnake(updated));
});

// ─── PATCH /:id/deactivate ───────────────────────────────────────────────────

app.patch('/:id/deactivate', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id } = c.req.param();

  const [existing] = await db.select().from(clients).where(eq(clients.id, id));
  if (!existing) return c.json({ error: 'Client introuvable' }, 404);

  const [updated] = await db
    .update(clients)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();

  return c.json(toSnake(updated));
});

// ─── GET /:id/integrators ────────────────────────────────────────────────────

app.get('/:id/integrators', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id } = c.req.param();

  const [existing] = await db.select().from(clients).where(eq(clients.id, id));
  if (!existing) return c.json({ error: 'Client introuvable' }, 404);

  const rows = await db
    .select({
      assignment_id: integratorClientAssignments.id,
      assigned_at: integratorClientAssignments.createdAt,
      assigned_by: integratorClientAssignments.assignedBy,
      account_id: accounts.id,
      email: accounts.email,
      first_name: accounts.firstName,
      last_name: accounts.lastName,
      persona: accounts.persona,
    })
    .from(integratorClientAssignments)
    .innerJoin(accounts, eq(accounts.id, integratorClientAssignments.userId))
    .where(eq(integratorClientAssignments.clientId, id));

  return c.json(rows);
});

// ─── GET /:id/sso ────────────────────────────────────────────────────────────

app.get('/:id/sso', async (c) => {
  const user = c.get('user');
  const { id } = c.req.param();

  const [existing] = await db.select().from(clients).where(eq(clients.id, id));
  if (!existing) return c.json({ error: 'Client introuvable' }, 404);

  if (user.persona === 'admin_delta') {
    // allowed
  } else if (user.persona === 'integrator_delta' || user.persona === 'integrator_external') {
    const [assignment] = await db
      .select()
      .from(integratorClientAssignments)
      .where(
        and(
          eq(integratorClientAssignments.clientId, id),
          eq(integratorClientAssignments.userId, user.sub)
        )
      );
    if (!assignment) return c.json({ error: 'Accès refusé' }, 403);
  } else {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [config] = await db
    .select()
    .from(clientSsoConfigs)
    .where(eq(clientSsoConfigs.clientId, id));

  if (!config) return c.json(null);

  return c.json(ssoToSnake(config));
});

// ─── PUT /:id/sso ─────────────────────────────────────────────────────────────

app.put('/:id/sso', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id } = c.req.param();

  const [existing] = await db.select().from(clients).where(eq(clients.id, id));
  if (!existing) return c.json({ error: 'Client introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedSso = ssoUpsertSchema.safeParse(rawBody);
  if (!parsedSso.success) {
    return c.json({ error: 'Données invalides', details: parsedSso.error.flatten() }, 400);
  }
  const body = parsedSso.data;

  const [existingConfig] = await db
    .select()
    .from(clientSsoConfigs)
    .where(eq(clientSsoConfigs.clientId, id));

  if (existingConfig) {
    const [updated] = await db
      .update(clientSsoConfigs)
      .set({
        provider: body.provider,
        issuerUrl: body.issuer_url,
        clientIdOidc: body.client_id_oidc,
        clientSecret: body.client_secret,
        isEnabled: body.is_enabled ?? existingConfig.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(clientSsoConfigs.clientId, id))
      .returning();
    return c.json(ssoToSnake(updated));
  }

  const [created] = await db
    .insert(clientSsoConfigs)
    .values({
      clientId: id,
      provider: body.provider,
      issuerUrl: body.issuer_url,
      clientIdOidc: body.client_id_oidc,
      clientSecret: body.client_secret,
      isEnabled: body.is_enabled ?? true,
    })
    .returning();

  return c.json(ssoToSnake(created), 201);
});

// ─── DELETE /:id/sso ─────────────────────────────────────────────────────────

app.delete('/:id/sso', async (c) => {
  const user = c.get('user');
  if (user.persona !== 'admin_delta') return c.json({ error: 'Accès refusé' }, 403);

  const { id } = c.req.param();

  const [existing] = await db.select().from(clients).where(eq(clients.id, id));
  if (!existing) return c.json({ error: 'Client introuvable' }, 404);

  const [deleted] = await db
    .delete(clientSsoConfigs)
    .where(eq(clientSsoConfigs.clientId, id))
    .returning();

  if (!deleted) return c.json({ error: 'Configuration SSO introuvable' }, 404);

  return c.json({ success: true });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSnake(client: typeof clients.$inferSelect) {
  return {
    id: client.id,
    name: client.name,
    is_active: client.isActive,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  };
}

function ssoToSnake(config: typeof clientSsoConfigs.$inferSelect) {
  return {
    id: config.id,
    client_id: config.clientId,
    provider: config.provider,
    issuer_url: config.issuerUrl,
    client_id_oidc: config.clientIdOidc,
    client_secret: config.clientSecret,
    is_enabled: config.isEnabled,
    created_at: config.createdAt,
    updated_at: config.updatedAt,
  };
}

export default app;
