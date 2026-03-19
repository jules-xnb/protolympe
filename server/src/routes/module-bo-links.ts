import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { moduleBoLinks } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const moduleBoLinksRouter = new Hono();

moduleBoLinksRouter.use('*', authMiddleware);

// GET /module-bo-links?module_id=X — list BO links for a module
moduleBoLinksRouter.get('/', async (c) => {
  const moduleId = c.req.query('module_id');

  if (!moduleId) {
    return c.json({ error: 'Le paramètre module_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(moduleBoLinks)
    .where(eq(moduleBoLinks.clientModuleId, moduleId))
    .orderBy(moduleBoLinks.displayOrder);

  return c.json(toSnakeCase(result));
});

const createSchema = z.object({
  module_id: z.string().uuid(),
  bo_definition_id: z.string().uuid(),
  config: z.any().optional(),
  display_order: z.number().int().optional(),
});

// POST /module-bo-links — create a BO link
moduleBoLinksRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_id, bo_definition_id, config, display_order } = parsed.data;

  const [link] = await db
    .insert(moduleBoLinks)
    .values({
      clientModuleId: module_id,
      boDefinitionId: bo_definition_id,
      ...(config !== undefined && { config }),
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .returning();

  return c.json(toSnakeCase(link), 201);
});

const updateSchema = z.object({
  config: z.any().optional(),
  display_order: z.number().int().optional(),
});

// PATCH /module-bo-links/:id — update a BO link
moduleBoLinksRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { config, display_order } = parsed.data;

  const [link] = await db
    .update(moduleBoLinks)
    .set({
      ...(config !== undefined && { config }),
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .where(eq(moduleBoLinks.id, id))
    .returning();

  if (!link) {
    return c.json({ error: 'Lien BO introuvable' }, 404);
  }

  return c.json(toSnakeCase(link));
});

// DELETE /module-bo-links/:id — delete a BO link
moduleBoLinksRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [link] = await db
    .delete(moduleBoLinks)
    .where(eq(moduleBoLinks.id, id))
    .returning();

  if (!link) {
    return c.json({ error: 'Lien BO introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default moduleBoLinksRouter;
