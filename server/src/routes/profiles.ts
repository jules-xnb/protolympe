import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  clientProfiles,
  clientProfileEos,
  clientProfileEoGroups,
  clientProfileModuleRoles,
  clientProfileUsers,
  accounts,
  eoEntities,
  eoGroups,
  moduleRoles,
  clientModules,
} from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { requireClientAccess } from '../middleware/client-access.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { getEditableFieldSlugs } from '../lib/field-access.js';
import type { JwtPayload } from '../lib/jwt.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';

type Env = { Variables: { user: JwtPayload } };

const profilesRouter = new Hono<Env>();

profilesRouter.use('*', authMiddleware);
profilesRouter.use('*', requireClientAccess());

// ─── Profiles ───────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles
profilesRouter.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });

  const [{ total }] = await db.select({ total: count() }).from(clientProfiles).where(eq(clientProfiles.clientId, clientId));
  const result = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.clientId, clientId))
    .orderBy(clientProfiles.name)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(toSnakeCase(result) as any[], total, pagination));
});

// GET /clients/:clientId/profiles/:id
profilesRouter.get('/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));

  if (!profile) {
    return c.json({ error: 'Profil introuvable' }, 404);
  }

  const [eos, groups, moduleRolesResult] = await Promise.all([
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
        id: clientProfileEoGroups.id,
        profileId: clientProfileEoGroups.profileId,
        groupId: clientProfileEoGroups.groupId,
        createdAt: clientProfileEoGroups.createdAt,
        groupName: eoGroups.name,
      })
      .from(clientProfileEoGroups)
      .leftJoin(eoGroups, eq(clientProfileEoGroups.groupId, eoGroups.id))
      .where(eq(clientProfileEoGroups.profileId, id)),

    db
      .select({
        id: clientProfileModuleRoles.id,
        profileId: clientProfileModuleRoles.profileId,
        moduleRoleId: clientProfileModuleRoles.moduleRoleId,
        createdAt: clientProfileModuleRoles.createdAt,
        roleId: moduleRoles.id,
        roleName: moduleRoles.name,
        roleColor: moduleRoles.color,
      })
      .from(clientProfileModuleRoles)
      .leftJoin(moduleRoles, eq(clientProfileModuleRoles.moduleRoleId, moduleRoles.id))
      .where(eq(clientProfileModuleRoles.profileId, id)),
  ]);

  return c.json(
    toSnakeCase({
      ...profile,
      eos,
      groups,
      moduleRoles: moduleRolesResult,
    })
  );
});

const createProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// POST /clients/:clientId/profiles
profilesRouter.post('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.json();
  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description } = parsed.data;

  const [profile] = await db
    .insert(clientProfiles)
    .values({
      clientId,
      name,
      ...(description !== undefined && { description }),
    })
    .returning();

  return c.json(toSnakeCase(profile), 201);
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// PATCH /clients/:clientId/profiles/:id
profilesRouter.patch('/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const requestingUser = c.get('user');
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  // Field access check for client_user persona
  if (requestingUser.persona === 'client_user') {
    const [profilsModule] = await db
      .select({ id: clientModules.id })
      .from(clientModules)
      .where(and(eq(clientModules.clientId, clientId), eq(clientModules.moduleSlug, 'profils')))
      .limit(1);

    if (profilsModule) {
      const editableFields = await getEditableFieldSlugs(requestingUser.sub, profilsModule.id, 'profils');
      const requestedFields = Object.keys(body) as string[];
      for (const field of requestedFields) {
        if (!editableFields.has(field)) {
          return c.json({ error: `Champ non autorisé : ${field}` }, 403);
        }
      }
    }
  }

  const { name, description } = parsed.data;

  const [profile] = await db
    .update(clientProfiles)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      updatedAt: new Date(),
    })
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)))
    .returning();

  if (!profile) {
    return c.json({ error: 'Profil introuvable' }, 404);
  }

  return c.json(toSnakeCase(profile));
});

// PATCH /clients/:clientId/profiles/:id/archive
profilesRouter.patch('/:id/archive', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db
    .update(clientProfiles)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)))
    .returning();

  if (!profile) {
    return c.json({ error: 'Profil introuvable' }, 404);
  }

  return c.json(toSnakeCase(profile));
});

// ─── EOs ─────────────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/eos
profilesRouter.get('/:id/eos', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const result = await db
    .select({
      id: clientProfileEos.id,
      profileId: clientProfileEos.profileId,
      eoId: clientProfileEos.eoId,
      includeDescendants: clientProfileEos.includeDescendants,
      createdAt: clientProfileEos.createdAt,
      eoName: eoEntities.name,
      eoPath: eoEntities.path,
      eoLevel: eoEntities.level,
    })
    .from(clientProfileEos)
    .leftJoin(eoEntities, eq(clientProfileEos.eoId, eoEntities.id))
    .where(eq(clientProfileEos.profileId, id));

  return c.json(toSnakeCase(result));
});

const addEoSchema = z.object({
  eo_id: z.string().uuid(),
  include_descendants: z.boolean().optional().default(false),
});

