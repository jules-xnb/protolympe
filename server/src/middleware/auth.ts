import { createMiddleware } from 'hono/factory';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  try {
    const token = header.slice(7);
    const payload = await verifyToken(token);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});
