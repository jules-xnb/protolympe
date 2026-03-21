import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  clientModules,
  moduleRoles,
  modulePermissions,
  clientProfileUsers,
  clientProfileModuleRoles,
} from '../db/schema.js';
import { eq, and, inArray, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { requireClientAccess } from '../middleware/client-access.js';
import { toSnakeCase } from '../lib/case-transform.js';
import type { JwtPayload } from '../lib/jwt.js';
import { logAdminAction } from '../lib/audit.js';
import { getUserPermissions, hasClientAccess } from '../lib/cache.js';

type Env = { Variables: { user: JwtPayload } };

const router = new Hono<Env>();

router.use('*', authMiddleware);
router.use('/clients/:clientId/*', requireClientAccess());

// =============================================
// Module activation — /clients/:clientId/modules
// =============================================

// GET /clients/:clientId/modules
// Admin/integrator: all modules for the client.
// client_user: only modules where they have a role via profiles.
router.get('/clients/:clientId/modules', async (c) => {
  const { clientId } = c.req.param();
  const user = c.get('user');
  const persona = user.persona;

  if (persona === 'client_user') {
    const userId = user.sub;

    // 1. Get all profiles the user belongs to
    const profileRows = await db
      .select({ profileId: clientProfileUsers.profileId })
      .from(clientProfileUsers)
      .where(and(eq(clientProfileUsers.userId, userId), isNull(clientProfileUsers.deletedAt)));

    const profileIds = profileRows.map((r) => r.profileId);

    if (profileIds.length === 0) {
      return c.json([]);
    }

    // 2. Get all module role assignments for those profiles
    const moduleRoleRows = await db
      .select({ moduleRoleId: clientProfileModuleRoles.moduleRoleId })
      .from(clientProfileModuleRoles)
      .where(and(inArray(clientProfileModuleRoles.profileId, profileIds), isNull(clientProfileModuleRoles.deletedAt)));

    const moduleRoleIds = moduleRoleRows.map((r) => r.moduleRoleId);

    if (moduleRoleIds.length === 0) {
      return c.json([]);
    }

    // 3. Get client_module_ids from those module roles
    const roleRows = await db
      .select({ clientModuleId: moduleRoles.clientModuleId })
      .from(moduleRoles)
      .where(inArray(moduleRoles.id, moduleRoleIds));

    const clientModuleIds = [...new Set(roleRows.map((r) => r.clientModuleId))];

    if (clientModuleIds.length === 0) {
      return c.json([]);
    }

    // 4. Return those client modules
    const modules = await db
      .select()
      .from(clientModules)
      .where(
        and(
          eq(clientModules.clientId, clientId),
          inArray(clientModules.id, clientModuleIds),
          eq(clientModules.isActive, true),
        ),
      )
      .orderBy(clientModules.displayOrder);

    return c.json(toSnakeCase(modules));
  }

  // Admin / integrator: return all modules for the client
  if (
    persona === 'admin_delta' ||
    persona === 'integrator_delta' ||
    persona === 'integrator_external'
  ) {
    const modules = await db
      .select()
      .from(clientModules)
      .where(eq(clientModules.clientId, clientId))
      .orderBy(clientModules.displayOrder);

    return c.json(toSnakeCase(modules));
  }

  return c.json({ error: 'Accès refusé' }, 403);
});

const activateModuleSchema = z.object({
  module_slug: z.string().min(1),
});

// POST /clients/:clientId/modules — activate a module for a client
router.post('/clients/:clientId/modules', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { clientId } = c.req.param();
  const body = await c.req.json();
  const parsed = activateModuleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_slug } = parsed.data;

  const [clientModule] = await db
    .insert(clientModules)
    .values({
      clientId,
      moduleSlug: module_slug,
    })
    .returning();

  await logAdminAction(user.sub, 'module.activate', 'client_module', clientModule.id, { client_id: clientId, module_slug });

  return c.json(toSnakeCase(clientModule), 201);
});

