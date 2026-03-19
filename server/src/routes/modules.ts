import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { clientModules } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { MODULE_CATALOG } from '../lib/module-catalog.js';

const modulesRouter = new Hono();

modulesRouter.use('*', authMiddleware);

// GET /modules/catalog — return the full module catalog
modulesRouter.get('/catalog', (c) => {
  return c.json(MODULE_CATALOG);
});

// GET /modules?client_id=X — list all client_modules for a given client
modulesRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(clientModules)
    .where(eq(clientModules.clientId, clientId))
    .orderBy(clientModules.createdAt);

  return c.json(toSnakeCase(result));
});

// GET /modules/:id — get a single client_module by id, merged with catalog info
modulesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [mod] = await db
    .select()
    .from(clientModules)
    .where(eq(clientModules.id, id));

  if (!mod) {
    return c.json({ error: 'Module introuvable' }, 404);
  }

  const catalogEntry = MODULE_CATALOG[mod.moduleSlug] || null;

  return c.json({
    ...toSnakeCase(mod),
    catalog: catalogEntry,
  });
});

const createSchema = z.object({
  clientId: z.string().uuid(),
  moduleSlug: z.string().min(1),
});

// POST /modules — activate a module for a client
modulesRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { clientId, moduleSlug } = parsed.data;

  if (!MODULE_CATALOG[moduleSlug]) {
    return c.json({ error: `Module "${moduleSlug}" introuvable dans le catalogue` }, 400);
  }

  const [mod] = await db
    .insert(clientModules)
    .values({
      clientId,
      moduleSlug,
    })
    .returning();

  return c.json(toSnakeCase(mod), 201);
});

const updateSchema = z.object({
  config: z.any().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /modules/:id — update config or is_active
modulesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { config, is_active } = parsed.data;

  const [mod] = await db
    .update(clientModules)
    .set({
      ...(config !== undefined && { config }),
      ...(is_active !== undefined && { isActive: is_active }),
      updatedAt: new Date(),
    })
    .where(eq(clientModules.id, id))
    .returning();

  if (!mod) {
    return c.json({ error: 'Module introuvable' }, 404);
  }

  return c.json(toSnakeCase(mod));
});

// DELETE /modules/:id — remove a client_module
modulesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [mod] = await db
    .delete(clientModules)
    .where(eq(clientModules.id, id))
    .returning();

  if (!mod) {
    return c.json({ error: 'Module introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default modulesRouter;
