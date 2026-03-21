import { createMiddleware } from 'hono/factory';
import type { JwtPayload } from '../lib/jwt.js';
import { getUserPermissions, hasClientAccess, type CachedPermissions } from '../lib/cache.js';

type Env = {
  Variables: {
    user: JwtPayload;
    permissions: CachedPermissions;
  };
};

export function requireClientAccess(clientIdParam = 'clientId') {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get('user');
    const clientId = c.req.param(clientIdParam);

    if (!clientId) {
      return c.json({ error: 'Paramètre client_id manquant' }, 400);
    }

    const permissions = await getUserPermissions(user.sub, user.activeProfileId);
    c.set('permissions', permissions);

    if (!hasClientAccess(permissions, clientId, user.persona)) {
      return c.json({ error: 'Accès refusé à ce client' }, 403);
    }

    // For client_user: verify the active profile belongs to the requested client
    if (user.persona === 'client_user' && permissions.activeProfileClientId && permissions.activeProfileClientId !== clientId) {
      return c.json({ error: 'Le profil actif ne correspond pas à ce client' }, 403);
    }

    await next();
  });
}