const updateModuleSchema = z.object({
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

// PATCH /clients/:clientId/modules/:id — update a module (is_active, display_order)
router.patch('/clients/:clientId/modules/:id', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { clientId, id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateModuleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { is_active, display_order } = parsed.data;

  const [updated] = await db
    .update(clientModules)
    .set({
      ...(is_active !== undefined && { isActive: is_active }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      updatedAt: new Date(),
    })
    .where(and(eq(clientModules.id, id), eq(clientModules.clientId, clientId)))
    .returning();

  if (!updated) {
    return c.json({ error: 'Module introuvable' }, 404);
  }

  await logAdminAction(user.sub, 'module.update', 'client_module', id, { client_id: clientId, ...parsed.data });

  return c.json(toSnakeCase(updated));
});

const reorderModulesSchema = z.object({
  module_ids: z.array(z.string().uuid()).min(1).max(500),
});

// PATCH /clients/:clientId/modules/reorder — reorder modules
router.patch('/clients/:clientId/modules/reorder', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { clientId } = c.req.param();
  const body = await c.req.json();
  const parsed = reorderModulesSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_ids } = parsed.data;

  await Promise.all(
    module_ids.map((moduleId, index) =>
      db
        .update(clientModules)
        .set({ displayOrder: index, updatedAt: new Date() })
        .where(and(eq(clientModules.id, moduleId), eq(clientModules.clientId, clientId))),
    ),
  );

  return c.json({ success: true });
});

// =============================================
// Helper — verify that the caller has access to the client owning this module
// =============================================

async function verifyModuleClientAccess(moduleId: string, userId: string, persona: string): Promise<string | null> {
  if (persona === 'admin_delta') return null;

  const [mod] = await db
    .select({ clientId: clientModules.clientId })
    .from(clientModules)
    .where(eq(clientModules.id, moduleId))
    .limit(1);

  if (!mod) return 'Module introuvable';

  const permissions = await getUserPermissions(userId);
  if (!hasClientAccess(permissions, mod.clientId, persona)) {
    return 'Accès refusé à ce module';
  }
  return null;
}

// =============================================
// Roles — /modules/:moduleId/roles
// =============================================

// GET /modules/:moduleId/roles — list roles for a module
router.get('/modules/:moduleId/roles', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const accessError = await verifyModuleClientAccess(moduleId, user.sub, persona);
  if (accessError) return c.json({ error: accessError }, 403);

  const roles = await db
    .select()
    .from(moduleRoles)
    .where(eq(moduleRoles.clientModuleId, moduleId))
    .orderBy(moduleRoles.createdAt);

  return c.json(toSnakeCase(roles));
});

const createRoleSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  description: z.string().optional(),
});

// POST /modules/:moduleId/roles — create a role for a module
router.post('/modules/:moduleId/roles', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const accessError = await verifyModuleClientAccess(moduleId, user.sub, persona);
  if (accessError) return c.json({ error: accessError }, 403);
  const body = await c.req.json();
  const parsed = createRoleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, color, description } = parsed.data;

  const [role] = await db
    .insert(moduleRoles)
    .values({
      clientModuleId: moduleId,
      name,
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
    })
    .returning();

  await logAdminAction(user.sub, 'module.role.create', 'module_role', role.id, { module_id: moduleId, name });

  return c.json(toSnakeCase(role), 201);
});

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /modules/:moduleId/roles/:id — update a role
router.patch('/modules/:moduleId/roles/:id', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();
  const accessError = await verifyModuleClientAccess(moduleId, user.sub, persona);
  if (accessError) return c.json({ error: accessError }, 403);
  const body = await c.req.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, color, description, is_active } = parsed.data;

  const [role] = await db
    .update(moduleRoles)
    .set({
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(description !== undefined && { description }),
      ...(is_active !== undefined && { isActive: is_active }),
    })
    .where(and(eq(moduleRoles.id, id), eq(moduleRoles.clientModuleId, moduleId)))
    .returning();

  if (!role) {
    return c.json({ error: 'Rôle introuvable' }, 404);
  }

  await logAdminAction(user.sub, 'module.role.update', 'module_role', id, { module_id: moduleId, ...parsed.data });

  return c.json(toSnakeCase(role));
});

