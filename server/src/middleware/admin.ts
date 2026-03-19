import { createMiddleware } from 'hono/factory';
import { db } from '../db/index.js';
import { userSystemRoles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

export const adminMiddleware = createMiddleware<Env>(async (c, next) => {
  const user = c.get('user');

  const roles = await db
    .select()
    .from(userSystemRoles)
    .where(
      and(
        eq(userSystemRoles.userId, user.sub),
        eq(userSystemRoles.persona, 'admin_delta')
      )
    );

  if (roles.length === 0) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
});
