import { createMiddleware } from 'hono/factory';
import { verifyAccessToken, type JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'En-tête d\'autorisation manquant ou invalide' }, 401);
  }

  try {
    const token = header.slice(7);
    const payload = await verifyAccessToken(token);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Token invalide ou expiré' }, 401);
  }
});
