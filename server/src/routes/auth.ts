import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { signToken } from '../lib/jwt.js';

const auth = new Hono();

function userResponse(user: typeof profiles.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
  };
}

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

auth.post('/signin', async (c) => {
  const body = await c.req.json();
  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Email et mot de passe requis' }, 400);
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, email.toLowerCase()));

  if (!user) {
    return c.json({ error: 'Email ou mot de passe incorrect' }, 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Email ou mot de passe incorrect' }, 401);
  }

  const token = await signToken({ sub: user.id, email: user.email });

  return c.json({ token, user: userResponse(user) });
});

auth.post('/signup', async (c) => {
  const body = await c.req.json();
  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { email, password, firstName, lastName } = parsed.data;

  const existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email.toLowerCase()));

  if (existing.length > 0) {
    return c.json({ error: 'Un compte existe déjà avec cet email' }, 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(profiles)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      persona: 'admin_delta',
    })
    .returning();

  const token = await signToken({ sub: user.id, email: user.email });

  return c.json({ token, user: userResponse(user) });
});

const updatePasswordSchema = z.object({
  password: z.string().min(6),
});

auth.post('/update-password', async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Non authentifié' }, 401);
  }

  try {
    const { verifyToken } = await import('../lib/jwt.js');
    const payload = await verifyToken(header.slice(7));

    const body = await c.req.json();
    const parsed = updatePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, 400);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const [user] = await db
      .update(profiles)
      .set({ passwordHash })
      .where(eq(profiles.id, payload.sub))
      .returning();

    if (!user) {
      return c.json({ error: 'Utilisateur introuvable' }, 404);
    }

    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Token invalide' }, 401);
  }
});

auth.get('/me', async (c) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Non authentifié' }, 401);
  }

  try {
    const { verifyToken } = await import('../lib/jwt.js');
    const payload = await verifyToken(header.slice(7));

    const [user] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, payload.sub));

    if (!user) {
      return c.json({ error: 'Utilisateur introuvable' }, 404);
    }

    return c.json({ user: userResponse(user) });
  } catch {
    return c.json({ error: 'Token invalide' }, 401);
  }
});

export default auth;
