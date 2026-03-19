import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { moduleRoles, clientModules } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const moduleRolesRouter = new Hono();

moduleRolesRouter.use('*', authMiddleware);

// GET /module-roles/by-client?client_id=X — all module roles for a client (grouped by module)
moduleRolesRouter.get('/by-client', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select({
      id: moduleRoles.id,
      clientModuleId: moduleRoles.clientModuleId,
      name: moduleRoles.name,
      slug: moduleRoles.slug,
      color: moduleRoles.color,
      description: moduleRoles.description,
      isActive: moduleRoles.isActive,
      createdAt: moduleRoles.createdAt,
      moduleSlug: clientModules.moduleSlug,
    })
    .from(moduleRoles)
    .innerJoin(clientModules, eq(moduleRoles.clientModuleId, clientModules.id))
    .where(and(eq(clientModules.clientId, clientId), eq(clientModules.isActive, true)))
    .orderBy(clientModules.moduleSlug, moduleRoles.name);

  return c.json(toSnakeCase(result));
});

// GET /module-roles?module_id=X — list roles for a client module
moduleRolesRouter.get('/', async (c) => {
  const moduleId = c.req.query('module_id');

  if (!moduleId) {
    return c.json({ error: 'Le paramètre module_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(moduleRoles)
    .where(eq(moduleRoles.clientModuleId, moduleId))
    .orderBy(moduleRoles.createdAt);

  return c.json(toSnakeCase(result));
});

const createSchema = z.object({
  module_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

// POST /module-roles — create a role for a client module
moduleRolesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_id, name, slug, color, description } = parsed.data;

  const [role] = await db
    .insert(moduleRoles)
    .values({
      clientModuleId: module_id,
      name,
      slug,
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
    })
    .returning();

  return c.json(toSnakeCase(role), 201);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /module-roles/:id — update a role
moduleRolesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, slug, color, description, is_active } = parsed.data;

  const [role] = await db
    .update(moduleRoles)
    .set({
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
      ...(is_active !== undefined && { isActive: is_active }),
    })
    .where(eq(moduleRoles.id, id))
    .returning();

  if (!role) {
    return c.json({ error: 'Rôle introuvable' }, 404);
  }

  return c.json(toSnakeCase(role));
});

// DELETE /module-roles/:id — delete a role (cascade handles permissions)
moduleRolesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [role] = await db
    .delete(moduleRoles)
    .where(eq(moduleRoles.id, id))
    .returning();

  if (!role) {
    return c.json({ error: 'Rôle introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default moduleRolesRouter;
