import { createMiddleware } from 'hono/factory';
import { db } from '../db/index.js';
import { profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

export const adminMiddleware = createMiddleware<Env>(async (c, next) => {
  const user = c.get('user');

  const profile = await db
    .select({ persona: profiles.persona })
    .from(profiles)
    .where(eq(profiles.id, user.sub))
    .limit(1);

  if (profile.length === 0 || profile[0].persona !== 'admin_delta') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
});
