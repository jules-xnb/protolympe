import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { lists, listValues } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const listsRouter = new Hono();

listsRouter.use('*', authMiddleware);

// =============================================
// Referential Values (static paths — must be before /:id)
// =============================================

const createValueSchema = z.object({
  referential_id: z.string().uuid(),
  label: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  parent_value_id: z.string().uuid().nullable().optional(),
  level: z.number().int().optional(),
});

// POST /values — create value
listsRouter.post('/values', async (c) => {
  const body = await c.req.json();
  const parsed = createValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { referential_id, display_order, is_active, parent_value_id, ...rest } = parsed.data;
  const [value] = await db
    .insert(listValues)
    .values({
      listId: referential_id,
      displayOrder: display_order,
      isActive: is_active,
      parentId: parent_value_id,
      ...rest,
    })
    .returning();

  return c.json(toSnakeCase(value), 201);
});

const updateValueSchema = z.object({
  label: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  parent_value_id: z.string().uuid().nullable().optional(),
  level: z.number().int().optional(),
});

// PATCH /values/:id — update value
listsRouter.patch('/values/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { display_order, is_active, parent_value_id, ...rest } = parsed.data;
  const [value] = await db
    .update(listValues)
    .set({
      ...rest,
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(is_active !== undefined && { isActive: is_active }),
      ...(parent_value_id !== undefined && { parentId: parent_value_id }),
      updatedAt: new Date(),
    })
    .where(eq(listValues.id, id))
    .returning();

  if (!value) {
    return c.json({ error: 'Valeur introuvable' }, 404);
  }

  return c.json(toSnakeCase(value));
});

// DELETE /values/:id — soft delete value (is_active=false)
listsRouter.delete('/values/:id', async (c) => {
  const id = c.req.param('id');

  const [value] = await db
    .update(listValues)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(listValues.id, id))
    .returning();

  if (!value) {
    return c.json({ error: 'Valeur introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Referentials (CRUD — parameterized routes after static ones)
// =============================================

// GET /?client_id=X — list lists for a client
listsRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(lists)
    .where(eq(lists.clientId, clientId))
    .orderBy(lists.name);

  return c.json(toSnakeCase(result));
});

// GET /:id — single referential with values
listsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [referential] = await db
    .select()
    .from(lists)
    .where(eq(lists.id, id));

  if (!referential) {
    return c.json({ error: 'Référentiel introuvable' }, 404);
  }

  const values = await db
    .select()
    .from(listValues)
    .where(eq(listValues.listId, id))
    .orderBy(listValues.displayOrder);

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
listsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createReferentialSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [referential] = await db
    .insert(lists)
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
listsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateReferentialSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [referential] = await db
    .update(lists)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(lists.id, id))
    .returning();

  if (!referential) {
    return c.json({ error: 'Référentiel introuvable' }, 404);
  }

  return c.json(toSnakeCase(referential));
});

// DELETE /:id — soft delete (is_archived=true)
listsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [referential] = await db
    .update(lists)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(lists.id, id))
    .returning();

  if (!referential) {
    return c.json({ error: 'Référentiel introuvable' }, 404);
  }

  return c.json({ success: true });
});

// GET /:id/values — list referential values
listsRouter.get('/:id/values', async (c) => {
  const listId = c.req.param('id');

  const result = await db
    .select()
    .from(listValues)
    .where(eq(listValues.listId, listId))
    .orderBy(listValues.displayOrder);

  return c.json(toSnakeCase(result));
});

export default listsRouter;
