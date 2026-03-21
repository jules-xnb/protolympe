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
import { eq, and, count, isNull } from 'drizzle-orm';
import { generateCsv, parseCsv } from '../lib/csv.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireClientAccess } from '../middleware/client-access.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { getEditableFieldSlugs } from '../lib/field-access.js';
import type { JwtPayload } from '../lib/jwt.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';
import { logAdminAction } from '../lib/audit.js';
import { findDuplicateProfile, findMatchingProfiles, isConfigEmpty, isProfileEmpty, type ProfileConfig } from '../lib/profile-duplicate-check.js';

type Env = { Variables: { user: JwtPayload } };

const router = new Hono<Env>();

router.use('*', authMiddleware);
router.use('*', requireClientAccess());

// ─── Profiles ───────────────────────────────────────────────────────────────

// POST /clients/:clientId/profiles/find-match — find existing profiles matching a configuration
const findMatchSchema = z.object({
  eos: z.array(z.object({ eo_id: z.string().uuid(), include_descendants: z.boolean() })),
  eo_groups: z.array(z.string().uuid()),
  module_roles: z.array(z.string().uuid()),
});

router.post('/find-match', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.json();
  const parsed = findMatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const config: ProfileConfig = parsed.data;

  if (isConfigEmpty(config)) {
    return c.json({ error: 'Un profil doit avoir au moins 1 entité ou 1 regroupement ET au moins 1 rôle module' }, 400);
  }

  const matches = await findMatchingProfiles(clientId, config);
  return c.json({ matches });
});

// POST /clients/:clientId/profiles/create-full — create a profile with full config atomically
const createFullSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  eos: z.array(z.object({ eo_id: z.string().uuid(), include_descendants: z.boolean() })),
  eo_groups: z.array(z.string().uuid()),
  module_roles: z.array(z.string().uuid()),
});

router.post('/create-full', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.json();
  const parsed = createFullSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description, eos, eo_groups, module_roles } = parsed.data;
  const config: ProfileConfig = { eos, eo_groups, module_roles };

  // Validate not empty
  if (isConfigEmpty(config)) {
    return c.json({ error: 'Un profil doit avoir au moins 1 entité ou 1 regroupement ET au moins 1 rôle module' }, 400);
  }

  // Check for existing match BEFORE creating
  const matches = await findMatchingProfiles(clientId, config);
  if (matches.length > 0) {
    return c.json({
      error: `Un profil identique existe déjà : "${matches[0].name}"`,
      existing_profiles: matches,
    }, 409);
  }

  // Create profile + sub-resources atomically
  const result = await db.transaction(async (tx) => {
    const [profile] = await tx.insert(clientProfiles).values({
      clientId,
      name,
      description: description || null,
    }).returning();

    if (eos.length > 0) {
      await tx.insert(clientProfileEos).values(
        eos.map((e) => ({ profileId: profile.id, eoId: e.eo_id, includeDescendants: e.include_descendants }))
      );
    }

    if (eo_groups.length > 0) {
      await tx.insert(clientProfileEoGroups).values(
        eo_groups.map((g) => ({ profileId: profile.id, groupId: g }))
      );
    }

    if (module_roles.length > 0) {
      await tx.insert(clientProfileModuleRoles).values(
        module_roles.map((r) => ({ profileId: profile.id, moduleRoleId: r }))
      );
    }

    return profile;
  });

  return c.json(toSnakeCase(result), 201);
});

// GET /clients/:clientId/profiles
router.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });

  const baseWhere = and(eq(clientProfiles.clientId, clientId), eq(clientProfiles.isArchived, false));
  const [{ total }] = await db.select({ total: count() }).from(clientProfiles).where(baseWhere);
  const result = await db
    .select()
    .from(clientProfiles)
    .where(baseWhere)
    .orderBy(clientProfiles.name)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(toSnakeCase(result) as any[], total, pagination));
});

