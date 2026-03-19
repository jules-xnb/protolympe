import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  roles,
  roleCategories,
  userRoleAssignments,
  profiles,
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const rolesRouter = new Hono();

rolesRouter.use('*', authMiddleware);

// =============================================
// Roles
// =============================================

// GET /roles?client_id=X — list active roles for a client (with category name)
rolesRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const result = await db
    .select({
      id: roles.id,
      clientId: roles.clientId,
      name: roles.name,
      slug: roles.slug,
      description: roles.description,
      color: roles.color,
      isActive: roles.isActive,
      isArchived: roles.isArchived,
      categoryId: roles.categoryId,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
      categoryName: roleCategories.name,
    })
    .from(roles)
    .leftJoin(roleCategories, eq(roles.categoryId, roleCategories.id))
    .where(and(eq(roles.clientId, clientId), eq(roles.isArchived, false)))
    .orderBy(roles.name);

  return c.json(toSnakeCase(result));
});

// GET /roles/archived?client_id=X — list archived roles
rolesRouter.get('/archived', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const result = await db
    .select({
      id: roles.id,
      clientId: roles.clientId,
      name: roles.name,
      slug: roles.slug,
      description: roles.description,
      color: roles.color,
      isActive: roles.isActive,
      isArchived: roles.isArchived,
      categoryId: roles.categoryId,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
      categoryName: roleCategories.name,
    })
    .from(roles)
    .leftJoin(roleCategories, eq(roles.categoryId, roleCategories.id))
    .where(and(eq(roles.clientId, clientId), eq(roles.isArchived, true)))
    .orderBy(roles.name);

  return c.json(toSnakeCase(result));
});

const createRoleSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  categoryId: z.string().uuid().optional(),
});

// POST /roles — create a role
rolesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [role] = await db
    .insert(roles)
    .values({
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      color: parsed.data.color,
      categoryId: parsed.data.categoryId,
    })
    .returning();

  return c.json(toSnakeCase(role), 201);
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

// PATCH /roles/:id — update a role
rolesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, slug, description, color, isActive, categoryId } = parsed.data;

  const [role] = await db
    .update(roles)
    .set({
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(isActive !== undefined && { isActive }),
      ...(categoryId !== undefined && { categoryId }),
      updatedAt: new Date(),
    })
    .where(eq(roles.id, id))
    .returning();

  if (!role) {
    return c.json({ error: 'Role introuvable' }, 404);
  }

  return c.json(toSnakeCase(role));
});

// DELETE /roles/:id — soft delete (is_archived = true)
rolesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [role] = await db
    .update(roles)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(roles.id, id))
    .returning();

  if (!role) {
    return c.json({ error: 'Role introuvable' }, 404);
  }

  return c.json(toSnakeCase(role));
});

// PATCH /roles/:id/restore — restore (is_archived = false)
rolesRouter.patch('/:id/restore', async (c) => {
  const id = c.req.param('id');

  const [role] = await db
    .update(roles)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(eq(roles.id, id))
    .returning();

  if (!role) {
    return c.json({ error: 'Role introuvable' }, 404);
  }

  return c.json(toSnakeCase(role));
});

// =============================================
// Role Categories
// =============================================

// GET /roles/categories?client_id=X — list role categories
rolesRouter.get('/categories', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(roleCategories)
    .where(and(eq(roleCategories.clientId, clientId), eq(roleCategories.isArchived, false)))
    .orderBy(roleCategories.displayOrder);

  return c.json(toSnakeCase(result));
});

const createCategorySchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

// POST /roles/categories — create a role category
rolesRouter.post('/categories', async (c) => {
  const body = await c.req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [category] = await db
    .insert(roleCategories)
    .values({
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      isRequired: parsed.data.isRequired,
      displayOrder: parsed.data.displayOrder,
    })
    .returning();

  return c.json(toSnakeCase(category), 201);
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

// PATCH /roles/categories/:id — update a role category
rolesRouter.patch('/categories/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, slug, description, isRequired, displayOrder } = parsed.data;

  const [category] = await db
    .update(roleCategories)
    .set({
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(isRequired !== undefined && { isRequired }),
      ...(displayOrder !== undefined && { displayOrder }),
      updatedAt: new Date(),
    })
    .where(eq(roleCategories.id, id))
    .returning();

  if (!category) {
    return c.json({ error: 'Categorie introuvable' }, 404);
  }

  return c.json(toSnakeCase(category));
});

// DELETE /roles/categories/:id — soft delete category (is_archived = true)
rolesRouter.delete('/categories/:id', async (c) => {
  const id = c.req.param('id');

  const [category] = await db
    .update(roleCategories)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(roleCategories.id, id))
    .returning();

  if (!category) {
    return c.json({ error: 'Categorie introuvable' }, 404);
  }

  return c.json(toSnakeCase(category));
});

// =============================================
// User Role Assignments
// =============================================

// GET /roles/assignments?client_id=X — list user_role_assignments
rolesRouter.get('/assignments', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const assignments = await db
    .select()
    .from(userRoleAssignments)
    .where(eq(userRoleAssignments.clientId, clientId))
    .orderBy(userRoleAssignments.createdAt);

  if (assignments.length === 0) return c.json([]);

  const userIds = [...new Set(assignments.map((a) => a.userId))];
  const roleIds = [...new Set(assignments.map((a) => a.roleId))];

  const [userProfiles, roleList] = await Promise.all([
    db
      .select({ id: profiles.id, firstName: profiles.firstName, lastName: profiles.lastName, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.id, userIds)),
    db
      .select()
      .from(roles)
      .where(inArray(roles.id, roleIds)),
  ]);

  const result = toSnakeCase(assignments).map((a: Record<string, unknown>) => ({
    ...a,
    profile: toSnakeCase(userProfiles.find((p) => p.id === a.user_id)) || null,
    role: toSnakeCase(roleList.find((r) => r.id === a.role_id)) || null,
  }));

  return c.json(result);
});

const createAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  clientId: z.string().uuid(),
  assignedBy: z.string().uuid().optional(),
});

// POST /roles/assignments — create a user role assignment
rolesRouter.post('/assignments', async (c) => {
  const body = await c.req.json();
  const parsed = createAssignmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [assignment] = await db
    .insert(userRoleAssignments)
    .values({
      userId: parsed.data.userId,
      roleId: parsed.data.roleId,
      clientId: parsed.data.clientId,
      assignedBy: parsed.data.assignedBy,
    })
    .returning();

  return c.json(toSnakeCase(assignment), 201);
});

// DELETE /roles/assignments/:id — delete a user role assignment
rolesRouter.delete('/assignments/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(userRoleAssignments)
    .where(eq(userRoleAssignments.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Assignation introuvable' }, 404);
  }

  return c.json({ success: true });
});

// POST /roles/assignments/bulk-query — bulk query user_role_assignments by user_ids + role_ids
const bulkQueryAssignmentsSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1),
  role_ids: z.array(z.string().uuid()).min(1),
  is_active: z.boolean().optional(),
});

rolesRouter.post('/assignments/bulk-query', async (c) => {
  const body = await c.req.json();
  const parsed = bulkQueryAssignmentsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const conditions = [
    inArray(userRoleAssignments.userId, parsed.data.user_ids),
    inArray(userRoleAssignments.roleId, parsed.data.role_ids),
  ];

  if (parsed.data.is_active !== undefined) {
    conditions.push(eq(userRoleAssignments.isActive, parsed.data.is_active));
  }

  const result = await db
    .select()
    .from(userRoleAssignments)
    .where(and(...conditions));

  return c.json(toSnakeCase(result));
});

export default rolesRouter;
