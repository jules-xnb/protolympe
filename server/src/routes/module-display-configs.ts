import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { moduleDisplayConfigs, moduleDisplayConfigRoles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const moduleDisplayConfigsRouter = new Hono();

moduleDisplayConfigsRouter.use('*', authMiddleware);

// Helper: fetch role_ids for a display config
async function getRoleIds(displayConfigId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(moduleDisplayConfigRoles)
    .where(eq(moduleDisplayConfigRoles.displayConfigId, displayConfigId));

  return rows.map((r) => r.moduleRoleId);
}

// GET /module-display-configs?module_id=X — list all display configs for a module
moduleDisplayConfigsRouter.get('/', async (c) => {
  const moduleId = c.req.query('module_id');

  if (!moduleId) {
    return c.json({ error: 'Le paramètre module_id est requis' }, 400);
  }

  const configs = await db
    .select()
    .from(moduleDisplayConfigs)
    .where(eq(moduleDisplayConfigs.clientModuleId, moduleId))
    .orderBy(moduleDisplayConfigs.createdAt);

  const result = await Promise.all(
    configs.map(async (cfg) => ({
      ...toSnakeCase(cfg),
      role_ids: await getRoleIds(cfg.id),
    }))
  );

  return c.json(result);
});

// GET /module-display-configs/:id — get single display config with role_ids
moduleDisplayConfigsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [cfg] = await db
    .select()
    .from(moduleDisplayConfigs)
    .where(eq(moduleDisplayConfigs.id, id));

  if (!cfg) {
    return c.json({ error: 'Configuration d\'affichage introuvable' }, 404);
  }

  return c.json({
    ...toSnakeCase(cfg),
    role_ids: await getRoleIds(cfg.id),
  });
});

const createSchema = z.object({
  module_id: z.string().uuid(),
  name: z.string().min(1),
  config: z.any().default({}),
  role_ids: z.array(z.string().uuid()).default([]),
});

// POST /module-display-configs — create a display config
moduleDisplayConfigsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_id, name, config, role_ids } = parsed.data;

  const [cfg] = await db
    .insert(moduleDisplayConfigs)
    .values({
      clientModuleId: module_id,
      name,
      config,
    })
    .returning();

  if (role_ids.length > 0) {
    await db.insert(moduleDisplayConfigRoles).values(
      role_ids.map((roleId: string) => ({
        displayConfigId: cfg.id,
        moduleRoleId: roleId,
      }))
    );
  }

  return c.json(
    {
      ...toSnakeCase(cfg),
      role_ids,
    },
    201
  );
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.any().optional(),
  role_ids: z.array(z.string().uuid()).optional(),
});

// PATCH /module-display-configs/:id — update a display config
moduleDisplayConfigsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, config, role_ids } = parsed.data;

  const [cfg] = await db
    .update(moduleDisplayConfigs)
    .set({
      ...(name !== undefined && { name }),
      ...(config !== undefined && { config }),
      updatedAt: new Date(),
    })
    .where(eq(moduleDisplayConfigs.id, id))
    .returning();

  if (!cfg) {
    return c.json({ error: 'Configuration d\'affichage introuvable' }, 404);
  }

  if (role_ids !== undefined) {
    // Delete existing role associations and reinsert
    await db
      .delete(moduleDisplayConfigRoles)
      .where(eq(moduleDisplayConfigRoles.displayConfigId, id));

    if (role_ids.length > 0) {
      await db.insert(moduleDisplayConfigRoles).values(
        role_ids.map((roleId: string) => ({
          displayConfigId: id,
          moduleRoleId: roleId,
        }))
      );
    }
  }

  return c.json({
    ...toSnakeCase(cfg),
    role_ids: role_ids !== undefined ? role_ids : await getRoleIds(id),
  });
});

// DELETE /module-display-configs/:id — delete a display config
moduleDisplayConfigsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [cfg] = await db
    .delete(moduleDisplayConfigs)
    .where(eq(moduleDisplayConfigs.id, id))
    .returning();

  if (!cfg) {
    return c.json({ error: 'Configuration d\'affichage introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default moduleDisplayConfigsRouter;
