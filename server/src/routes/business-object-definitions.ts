import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { businessObjectDefinitions } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const boDefsRouter = new Hono();

boDefsRouter.use('*', authMiddleware);

// GET /business-object-definitions?client_id=xxx
boDefsRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'client_id requis' }, 400);
  }

  const defs = await db
    .select()
    .from(businessObjectDefinitions)
    .where(
      and(
        eq(businessObjectDefinitions.clientId, clientId),
        eq(businessObjectDefinitions.isActive, true),
      )
    )
    .orderBy(businessObjectDefinitions.name);

  return c.json(toSnakeCase(defs));
});

// GET /business-object-definitions/list — lightweight list (id + name), no client filter
boDefsRouter.get('/list', async (c) => {
  const defs = await db
    .select({
      id: businessObjectDefinitions.id,
      name: businessObjectDefinitions.name,
    })
    .from(businessObjectDefinitions)
    .orderBy(businessObjectDefinitions.name);

  return c.json(toSnakeCase(defs));
});

// GET /business-object-definitions/archived?client_id=xxx
boDefsRouter.get('/archived', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'client_id requis' }, 400);
  }

  const defs = await db
    .select()
    .from(businessObjectDefinitions)
    .where(
      and(
        eq(businessObjectDefinitions.clientId, clientId),
        eq(businessObjectDefinitions.isActive, false),
      )
    )
    .orderBy(businessObjectDefinitions.name);

  return c.json(toSnakeCase(defs));
});

// GET /business-object-definitions/:id
boDefsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [def] = await db
    .select()
    .from(businessObjectDefinitions)
    .where(eq(businessObjectDefinitions.id, id));

  if (!def) {
    return c.json({ error: 'Objet métier introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  client_id: z.string().uuid(),
});

// POST /business-object-definitions
boDefsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { client_id, ...rest } = parsed.data;

  const [def] = await db
    .insert(businessObjectDefinitions)
    .values({
      ...rest,
      clientId: client_id,
    })
    .returning();

  return c.json(toSnakeCase(def), 201);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /business-object-definitions/:id
boDefsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { is_active, ...rest } = parsed.data;

  const [def] = await db
    .update(businessObjectDefinitions)
    .set({
      ...rest,
      ...(is_active !== undefined && { isActive: is_active }),
      updatedAt: new Date(),
    })
    .where(eq(businessObjectDefinitions.id, id))
    .returning();

  if (!def) {
    return c.json({ error: 'Objet métier introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

// DELETE /business-object-definitions/:id
boDefsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [def] = await db
    .delete(businessObjectDefinitions)
    .where(eq(businessObjectDefinitions.id, id))
    .returning();

  if (!def) {
    return c.json({ error: 'Objet métier introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default boDefsRouter;