// PATCH /modules/:moduleId/roles/:id/deactivate — deactivate a role
router.patch('/modules/:moduleId/roles/:id/deactivate', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();
  const accessError = await verifyModuleClientAccess(moduleId, user.sub, persona);
  if (accessError) return c.json({ error: accessError }, 403);

  const [role] = await db
    .update(moduleRoles)
    .set({ isActive: false })
    .where(and(eq(moduleRoles.id, id), eq(moduleRoles.clientModuleId, moduleId)))
    .returning();

  if (!role) {
    return c.json({ error: 'Rôle introuvable' }, 404);
  }

  return c.json(toSnakeCase(role));
});

// =============================================
// Permissions — /modules/:moduleId/permissions
// =============================================

// GET /modules/:moduleId/permissions — list all permissions with grant status per role
router.get('/modules/:moduleId/permissions', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const accessError = await verifyModuleClientAccess(moduleId, user.sub, persona);
  if (accessError) return c.json({ error: accessError }, 403);

  const permissions = await db
    .select({
      id: modulePermissions.id,
      clientModuleId: modulePermissions.clientModuleId,
      permissionSlug: modulePermissions.permissionSlug,
      moduleRoleId: modulePermissions.moduleRoleId,
      isGranted: modulePermissions.isGranted,
      createdAt: modulePermissions.createdAt,
      roleName: moduleRoles.name,
      roleColor: moduleRoles.color,
      roleIsActive: moduleRoles.isActive,
    })
    .from(modulePermissions)
    .innerJoin(moduleRoles, eq(modulePermissions.moduleRoleId, moduleRoles.id))
    .where(eq(modulePermissions.clientModuleId, moduleId))
    .orderBy(moduleRoles.name, modulePermissions.permissionSlug);

  return c.json(toSnakeCase(permissions));
});

const updatePermissionsSchema = z.object({
  permissions: z
    .array(
      z.object({
        module_role_id: z.string().uuid(),
        permission_slug: z.string().min(1),
        is_granted: z.boolean(),
      }),
    )
    .min(1)
    .max(500),
});

// PUT /modules/:moduleId/permissions — batch update permissions
router.put('/modules/:moduleId/permissions', async (c) => {
  const user = c.get('user');
  const persona = user.persona;

  if (
    persona !== 'admin_delta' &&
    persona !== 'integrator_delta' &&
    persona !== 'integrator_external'
  ) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const accessError = await verifyModuleClientAccess(moduleId, user.sub, persona);
  if (accessError) return c.json({ error: accessError }, 403);
  const body = await c.req.json();
  const parsed = updatePermissionsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { permissions } = parsed.data;

  await Promise.all(
    permissions.map(({ module_role_id, permission_slug, is_granted }) =>
      db
        .insert(modulePermissions)
        .values({
          clientModuleId: moduleId,
          moduleRoleId: module_role_id,
          permissionSlug: permission_slug,
          isGranted: is_granted,
        })
        .onConflictDoUpdate({
          target: [modulePermissions.moduleRoleId, modulePermissions.permissionSlug],
          set: { isGranted: is_granted },
        }),
    ),
  );

  const updated = await db
    .select()
    .from(modulePermissions)
    .where(eq(modulePermissions.clientModuleId, moduleId))
    .orderBy(modulePermissions.permissionSlug);

  await logAdminAction(user.sub, 'module.permissions.update', 'client_module', moduleId, { count: permissions.length });

  return c.json(toSnakeCase(updated));
});

export default router;
