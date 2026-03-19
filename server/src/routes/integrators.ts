import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import {
  profiles,
  userSystemRoles,
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
    id: profiles.id,
    first_name: profiles.firstName,
    last_name: profiles.lastName,
    email: profiles.email,
  };
}

const integratorsRouter = new Hono<Env>();

integratorsRouter.use('*', authMiddleware);
integratorsRouter.use('*', adminMiddleware);

// GET /integrators — list all integrators (admin_delta + integrator_delta)
integratorsRouter.get('/', async (c) => {
  const roles = await db
    .select()
    .from(userSystemRoles)
    .where(
      inArray(userSystemRoles.persona, ['admin_delta', 'integrator_delta'])
    )
    .orderBy(userSystemRoles.createdAt);

  if (roles.length === 0) return c.json([]);

  const userIds = [...new Set(roles.map((r) => r.userId))];

  const userProfiles = await db
    .select(profileSelect())
    .from(profiles)
    .where(inArray(profiles.id, userIds));

  const result = toSnakeCase(roles).map((role: Record<string, unknown>) => ({
    ...role,
    profiles: userProfiles.find((p) => p.id === role.user_id) || null,
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
      .from(profiles)
      .where(inArray(profiles.id, userIds)),
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

// GET /integrators/users-without-role — users with no system role
integratorsRouter.get('/users-without-role', async (c) => {
  const allProfiles = await db
    .select({
      ...profileSelect(),
      created_at: profiles.createdAt,
    })
    .from(profiles)
    .orderBy(profiles.createdAt);

  const rolesData = await db
    .select({ userId: userSystemRoles.userId })
    .from(userSystemRoles);

  const usersWithRoles = new Set(rolesData.map((r) => r.userId));
  const result = allProfiles.filter((p) => !usersWithRoles.has(p.id));

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
  const currentUser = c.get('user');
  const defaultPassword = process.env.DEFAULT_PASSWORD || 'Delta75002-@';

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email.toLowerCase()));

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    const [newUser] = await db
      .insert(profiles)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
      })
      .returning();
    userId = newUser.id;
  }

  try {
    await db.insert(userSystemRoles).values({
      userId,
      persona,
      createdBy: currentUser.sub,
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code !== '23505') throw err;
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

// DELETE /integrators/role/:roleId — remove system role + all assignments
integratorsRouter.delete('/role/:roleId', async (c) => {
  const roleId = c.req.param('roleId');

  const [role] = await db
    .select()
    .from(userSystemRoles)
    .where(eq(userSystemRoles.id, roleId));

  if (!role) {
    return c.json({ error: 'Rôle introuvable' }, 404);
  }

  await db
    .delete(integratorClientAssignments)
    .where(eq(integratorClientAssignments.userId, role.userId));

  await db
    .delete(userSystemRoles)
    .where(eq(userSystemRoles.id, roleId));

  return c.json({ success: true });
});

const updatePersonaSchema = z.object({
  persona: z.enum(['admin_delta', 'integrator_delta']),
});

// PATCH /integrators/role/:roleId — update persona
integratorsRouter.patch('/role/:roleId', async (c) => {
  const roleId = c.req.param('roleId');
  const body = await c.req.json();
  const parsed = updatePersonaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides' }, 400);
  }

  const [updated] = await db
    .update(userSystemRoles)
    .set({ persona: parsed.data.persona })
    .where(eq(userSystemRoles.id, roleId))
    .returning();

  if (!updated) {
    return c.json({ error: 'Rôle introuvable' }, 404);
  }

  return c.json(toSnakeCase(updated));
});

export default integratorsRouter;