// POST /clients/:clientId/profiles/:id/eos
profilesRouter.post('/:id/eos', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const body = await c.req.json();
  const parsed = addEoSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { eo_id, include_descendants } = parsed.data;

  const [entry] = await db
    .insert(clientProfileEos)
    .values({
      profileId: id,
      eoId: eo_id,
      includeDescendants: include_descendants,
    })
    .returning();

  return c.json(toSnakeCase(entry), 201);
});

// DELETE /clients/:clientId/profiles/:id/eos/:eoId
profilesRouter.delete('/:id/eos/:eoId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const eoId = c.req.param('eoId');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const [entry] = await db
    .delete(clientProfileEos)
    .where(and(eq(clientProfileEos.profileId, id), eq(clientProfileEos.eoId, eoId)))
    .returning();

  if (!entry) {
    return c.json({ error: 'Entrée introuvable' }, 404);
  }

  return c.json({ success: true });
});

// ─── EO Groups ───────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/eo-groups
profilesRouter.get('/:id/eo-groups', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const result = await db
    .select({
      id: clientProfileEoGroups.id,
      profileId: clientProfileEoGroups.profileId,
      groupId: clientProfileEoGroups.groupId,
      createdAt: clientProfileEoGroups.createdAt,
      groupName: eoGroups.name,
      groupDescription: eoGroups.description,
    })
    .from(clientProfileEoGroups)
    .leftJoin(eoGroups, eq(clientProfileEoGroups.groupId, eoGroups.id))
    .where(eq(clientProfileEoGroups.profileId, id));

  return c.json(toSnakeCase(result));
});

const addEoGroupSchema = z.object({
  group_id: z.string().uuid(),
});

// POST /clients/:clientId/profiles/:id/eo-groups
profilesRouter.post('/:id/eo-groups', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const body = await c.req.json();
  const parsed = addEoGroupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entry] = await db
    .insert(clientProfileEoGroups)
    .values({
      profileId: id,
      groupId: parsed.data.group_id,
    })
    .returning();

  return c.json(toSnakeCase(entry), 201);
});

// DELETE /clients/:clientId/profiles/:id/eo-groups/:groupId
profilesRouter.delete('/:id/eo-groups/:groupId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const groupId = c.req.param('groupId');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const [entry] = await db
    .delete(clientProfileEoGroups)
    .where(and(eq(clientProfileEoGroups.profileId, id), eq(clientProfileEoGroups.groupId, groupId)))
    .returning();

  if (!entry) {
    return c.json({ error: 'Entrée introuvable' }, 404);
  }

  return c.json({ success: true });
});

// ─── Module Roles ─────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/module-roles
profilesRouter.get('/:id/module-roles', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const result = await db
    .select({
      id: clientProfileModuleRoles.id,
      profileId: clientProfileModuleRoles.profileId,
      moduleRoleId: clientProfileModuleRoles.moduleRoleId,
      createdAt: clientProfileModuleRoles.createdAt,
      roleName: moduleRoles.name,
      roleColor: moduleRoles.color,
      roleDescription: moduleRoles.description,
    })
    .from(clientProfileModuleRoles)
    .leftJoin(moduleRoles, eq(clientProfileModuleRoles.moduleRoleId, moduleRoles.id))
    .where(eq(clientProfileModuleRoles.profileId, id));

  return c.json(toSnakeCase(result));
});

const addModuleRoleSchema = z.object({
  module_role_id: z.string().uuid(),
});

// POST /clients/:clientId/profiles/:id/module-roles
profilesRouter.post('/:id/module-roles', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const body = await c.req.json();
  const parsed = addModuleRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entry] = await db
    .insert(clientProfileModuleRoles)
    .values({
      profileId: id,
      moduleRoleId: parsed.data.module_role_id,
    })
    .returning();

  return c.json(toSnakeCase(entry), 201);
});

// DELETE /clients/:clientId/profiles/:id/module-roles/:roleId
profilesRouter.delete('/:id/module-roles/:roleId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const roleId = c.req.param('roleId');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const [entry] = await db
    .delete(clientProfileModuleRoles)
    .where(
      and(
        eq(clientProfileModuleRoles.profileId, id),
        eq(clientProfileModuleRoles.moduleRoleId, roleId)
      )
    )
    .returning();

  if (!entry) {
    return c.json({ error: 'Entrée introuvable' }, 404);
  }

  return c.json({ success: true });
});

// ─── Users ────────────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/users
profilesRouter.get('/:id/users', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const result = await db
    .select({
      id: clientProfileUsers.id,
      userId: clientProfileUsers.userId,
      profileId: clientProfileUsers.profileId,
      createdAt: clientProfileUsers.createdAt,
      email: accounts.email,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      persona: accounts.persona,
    })
    .from(clientProfileUsers)
    .innerJoin(accounts, eq(clientProfileUsers.userId, accounts.id))
    .where(eq(clientProfileUsers.profileId, id))
    .orderBy(accounts.lastName, accounts.firstName);

  return c.json(toSnakeCase(result));
});

export default profilesRouter;
