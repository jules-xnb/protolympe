import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  clientProfiles,
  clientProfileEos,
  clientProfileModuleRoles,
  clientProfileEoGroups,
  clientProfileUsers,
  moduleRoles,
  clientModules,
  eoEntities,
  eoGroups,
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const profileTemplatesRouter = new Hono();

profileTemplatesRouter.use('*', authMiddleware);

// =============================================
// Profile Templates
// =============================================

// GET /profile-templates?client_id=X — list active profile templates
profileTemplatesRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.clientId, clientId), eq(clientProfiles.isArchived, false)))
    .orderBy(clientProfiles.name);

  return c.json(toSnakeCase(result));
});

// GET /profile-templates/archived?client_id=X — list archived templates
profileTemplatesRouter.get('/archived', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.clientId, clientId), eq(clientProfiles.isArchived, true)))
    .orderBy(clientProfiles.name);

  return c.json(toSnakeCase(result));
});

// GET /profile-templates/user-templates?user_id=X&client_id=Y — list user_profile_templates
profileTemplatesRouter.get('/user-templates', async (c) => {
  const userId = c.req.query('user_id');
  const clientId = c.req.query('client_id');

  if (!userId || !clientId) {
    return c.json({ error: 'Les parametres user_id et client_id sont requis' }, 400);
  }

  const result = await db
    .select()
    .from(clientProfileUsers)
    .where(
      and(
        eq(clientProfileUsers.userId, userId),
        eq(clientProfileUsers.clientId, clientId),
      )
    )
    .orderBy(clientProfileUsers.createdAt);

  return c.json(toSnakeCase(result));
});

// GET /profile-templates/:id — single template with eos, roles, groups
profileTemplatesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [template] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.id, id));

  if (!template) {
    return c.json({ error: 'Template introuvable' }, 404);
  }

  const [eos, templateRoles, groups] = await Promise.all([
    db
      .select({
        id: clientProfileEos.id,
        profileId: clientProfileEos.profileId,
        eoId: clientProfileEos.eoId,
        includeDescendants: clientProfileEos.includeDescendants,
        createdAt: clientProfileEos.createdAt,
        eoName: eoEntities.name,
      })
      .from(clientProfileEos)
      .leftJoin(eoEntities, eq(clientProfileEos.eoId, eoEntities.id))
      .where(eq(clientProfileEos.profileId, id)),
    db
      .select({
        id: clientProfileModuleRoles.id,
        profileId: clientProfileModuleRoles.profileId,
        moduleRoleId: clientProfileModuleRoles.moduleRoleId,
        createdAt: clientProfileModuleRoles.createdAt,
        roleName: moduleRoles.name,
        roleColor: moduleRoles.color,
        moduleSlug: clientModules.moduleSlug,
      })
      .from(clientProfileModuleRoles)
      .leftJoin(moduleRoles, eq(clientProfileModuleRoles.moduleRoleId, moduleRoles.id))
      .leftJoin(clientModules, eq(moduleRoles.clientModuleId, clientModules.id))
      .where(eq(clientProfileModuleRoles.profileId, id)),
    db
      .select({
        id: clientProfileEoGroups.id,
        profileId: clientProfileEoGroups.profileId,
        groupId: clientProfileEoGroups.groupId,
        createdAt: clientProfileEoGroups.createdAt,
        groupName: eoGroups.name,
      })
      .from(clientProfileEoGroups)
      .leftJoin(eoGroups, eq(clientProfileEoGroups.groupId, eoGroups.id))
      .where(eq(clientProfileEoGroups.profileId, id)),
  ]);

  return c.json({
    ...toSnakeCase(template),
    eos: toSnakeCase(eos),
    roles: toSnakeCase(templateRoles),
    groups: toSnakeCase(groups),
  });
});

const createTemplateSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
});

// POST /profile-templates — create a template
profileTemplatesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [template] = await db
    .insert(clientProfiles)
    .values({
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .returning();

  return c.json(toSnakeCase(template), 201);
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /profile-templates/:id — update a template
profileTemplatesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description, isActive } = parsed.data;

  const [template] = await db
    .update(clientProfiles)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(eq(clientProfiles.id, id))
    .returning();

  if (!template) {
    return c.json({ error: 'Template introuvable' }, 404);
  }

  return c.json(toSnakeCase(template));
});

// DELETE /profile-templates/:id — soft delete (is_archived = true)
profileTemplatesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [template] = await db
    .update(clientProfiles)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(clientProfiles.id, id))
    .returning();

  if (!template) {
    return c.json({ error: 'Template introuvable' }, 404);
  }

  return c.json(toSnakeCase(template));
});

// PATCH /profile-templates/:id/restore — restore (is_archived = false)
profileTemplatesRouter.patch('/:id/restore', async (c) => {
  const id = c.req.param('id');

  const [template] = await db
    .update(clientProfiles)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(eq(clientProfiles.id, id))
    .returning();

  if (!template) {
    return c.json({ error: 'Template introuvable' }, 404);
  }

  return c.json(toSnakeCase(template));
});

// =============================================
// Template EOs
// =============================================

