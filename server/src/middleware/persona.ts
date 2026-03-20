import { createMiddleware } from 'hono/factory';
import type { JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

export function requirePersona(...allowed: string[]) {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get('user');
    if (!allowed.includes(user.persona)) {
      return c.json({ error: 'Accès refusé pour ce type de compte' }, 403);
    }
    await next();
  });
}

export function requireAdminOrIntegrator() {
  return requirePersona('admin_delta', 'integrator_delta', 'integrator_external');
}

export function requireAdmin() {
  return requirePersona('admin_delta');
}
