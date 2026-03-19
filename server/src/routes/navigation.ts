import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { navigationConfigs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';
import type { JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

const navigationRouter = new Hono<Env>();

navigationRouter.use('*', authMiddleware);

// GET /navigation?client_id=X — list all nav configs for a client
// Optional: include_view_configs=true to join view_configs data
navigationRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(navigationConfigs)
    .where(eq(navigationConfigs.clientId, clientId))
    .orderBy(navigationConfigs.displayOrder);

  return c.json(toSnakeCase(result));
});

// POST /navigation — create a nav config
const createSchema = z.object({
  client_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  label: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().nullable().optional(),
  type: z.enum(['group', 'page', 'module']),
  client_module_id: z.string().uuid().nullable().optional(),
  url: z.string().nullable().optional(),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

navigationRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const user = c.get('user');

  const [navConfig] = await db
    .insert(navigationConfigs)
    .values({
      clientId: data.client_id,
      parentId: data.parent_id ?? null,
      label: data.label,
      slug: data.slug,
      icon: data.icon ?? null,
      type: data.type,
      clientModuleId: data.client_module_id ?? null,
      url: data.url ?? null,
      displayOrder: data.display_order,
      isActive: data.is_active,
      createdBy: user.sub,
    })
    .returning();

  return c.json(toSnakeCase(navConfig), 201);
});

// PATCH /navigation/reorder — batch reorder (must be before /:id)
const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      display_order: z.number().int(),
      parent_id: z.string().uuid().nullable().optional(),
    })
  ),
});

navigationRouter.patch('/reorder', async (c) => {
  const body = await c.req.json();
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { items } = parsed.data;

  for (const item of items) {
    await db
      .update(navigationConfigs)
      .set({
        displayOrder: item.display_order,
        ...(item.parent_id !== undefined && { parentId: item.parent_id }),
        updatedAt: new Date(),
      })
      .where(eq(navigationConfigs.id, item.id));
  }

  return c.json({ success: true });
});

// PATCH /navigation/:id — update a nav config
const updateSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  label: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  type: z.enum(['group', 'page', 'module']).optional(),
  client_module_id: z.string().uuid().nullable().optional(),
  url: z.string().nullable().optional(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

navigationRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;

  const [navConfig] = await db
    .update(navigationConfigs)
    .set({
      ...(data.parent_id !== undefined && { parentId: data.parent_id }),
      ...(data.label !== undefined && { label: data.label }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.client_module_id !== undefined && { clientModuleId: data.client_module_id }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.display_order !== undefined && { displayOrder: data.display_order }),
      ...(data.is_active !== undefined && { isActive: data.is_active }),
      updatedAt: new Date(),
    })
    .where(eq(navigationConfigs.id, id))
    .returning();

  if (!navConfig) {
    return c.json({ error: 'Configuration de navigation introuvable' }, 404);
  }

  return c.json(toSnakeCase(navConfig));
});

// DELETE /navigation/:id — delete a nav config and its children recursively
navigationRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Recursively collect all descendant IDs
  async function getDescendantIds(parentId: string): Promise<string[]> {
    const children = await db
      .select({ id: navigationConfigs.id })
      .from(navigationConfigs)
      .where(eq(navigationConfigs.parentId, parentId));

    const childIds = children.map((child) => child.id);
    const deeperIds: string[] = [];

    for (const childId of childIds) {
      const descendants = await getDescendantIds(childId);
      deeperIds.push(...descendants);
    }

    return [...childIds, ...deeperIds];
  }

  const descendantIds = await getDescendantIds(id);

  // Delete descendants first (deepest first doesn't matter since no FK on parentId)
  for (const descendantId of descendantIds) {
    await db
      .delete(navigationConfigs)
      .where(eq(navigationConfigs.id, descendantId));
  }

  // Delete the parent
  const [navConfig] = await db
    .delete(navigationConfigs)
    .where(eq(navigationConfigs.id, id))
    .returning();

  if (!navConfig) {
    return c.json({ error: 'Configuration de navigation introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default navigationRouter;