// GET /profile-templates/:id/eos — list template EOs
profileTemplatesRouter.get('/:id/eos', async (c) => {
  const id = c.req.param('id');

  const result = await db
    .select({
      id: clientProfileEos.id,
      profileId: clientProfileEos.profileId,
      eoId: clientProfileEos.eoId,
      includeDescendants: clientProfileEos.includeDescendants,
      createdAt: clientProfileEos.createdAt,
      eoName: eoEntities.name,
    })
    .from(clientProfileEos)
    .leftJoin(eoEntities, eq(clientProfileEos.eoId, eoEntities.id))
    .where(eq(clientProfileEos.profileId, id));

  return c.json(toSnakeCase(result));
});

const addEoSchema = z.object({
  eoId: z.string().uuid(),
  includeDescendants: z.boolean().optional(),
});

// POST /profile-templates/:id/eos — add EO to template
profileTemplatesRouter.post('/:id/eos', async (c) => {
  const profileId = c.req.param('id');
  const body = await c.req.json();
  const parsed = addEoSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [link] = await db
    .insert(clientProfileEos)
    .values({
      profileId,
      eoId: parsed.data.eoId,
      includeDescendants: parsed.data.includeDescendants,
    })
    .returning();

  return c.json(toSnakeCase(link), 201);
});

// DELETE /profile-templates/eos/:id — remove EO from template
profileTemplatesRouter.delete('/eos/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(clientProfileEos)
    .where(eq(clientProfileEos.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Lien EO introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Template Roles
// =============================================

// GET /profile-templates/:id/roles — list template roles
profileTemplatesRouter.get('/:id/roles', async (c) => {
  const id = c.req.param('id');

  const result = await db
    .select({
      id: clientProfileModuleRoles.id,
      profileId: clientProfileModuleRoles.profileId,
      moduleRoleId: clientProfileModuleRoles.moduleRoleId,
      createdAt: clientProfileModuleRoles.createdAt,
      roleName: moduleRoles.name,
      roleColor: moduleRoles.color,
      moduleSlug: clientModules.moduleSlug,
    })
    .from(clientProfileModuleRoles)
    .leftJoin(moduleRoles, eq(clientProfileModuleRoles.moduleRoleId, moduleRoles.id))
    .leftJoin(clientModules, eq(moduleRoles.clientModuleId, clientModules.id))
    .where(eq(clientProfileModuleRoles.profileId, id));

  return c.json(toSnakeCase(result));
});

const addRoleSchema = z.object({
  moduleRoleId: z.string().uuid(),
});

// POST /profile-templates/:id/roles — add role to template
profileTemplatesRouter.post('/:id/roles', async (c) => {
  const profileId = c.req.param('id');
  const body = await c.req.json();
  const parsed = addRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [link] = await db
    .insert(clientProfileModuleRoles)
    .values({
      profileId,
      moduleRoleId: parsed.data.moduleRoleId,
    })
    .returning();

  return c.json(toSnakeCase(link), 201);
});

// DELETE /profile-templates/roles/:id — remove role from template
profileTemplatesRouter.delete('/roles/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(clientProfileModuleRoles)
    .where(eq(clientProfileModuleRoles.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Lien role introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Template Groups
// =============================================

// GET /profile-templates/:id/groups — list template groups
profileTemplatesRouter.get('/:id/groups', async (c) => {
  const id = c.req.param('id');

  const result = await db
    .select({
      id: clientProfileEoGroups.id,
      profileId: clientProfileEoGroups.profileId,
      groupId: clientProfileEoGroups.groupId,
      createdAt: clientProfileEoGroups.createdAt,
      groupName: eoGroups.name,
    })
    .from(clientProfileEoGroups)
    .leftJoin(eoGroups, eq(clientProfileEoGroups.groupId, eoGroups.id))
    .where(eq(clientProfileEoGroups.profileId, id));

  return c.json(toSnakeCase(result));
});

const addGroupSchema = z.object({
  groupId: z.string().uuid(),
});

// POST /profile-templates/:id/groups — add group to template
profileTemplatesRouter.post('/:id/groups', async (c) => {
  const profileId = c.req.param('id');
  const body = await c.req.json();
  const parsed = addGroupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [link] = await db
    .insert(clientProfileEoGroups)
    .values({
      profileId,
      groupId: parsed.data.groupId,
    })
    .returning();

  return c.json(toSnakeCase(link), 201);
});

// DELETE /profile-templates/groups/:id — remove group from template
profileTemplatesRouter.delete('/groups/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(clientProfileEoGroups)
    .where(eq(clientProfileEoGroups.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Lien groupe introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// User Profile Templates
// =============================================

const assignTemplateSchema = z.object({
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  clientId: z.string().uuid(),
});

// POST /profile-templates/user-templates — assign template to user
profileTemplatesRouter.post('/user-templates', async (c) => {
  const body = await c.req.json();
  const parsed = assignTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const [assignment] = await db
    .insert(clientProfileUsers)
    .values({
      userId: parsed.data.userId,
      profileId: parsed.data.profileId,
      clientId: parsed.data.clientId,
    })
    .returning();

  return c.json(toSnakeCase(assignment), 201);
});

// DELETE /profile-templates/user-templates/:id — remove template assignment
profileTemplatesRouter.delete('/user-templates/:id', async (c) => {
  const id = c.req.param('id');

  const [deleted] = await db
    .delete(clientProfileUsers)
    .where(eq(clientProfileUsers.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Assignation introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default profileTemplatesRouter;