// GET /clients/:clientId/profiles/export
router.get('/export', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const result = await db
    .select({
      id: clientProfiles.id,
      name: clientProfiles.name,
      description: clientProfiles.description,
      is_archived: clientProfiles.isArchived,
      created_at: clientProfiles.createdAt,
    })
    .from(clientProfiles)
    .where(eq(clientProfiles.clientId, clientId))
    .orderBy(clientProfiles.name);

  const csv = generateCsv(
    ['id', 'name', 'description', 'is_archived', 'created_at'],
    result
  );

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="profiles_export.csv"`);
  return c.body(csv);
});

// POST /clients/:clientId/profiles/import
router.post('/import', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.text();
  const { rows } = parseCsv(body);

  const imported: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      if (!row.name) {
        errors.push({ row: i + 2, error: 'Nom requis' });
        continue;
      }
      const [profile] = await db
        .insert(clientProfiles)
        .values({
          clientId,
          name: row.name,
          description: row.description || null,
        })
        .returning();
      imported.push(profile.id);
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', event: 'profile.import.row_failure', row: i + 2, error: err instanceof Error ? err.message : 'Unknown error' }));
      errors.push({ row: i + 2, error: 'Erreur lors de l\'import de cette ligne' });
    }
  }

  return c.json({ imported: imported.length, errors });
});

// GET /clients/:clientId/profiles/:id
router.get('/:id', async (c) => {
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
      .where(and(eq(clientProfileEos.profileId, id), isNull(clientProfileEos.deletedAt))),

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
      .where(and(eq(clientProfileEoGroups.profileId, id), isNull(clientProfileEoGroups.deletedAt))),

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
      .where(and(eq(clientProfileModuleRoles.profileId, id), isNull(clientProfileModuleRoles.deletedAt))),
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
router.post('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const user = c.get('user');
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

  await logAdminAction(user.sub, 'profile.create', 'client_profile', profile.id, { client_id: clientId, name });

  return c.json(toSnakeCase(profile), 201);
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// PATCH /clients/:clientId/profiles/:id
router.patch('/:id', async (c) => {
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
      const editableFields = await getEditableFieldSlugs(requestingUser.sub, profilsModule.id, 'profils', requestingUser.activeProfileId);
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

  await logAdminAction(requestingUser.sub, 'profile.update', 'client_profile', id, { client_id: clientId, ...parsed.data });

  return c.json(toSnakeCase(profile));
});

// PATCH /clients/:clientId/profiles/:id/archive
router.patch('/:id/archive', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');

  const [profile] = await db
    .update(clientProfiles)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)))
    .returning();

  if (!profile) {
    return c.json({ error: 'Profil introuvable' }, 404);
  }

  await logAdminAction(user.sub, 'profile.archive', 'client_profile', id, { client_id: clientId });

  return c.json(toSnakeCase(profile));
});

// ─── EOs ─────────────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/eos
router.get('/:id/eos', async (c) => {
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
    .where(and(eq(clientProfileEos.profileId, id), isNull(clientProfileEos.deletedAt)));

  return c.json(toSnakeCase(result));
});

const addEoSchema = z.object({
  eo_id: z.string().uuid(),
  include_descendants: z.boolean().optional().default(false),
});

// POST /clients/:clientId/profiles/:id/eos
router.post('/:id/eos', async (c) => {
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

  // Check for duplicate profile
  const duplicateName = await findDuplicateProfile(clientId, id);
  if (duplicateName) {
    await db.delete(clientProfileEos).where(eq(clientProfileEos.id, entry.id));
    return c.json({ error: `Ce profil est identique au profil "${duplicateName}". Deux profils ne peuvent pas avoir exactement les mêmes entités, regroupements et rôles.` }, 409);
  }

  return c.json(toSnakeCase(entry), 201);
});

// PATCH /clients/:clientId/profiles/:id/eos/:eoId — update include_descendants
const updateProfileEoSchema = z.object({
  include_descendants: z.boolean(),
});

router.patch('/:id/eos/:eoId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const eoId = c.req.param('eoId');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const body = await c.req.json();
  const parsed = updateProfileEoSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [existing] = await db
    .select({ id: clientProfileEos.id, includeDescendants: clientProfileEos.includeDescendants })
    .from(clientProfileEos)
    .where(and(
      eq(clientProfileEos.profileId, id),
      eq(clientProfileEos.eoId, eoId),
      isNull(clientProfileEos.deletedAt)
    ));

  if (!existing) return c.json({ error: 'Association introuvable' }, 404);

  const oldIncludeDescendants = existing.includeDescendants;

  const [updated] = await db
    .update(clientProfileEos)
    .set({ includeDescendants: parsed.data.include_descendants })
    .where(and(
      eq(clientProfileEos.profileId, id),
      eq(clientProfileEos.eoId, eoId),
      isNull(clientProfileEos.deletedAt)
    ))
    .returning();

  if (!updated) return c.json({ error: 'Association introuvable' }, 404);

  // Check for duplicate profile
  const duplicateName = await findDuplicateProfile(clientId, id);
  if (duplicateName) {
    await db
      .update(clientProfileEos)
      .set({ includeDescendants: oldIncludeDescendants })
      .where(eq(clientProfileEos.id, existing.id));
    return c.json({ error: `Ce profil est identique au profil "${duplicateName}". Deux profils ne peuvent pas avoir exactement les mêmes entités, regroupements et rôles.` }, 409);
  }

  return c.json(toSnakeCase(updated));
});

// DELETE /clients/:clientId/profiles/:id/eos/:eoId
router.delete('/:id/eos/:eoId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const eoId = c.req.param('eoId');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const [entry] = await db
    .update(clientProfileEos)
    .set({ deletedAt: new Date() })
    .where(and(eq(clientProfileEos.profileId, id), eq(clientProfileEos.eoId, eoId), isNull(clientProfileEos.deletedAt)))
    .returning();

  if (!entry) {
    return c.json({ error: 'Entrée introuvable' }, 404);
  }

  // Check profile won't be empty
  const empty = await isProfileEmpty(id);
  if (empty) {
    await db.update(clientProfileEos).set({ deletedAt: null }).where(eq(clientProfileEos.id, entry.id));
    return c.json({ error: 'Un profil doit avoir au moins 1 entité ou 1 regroupement ET au moins 1 rôle module' }, 400);
  }

  // Check for duplicate profile
  const duplicateName = await findDuplicateProfile(clientId, id);
  if (duplicateName) {
    await db.update(clientProfileEos).set({ deletedAt: null }).where(eq(clientProfileEos.id, entry.id));
    return c.json({ error: `Ce profil est identique au profil "${duplicateName}". Deux profils ne peuvent pas avoir exactement les mêmes entités, regroupements et rôles.` }, 409);
  }

  return c.json({ success: true });
});

// ─── EO Groups ───────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/eo-groups
router.get('/:id/eo-groups', async (c) => {
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
    .where(and(eq(clientProfileEoGroups.profileId, id), isNull(clientProfileEoGroups.deletedAt)));

  return c.json(toSnakeCase(result));
});

const addEoGroupSchema = z.object({
  group_id: z.string().uuid(),
});

// POST /clients/:clientId/profiles/:id/eo-groups
router.post('/:id/eo-groups', async (c) => {
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

  // Check for duplicate profile
  const duplicateName = await findDuplicateProfile(clientId, id);
  if (duplicateName) {
    await db.delete(clientProfileEoGroups).where(eq(clientProfileEoGroups.id, entry.id));
    return c.json({ error: `Ce profil est identique au profil "${duplicateName}". Deux profils ne peuvent pas avoir exactement les mêmes entités, regroupements et rôles.` }, 409);
  }

  return c.json(toSnakeCase(entry), 201);
});

// DELETE /clients/:clientId/profiles/:id/eo-groups/:groupId
router.delete('/:id/eo-groups/:groupId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const groupId = c.req.param('groupId');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const [entry] = await db
    .update(clientProfileEoGroups)
    .set({ deletedAt: new Date() })
    .where(and(eq(clientProfileEoGroups.profileId, id), eq(clientProfileEoGroups.groupId, groupId), isNull(clientProfileEoGroups.deletedAt)))
    .returning();

  if (!entry) {
    return c.json({ error: 'Entrée introuvable' }, 404);
  }

  // Check profile won't be empty
  const emptyAfterGroupDelete = await isProfileEmpty(id);
  if (emptyAfterGroupDelete) {
    await db.update(clientProfileEoGroups).set({ deletedAt: null }).where(eq(clientProfileEoGroups.id, entry.id));
    return c.json({ error: 'Un profil doit avoir au moins 1 entité ou 1 regroupement ET au moins 1 rôle module' }, 400);
  }

  // Check for duplicate profile
  const duplicateName2 = await findDuplicateProfile(clientId, id);
  if (duplicateName2) {
    await db.update(clientProfileEoGroups).set({ deletedAt: null }).where(eq(clientProfileEoGroups.id, entry.id));
    return c.json({ error: `Ce profil est identique au profil "${duplicateName2}". Deux profils ne peuvent pas avoir exactement les mêmes entités, regroupements et rôles.` }, 409);
  }

  return c.json({ success: true });
});

// ─── Module Roles ─────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/module-roles
router.get('/:id/module-roles', async (c) => {
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
    .where(and(eq(clientProfileModuleRoles.profileId, id), isNull(clientProfileModuleRoles.deletedAt)));

  return c.json(toSnakeCase(result));
});

const addModuleRoleSchema = z.object({
  module_role_id: z.string().uuid(),
});

// POST /clients/:clientId/profiles/:id/module-roles
router.post('/:id/module-roles', async (c) => {
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

  // Check for duplicate profile
  const duplicateName = await findDuplicateProfile(clientId, id);
  if (duplicateName) {
    await db.delete(clientProfileModuleRoles).where(eq(clientProfileModuleRoles.id, entry.id));
    return c.json({ error: `Ce profil est identique au profil "${duplicateName}". Deux profils ne peuvent pas avoir exactement les mêmes entités, regroupements et rôles.` }, 409);
  }

  return c.json(toSnakeCase(entry), 201);
});

// DELETE /clients/:clientId/profiles/:id/module-roles/:roleId
router.delete('/:id/module-roles/:roleId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const roleId = c.req.param('roleId');

  const [profile] = await db.select({ id: clientProfiles.id }).from(clientProfiles)
    .where(and(eq(clientProfiles.id, id), eq(clientProfiles.clientId, clientId)));
  if (!profile) return c.json({ error: 'Profil introuvable' }, 404);

  const [entry] = await db
    .update(clientProfileModuleRoles)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(clientProfileModuleRoles.profileId, id),
        eq(clientProfileModuleRoles.moduleRoleId, roleId),
        isNull(clientProfileModuleRoles.deletedAt)
      )
    )
    .returning();

  if (!entry) {
    return c.json({ error: 'Entrée introuvable' }, 404);
  }

  // Check profile won't be empty
  const emptyAfterRoleDelete = await isProfileEmpty(id);
  if (emptyAfterRoleDelete) {
    await db.update(clientProfileModuleRoles).set({ deletedAt: null }).where(eq(clientProfileModuleRoles.id, entry.id));
    return c.json({ error: 'Un profil doit avoir au moins 1 entité ou 1 regroupement ET au moins 1 rôle module' }, 400);
  }

  // Check for duplicate profile
  const duplicateName3 = await findDuplicateProfile(clientId, id);
  if (duplicateName3) {
    await db.update(clientProfileModuleRoles).set({ deletedAt: null }).where(eq(clientProfileModuleRoles.id, entry.id));
    return c.json({ error: `Ce profil est identique au profil "${duplicateName3}". Deux profils ne peuvent pas avoir exactement les mêmes entités, regroupements et rôles.` }, 409);
  }

  return c.json({ success: true });
});

// ─── Users ────────────────────────────────────────────────────────────────────

// GET /clients/:clientId/profiles/:id/users
router.get('/:id/users', async (c) => {
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
    .where(and(eq(clientProfileUsers.profileId, id), isNull(clientProfileUsers.deletedAt)))
    .orderBy(accounts.lastName, accounts.firstName);

  return c.json(toSnakeCase(result));
});

export default router;
