import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { referentials, referentialValues } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const referentialsRouter = new Hono();

referentialsRouter.use('*', authMiddleware);

// =============================================
// Referential Values (static paths — must be before /:id)
// =============================================

const createValueSchema = z.object({
  referentialId: z.string().uuid(),
  label: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  level: z.number().int().optional(),
});

// POST /values — create value
referentialsRouter.post('/values', async (c) => {
  const body = await c.req.json();
  const parsed = createValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [value] = await db
    .insert(referentialValues)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(value), 201);
});

const updateValueSchema = z.object({
  label: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().nullable().optional(),
  level: z.number().int().optional(),
});

// PATCH /values/:id — update value
referentialsRouter.patch('/values/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [value] = await db
    .update(referentialValues)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(referentialValues.id, id))
    .returning();

  if (!value) {
    return c.json({ error: 'Valeur introuvable' }, 404);
  }

  return c.json(toSnakeCase(value));
});

// DELETE /values/:id — soft delete value (is_active=false)
referentialsRouter.delete('/values/:id', async (c) => {
  const id = c.req.param('id');

  const [value] = await db
    .update(referentialValues)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(referentialValues.id, id))
    .returning();

  if (!value) {
    return c.json({ error: 'Valeur introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Referentials (CRUD — parameterized routes after static ones)
// =============================================

// GET /?client_id=X — list referentials for a client
referentialsRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(referentials)
    .where(eq(referentials.clientId, clientId))
    .orderBy(referentials.name);

  return c.json(toSnakeCase(result));
});

// GET /:id — single referential with values
referentialsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [referential] = await db
    .select()
    .from(referentials)
    .where(eq(referentials.id, id));

  if (!referential) {
    return c.json({ error: 'Référentiel introuvable' }, 404);
  }

  const values = await db
    .select()
    .from(referentialValues)
    .where(eq(referentialValues.referentialId, id))
    .orderBy(referentialValues.displayOrder);

  return c.json({
    ...toSnakeCase(referential),
    values: toSnakeCase(values),
  });
});

const createReferentialSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  tag: z.string().optional(),
  isActive: z.boolean().optional(),
});

// POST / — create referential
referentialsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createReferentialSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [referential] = await db
    .insert(referentials)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(referential), 201);
});

const updateReferentialSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  tag: z.string().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /:id — update referential
referentialsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateReferentialSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [referential] = await db
    .update(referentials)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(referentials.id, id))
    .returning();

  if (!referential) {
    return c.json({ error: 'Référentiel introuvable' }, 404);
  }

  return c.json(toSnakeCase(referential));
});

// DELETE /:id — soft delete (is_archived=true)
referentialsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [referential] = await db
    .update(referentials)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(referentials.id, id))
    .returning();

  if (!referential) {
    return c.json({ error: 'Référentiel introuvable' }, 404);
  }

  return c.json({ success: true });
});

// GET /:id/values — list referential values
referentialsRouter.get('/:id/values', async (c) => {
  const referentialId = c.req.param('id');

  const result = await db
    .select()
    .from(referentialValues)
    .where(eq(referentialValues.referentialId, referentialId))
    .orderBy(referentialValues.displayOrder);

  return c.json(toSnakeCase(result));
});

export default referentialsRouter;
