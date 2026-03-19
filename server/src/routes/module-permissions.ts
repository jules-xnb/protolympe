import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { clientModules, moduleRoles, modulePermissions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { MODULE_CATALOG } from '../lib/module-catalog.js';

const modulePermissionsRouter = new Hono();

modulePermissionsRouter.use('*', authMiddleware);

// GET /module-permissions?module_id=X — returns the full permissions matrix
modulePermissionsRouter.get('/', async (c) => {
  const moduleId = c.req.query('module_id');

  if (!moduleId) {
    return c.json({ error: 'Le paramètre module_id est requis' }, 400);
  }

  // 1. Fetch the client_module to get moduleSlug
  const [clientModule] = await db
    .select()
    .from(clientModules)
    .where(eq(clientModules.id, moduleId));

  if (!clientModule) {
    return c.json({ error: 'Module introuvable' }, 404);
  }

  // 2. Look up catalog permissions
  const catalogEntry = MODULE_CATALOG[clientModule.moduleSlug];
  const permissions = catalogEntry?.permissions || [];

  // 3. Fetch all roles for this module
  const roles = await db
    .select()
    .from(moduleRoles)
    .where(eq(moduleRoles.clientModuleId, moduleId))
    .orderBy(moduleRoles.createdAt);

  // 4. Fetch all existing permission grants for this module
  const existingGrants = await db
    .select()
    .from(modulePermissions)
    .where(eq(modulePermissions.clientModuleId, moduleId));

  // 5. Build the grants matrix
  const grants: Record<string, Record<string, boolean>> = {};

  for (const perm of permissions) {
    grants[perm.slug] = {};
    for (const role of roles) {
      const grant = existingGrants.find(
        (g) => g.permissionSlug === perm.slug && g.moduleRoleId === role.id
      );
      grants[perm.slug][role.id] = grant ? grant.isGranted : false;
    }
  }

  return c.json({
    permissions,
    roles: toSnakeCase(roles),
    grants,
  });
});

const bulkUpdateSchema = z.object({
  module_id: z.string().uuid(),
  grants: z.record(z.string(), z.record(z.string(), z.boolean())),
});

// PUT /module-permissions — bulk update grants
modulePermissionsRouter.put('/', async (c) => {
  const body = await c.req.json();
  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_id, grants } = parsed.data;

  // Verify module exists
  const [clientModule] = await db
    .select()
    .from(clientModules)
    .where(eq(clientModules.id, module_id));

  if (!clientModule) {
    return c.json({ error: 'Module introuvable' }, 404);
  }

  // Delete all existing permissions for this module, then reinsert
  await db
    .delete(modulePermissions)
    .where(eq(modulePermissions.clientModuleId, module_id));

  const rows: {
    clientModuleId: string;
    permissionSlug: string;
    moduleRoleId: string;
    isGranted: boolean;
  }[] = [];

  for (const [permissionSlug, roleGrants] of Object.entries(grants)) {
    for (const [roleId, isGranted] of Object.entries(roleGrants)) {
      rows.push({
        clientModuleId: module_id,
        permissionSlug,
        moduleRoleId: roleId,
        isGranted,
      });
    }
  }

  if (rows.length > 0) {
    await db.insert(modulePermissions).values(rows);
  }

  return c.json({ success: true });
});

export default modulePermissionsRouter;
