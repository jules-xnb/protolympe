import { createMiddleware } from 'hono/factory';
import type { JwtPayload } from '../lib/jwt.js';
import { getUserPermissions, hasModuleRole, hasModulePermission, type CachedPermissions } from '../lib/cache.js';

type Env = {
  Variables: {
    user: JwtPayload;
    permissions: CachedPermissions;
  };
};

export function requireModuleAccess(moduleIdParam = 'moduleId') {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get('user');
    const moduleId = c.req.param(moduleIdParam);

    if (!moduleId) {
      return c.json({ error: 'Paramètre module_id manquant' }, 400);
    }

    const permissions = c.get('permissions') ?? await getUserPermissions(user.sub, user.activeProfileId);
    c.set('permissions', permissions);

    // Admin and integrators always have module access
    if (user.persona === 'admin_delta' || user.persona === 'integrator_delta' || user.persona === 'integrator_external') {
      await next();
      return;
    }

    // Client users need a role in the module
    if (!hasModuleRole(permissions, moduleId)) {
      return c.json({ error: 'Accès refusé à ce module' }, 403);
    }

    await next();
  });
}

export function requireModulePermission(moduleIdParam: string, permission: string) {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get('user');
    const moduleId = c.req.param(moduleIdParam);

    if (!moduleId) {
      return c.json({ error: 'Paramètre module_id manquant' }, 400);
    }

    // Admin and integrators bypass permission checks
    if (user.persona === 'admin_delta' || user.persona === 'integrator_delta' || user.persona === 'integrator_external') {
      await next();
      return;
    }

    const permissions = c.get('permissions') ?? await getUserPermissions(user.sub, user.activeProfileId);

    if (!hasModulePermission(permissions, moduleId, permission)) {
      return c.json({ error: `Permission requise : ${permission}` }, 403);
    }

    await next();
  });
}
