import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { lists, listValues } from '../db/schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { requireAdminOrIntegrator } from '../middleware/persona.js';
import { toSnakeCase } from '../lib/case-transform.js';

// Mounted at /clients/:clientId/lists
const listsRouter = new Hono();

listsRouter.use('*', authMiddleware);

// =============================================
// Lists
// =============================================

// GET / — list all non-archived lists for client
listsRouter.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const result = await db
    .select()
    .from(lists)
    .where(and(eq(lists.clientId, clientId), eq(lists.isArchived, false)))
    .orderBy(lists.name);

  return c.json(toSnakeCase(result));
});

// GET /:id — detail with values
listsRouter.get('/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)));

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  const values = await db
    .select()
    .from(listValues)
    .where(eq(listValues.listId, id))
    .orderBy(asc(listValues.displayOrder));

  return c.json(toSnakeCase({ ...list, values }));
});

const createListSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// POST / — create list (admin/integrator only)
listsRouter.post('/', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.json();
  const parsed = createListSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description } = parsed.data;

  const [list] = await db
    .insert(lists)
    .values({
      clientId,
      name,
      ...(description !== undefined && { description }),
    })
    .returning();

  return c.json(toSnakeCase(list), 201);
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// PATCH /:id — update list (admin/integrator only)
listsRouter.patch('/:id', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateListSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description } = parsed.data;

  const [list] = await db
    .update(lists)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      updatedAt: new Date(),
    })
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)))
    .returning();

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  return c.json(toSnakeCase(list));
});

// PATCH /:id/archive — archive list (admin/integrator only)
listsRouter.patch('/:id/archive', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [list] = await db
    .update(lists)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)))
    .returning();

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  return c.json(toSnakeCase(list));
});

// =============================================
// List Values
// =============================================

// GET /:id/values — list values ordered by display_order
listsRouter.get('/:id/values', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)));

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  const result = await db
    .select()
    .from(listValues)
    .where(eq(listValues.listId, id))
    .orderBy(asc(listValues.displayOrder));

  return c.json(toSnakeCase(result));
});

const createValueSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  display_order: z.number().int().optional(),
  parent_id: z.string().uuid().optional(),
  level: z.number().int().optional(),
});

// POST /:id/values — add value (admin/integrator only)
listsRouter.post('/:id/values', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)));

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  const body = await c.req.json();
  const parsed = createValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { label, description, color, display_order, parent_id, level } = parsed.data;

  const [value] = await db
    .insert(listValues)
    .values({
      listId: id,
      label,
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(parent_id !== undefined && { parentId: parent_id }),
      ...(level !== undefined && { level }),
    })
    .returning();

  return c.json(toSnakeCase(value), 201);
});

const reorderValuesSchema = z.object({
  value_ids: z.array(z.string().uuid()).min(1),
});

// PATCH /:id/values/reorder — reorder values (admin/integrator only)
// Registered before /:id/values/:valueId to avoid the static segment being
// captured as a dynamic :valueId param.
listsRouter.patch('/:id/values/reorder', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)));

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  const body = await c.req.json();
  const parsed = reorderValuesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { value_ids } = parsed.data;

  await Promise.all(
    value_ids.map((valueId, index) =>
      db
        .update(listValues)
        .set({ displayOrder: index, updatedAt: new Date() })
        .where(and(eq(listValues.id, valueId), eq(listValues.listId, id)))
    )
  );

  const result = await db
    .select()
    .from(listValues)
    .where(eq(listValues.listId, id))
    .orderBy(asc(listValues.displayOrder));

  return c.json(toSnakeCase(result));
});

const updateValueSchema = z.object({
  label: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  display_order: z.number().int().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  level: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /:id/values/:valueId — update value (admin/integrator only)
listsRouter.patch('/:id/values/:valueId', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const valueId = c.req.param('valueId');

  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)));

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  const body = await c.req.json();
  const parsed = updateValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { label, description, color, display_order, parent_id, level, is_active } = parsed.data;

  const [value] = await db
    .update(listValues)
    .set({
      ...(label !== undefined && { label }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(parent_id !== undefined && { parentId: parent_id }),
      ...(level !== undefined && { level }),
      ...(is_active !== undefined && { isActive: is_active }),
      updatedAt: new Date(),
    })
    .where(and(eq(listValues.id, valueId), eq(listValues.listId, id)))
    .returning();

  if (!value) {
    return c.json({ error: 'Valeur introuvable' }, 404);
  }

  return c.json(toSnakeCase(value));
});

// PATCH /:id/values/:valueId/deactivate — deactivate value (admin/integrator only)
listsRouter.patch('/:id/values/:valueId/deactivate', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const valueId = c.req.param('valueId');

  const [list] = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.clientId, clientId)));

  if (!list) {
    return c.json({ error: 'Liste introuvable' }, 404);
  }

  const [value] = await db
    .update(listValues)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(listValues.id, valueId), eq(listValues.listId, id)))
    .returning();

  if (!value) {
    return c.json({ error: 'Valeur introuvable' }, 404);
  }

  return c.json(toSnakeCase(value));
});

export default listsRouter;
