import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import {
  accounts,
  integratorClientAssignments,
  clients,
} from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { toSnakeCase } from '../lib/case-transform.js';
import type { JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

function profileSelect() {
  return {
    id: accounts.id,
    first_name: accounts.firstName,
    last_name: accounts.lastName,
    email: accounts.email,
  };
}

const integratorsRouter = new Hono<Env>();

integratorsRouter.use('*', authMiddleware);
integratorsRouter.use('*', adminMiddleware);

// GET /integrators — list all integrators (admin_delta + integrator_delta)
integratorsRouter.get('/', async (c) => {
  const rows = await db
    .select({
      id: accounts.id,
      userId: accounts.id,
      persona: accounts.persona,
      createdAt: accounts.createdAt,
      first_name: accounts.firstName,
      last_name: accounts.lastName,
      email: accounts.email,
    })
    .from(accounts)
    .where(
      inArray(accounts.persona, ['admin_delta', 'integrator_delta'])
    )
    .orderBy(accounts.createdAt);

  const result = rows.map((row) => ({
    id: row.id,
    user_id: row.userId,
    persona: row.persona,
    created_at: row.createdAt,
    profiles: {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
    },
  }));

  return c.json(result);
});

// GET /integrators/assignments — list all integrator-client assignments
integratorsRouter.get('/assignments', async (c) => {
  const assignments = await db
    .select()
    .from(integratorClientAssignments)
    .orderBy(integratorClientAssignments.createdAt);

  if (assignments.length === 0) return c.json([]);

  const userIds = [...new Set(assignments.map((a) => a.userId))];
  const clientIds = [...new Set(assignments.map((a) => a.clientId))];

  const [userProfiles, clientList] = await Promise.all([
    db
      .select(profileSelect())
      .from(accounts)
      .where(inArray(accounts.id, userIds)),
    db
      .select()
      .from(clients)
      .where(inArray(clients.id, clientIds)),
  ]);

  const result = toSnakeCase(assignments).map((a: Record<string, unknown>) => ({
    ...a,
    profiles: userProfiles.find((p) => p.id === a.user_id) || null,
    clients: toSnakeCase(clientList.find((cl) => cl.id === a.client_id)) || null,
  }));

  return c.json(result);
});

// GET /integrators/users-without-role — users with no system persona (end users)
integratorsRouter.get('/users-without-role', async (c) => {
  const allProfiles = await db
    .select({
      ...profileSelect(),
      created_at: accounts.createdAt,
      persona: accounts.persona,
    })
    .from(accounts)
    .orderBy(accounts.createdAt);

  const result = allProfiles.filter(
    (p) => p.persona !== 'admin_delta' && p.persona !== 'integrator_delta'
  );

  return c.json(result);
});

// GET /integrators/is-admin — check if current user is admin
integratorsRouter.get('/is-admin', async (c) => {
  return c.json({ isAdmin: true });
});

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  persona: z.enum(['admin_delta', 'integrator_delta']),
});

// POST /integrators/invite — create integrator account
integratorsRouter.post('/invite', async (c) => {
  const body = await c.req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { email, firstName, lastName, persona } = parsed.data;
  const defaultPassword = process.env.DEFAULT_PASSWORD || 'Delta75002-@';

  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.email, email.toLowerCase()));

  let userId: string;

  if (existing) {
    userId = existing.id;
    await db
      .update(accounts)
      .set({ persona })
      .where(eq(accounts.id, userId));
  } else {
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    const [newUser] = await db
      .insert(accounts)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        persona,
      })
      .returning();
    userId = newUser.id;
  }

  return c.json({
    success: true,
    userId,
    message: existing
      ? "Rôle ajouté à l'utilisateur existant"
      : 'Compte créé avec le mot de passe par défaut',
  });
});

const assignSchema = z.object({
  userId: z.string().uuid(),
  clientId: z.string().uuid(),
  persona: z.enum(['admin_delta', 'integrator_delta']),
});

// POST /integrators/assign — assign integrator to client
integratorsRouter.post('/assign', async (c) => {
  const body = await c.req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides' }, 400);
  }

  const currentUser = c.get('user');

  const [assignment] = await db
    .insert(integratorClientAssignments)
    .values({
      ...parsed.data,
      assignedBy: currentUser.sub,
    })
    .returning();

  return c.json(toSnakeCase(assignment), 201);
});

// DELETE /integrators/assignments/:id — remove assignment
integratorsRouter.delete('/assignments/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(integratorClientAssignments)
    .where(eq(integratorClientAssignments.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Assignation introuvable' }, 404);
  }

  return c.json({ success: true });
});

// DELETE /integrators/role/:userId — remove system persona + all assignments
integratorsRouter.delete('/role/:userId', async (c) => {
  const userId = c.req.param('userId');

  const [profile] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, userId));

  if (!profile) {
    return c.json({ error: 'Utilisateur introuvable' }, 404);
  }

  await db
    .delete(integratorClientAssignments)
    .where(eq(integratorClientAssignments.userId, userId));

  await db
    .update(accounts)
    .set({ persona: 'integrator_external' })
    .where(eq(accounts.id, userId));

  return c.json({ success: true });
});

const updatePersonaSchema = z.object({
  persona: z.enum(['admin_delta', 'integrator_delta']),
});

// PATCH /integrators/role/:userId — update persona
integratorsRouter.patch('/role/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const parsed = updatePersonaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides' }, 400);
  }

  const [updated] = await db
    .update(accounts)
    .set({ persona: parsed.data.persona })
    .where(eq(accounts.id, userId))
    .returning();

  if (!updated) {
    return c.json({ error: 'Utilisateur introuvable' }, 404);
  }

  return c.json(toSnakeCase(updated));
});

export default integratorsRouter;
