import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  viewConfigs,
  viewConfigWidgets,
  viewPermissions,
  navPermissions,
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const viewConfigsRouter = new Hono();

viewConfigsRouter.use('*', authMiddleware);

// =============================================
// View Configs
// =============================================

// GET /view-configs?client_id=X — list view configs
viewConfigsRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(viewConfigs)
    .where(eq(viewConfigs.clientId, clientId))
    .orderBy(viewConfigs.createdAt);

  return c.json(toSnakeCase(result));
});

// GET /view-configs/:id — single view config
viewConfigsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [vc] = await db
    .select()
    .from(viewConfigs)
    .where(eq(viewConfigs.id, id));

  if (!vc) {
    return c.json({ error: 'Configuration de vue introuvable' }, 404);
  }

  return c.json(toSnakeCase(vc));
});

const createViewConfigSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  boDefinitionId: z.string().uuid().optional(),
  config: z.any().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  displayOrder: z.number().optional(),
  createdBy: z.string().uuid().optional(),
});

// POST /view-configs — create
viewConfigsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createViewConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [vc] = await db
    .insert(viewConfigs)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(vc), 201);
});

const updateViewConfigSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  description: z.string().optional(),
  boDefinitionId: z.string().uuid().nullable().optional(),
  config: z.any().optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
});

// PATCH /view-configs/:id — update
viewConfigsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateViewConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const values = {
    ...parsed.data,
    publishedAt: parsed.data.publishedAt !== undefined
      ? (parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null)
      : undefined,
    updatedAt: new Date(),
  };

  const [vc] = await db
    .update(viewConfigs)
    .set(values)
    .where(eq(viewConfigs.id, id))
    .returning();

  if (!vc) {
    return c.json({ error: 'Configuration de vue introuvable' }, 404);
  }

  return c.json(toSnakeCase(vc));
});

// DELETE /view-configs/:id — delete
viewConfigsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [vc] = await db
    .delete(viewConfigs)
    .where(eq(viewConfigs.id, id))
    .returning();

  if (!vc) {
    return c.json({ error: 'Configuration de vue introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Widgets
// =============================================

// GET /view-configs/:id/widgets — list widgets
viewConfigsRouter.get('/:id/widgets', async (c) => {
  const viewConfigId = c.req.param('id');

  const result = await db
    .select()
    .from(viewConfigWidgets)
    .where(eq(viewConfigWidgets.viewConfigId, viewConfigId))
    .orderBy(viewConfigWidgets.displayOrder);

  return c.json(toSnakeCase(result));
});

const createWidgetSchema = z.object({
  viewConfigId: z.string().uuid(),
  widgetType: z.string().min(1),
  title: z.string().optional(),
  config: z.any().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// POST /view-configs/widgets — create widget
viewConfigsRouter.post('/widgets', async (c) => {
  const body = await c.req.json();
  const parsed = createWidgetSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [widget] = await db
    .insert(viewConfigWidgets)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(widget), 201);
});

const updateWidgetSchema = z.object({
  widgetType: z.string().min(1).optional(),
  title: z.string().optional(),
  config: z.any().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /view-configs/widgets/:id — update widget
viewConfigsRouter.patch('/widgets/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateWidgetSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [widget] = await db
    .update(viewConfigWidgets)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(viewConfigWidgets.id, id))
    .returning();

  if (!widget) {
    return c.json({ error: 'Widget introuvable' }, 404);
  }

  return c.json(toSnakeCase(widget));
});

// DELETE /view-configs/widgets/:id — delete widget
viewConfigsRouter.delete('/widgets/:id', async (c) => {
  const id = c.req.param('id');

  const [widget] = await db
    .delete(viewConfigWidgets)
    .where(eq(viewConfigWidgets.id, id))
    .returning();

  if (!widget) {
    return c.json({ error: 'Widget introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// View Permissions
// =============================================

// GET /view-configs/:id/permissions — list view permissions
viewConfigsRouter.get('/:id/permissions', async (c) => {
  const viewConfigId = c.req.param('id');

  const result = await db
    .select()
    .from(viewPermissions)
    .where(eq(viewPermissions.viewConfigId, viewConfigId));

  return c.json(toSnakeCase(result));
});

const upsertViewPermissionSchema = z.object({
  viewConfigId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  canView: z.boolean().optional(),
  fieldOverrides: z.any().optional(),
});

// POST /view-configs/permissions — upsert permission
viewConfigsRouter.post('/permissions', async (c) => {
  const body = await c.req.json();
  const parsed = upsertViewPermissionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [perm] = await db
    .insert(viewPermissions)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(perm), 201);
});

// DELETE /view-configs/permissions/:id — delete permission
viewConfigsRouter.delete('/permissions/:id', async (c) => {
  const id = c.req.param('id');

  const [perm] = await db
    .delete(viewPermissions)
    .where(eq(viewPermissions.id, id))
    .returning();

  if (!perm) {
    return c.json({ error: 'Permission introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Nav Permissions
// =============================================

// GET /view-configs/nav-permissions?nav_config_id=X — list nav permissions
// Also supports nav_config_ids=X,Y,Z for bulk queries
// If no param is provided, returns ALL nav permissions
viewConfigsRouter.get('/nav-permissions', async (c) => {
  const navConfigId = c.req.query('nav_config_id');
  const navConfigIds = c.req.query('nav_config_ids');

  if (navConfigId) {
    const result = await db
      .select()
      .from(navPermissions)
      .where(eq(navPermissions.navigationConfigId, navConfigId));
    return c.json(toSnakeCase(result));
  }

  if (navConfigIds) {
    const ids = navConfigIds.split(',').filter(Boolean);
    if (ids.length === 0) return c.json([]);
    const result = await db
      .select()
      .from(navPermissions)
      .where(inArray(navPermissions.navigationConfigId, ids));
    return c.json(toSnakeCase(result));
  }

  // No filter — return all nav permissions
  const result = await db.select().from(navPermissions);
  return c.json(toSnakeCase(result));
});

const upsertNavPermissionSchema = z.object({
  navigationConfigId: z.string().uuid(),
  roleId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  isVisible: z.boolean().optional(),
});

// POST /view-configs/nav-permissions — upsert nav permission
viewConfigsRouter.post('/nav-permissions', async (c) => {
  const body = await c.req.json();
  const parsed = upsertNavPermissionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [perm] = await db
    .insert(navPermissions)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(perm), 201);
});

// DELETE /view-configs/nav-permissions/:id — delete nav permission
viewConfigsRouter.delete('/nav-permissions/:id', async (c) => {
  const id = c.req.param('id');

  const [perm] = await db
    .delete(navPermissions)
    .where(eq(navPermissions.id, id))
    .returning();

  if (!perm) {
    return c.json({ error: 'Permission de navigation introuvable' }, 404);
  }

  return c.json({ success: true });
});

// DELETE /view-configs/nav-permissions/by-role — delete nav permission by role_id + navigation_config_id
const deleteByRoleSchema = z.object({
  navigation_config_id: z.string().uuid(),
  role_id: z.string().uuid(),
});

viewConfigsRouter.post('/nav-permissions/delete-by-role', async (c) => {
  const body = await c.req.json();
  const parsed = deleteByRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const deleted = await db
    .delete(navPermissions)
    .where(
      and(
        eq(navPermissions.navigationConfigId, parsed.data.navigation_config_id),
        eq(navPermissions.roleId, parsed.data.role_id),
      )
    )
    .returning();

  return c.json({ success: true, deleted_count: deleted.length });
});

// POST /view-configs/nav-permissions/delete-by-nav-ids — bulk delete nav permissions by navigation_config_ids
const deleteByNavIdsSchema = z.object({
  navigation_config_ids: z.array(z.string().uuid()).min(1),
});

viewConfigsRouter.post('/nav-permissions/delete-by-nav-ids', async (c) => {
  const body = await c.req.json();
  const parsed = deleteByNavIdsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const deleted = await db
    .delete(navPermissions)
    .where(inArray(navPermissions.navigationConfigId, parsed.data.navigation_config_ids))
    .returning();

  return c.json({ success: true, deleted_count: deleted.length });
});

// POST /view-configs/duplicate/:id — duplicate a view config and its widgets
viewConfigsRouter.post('/duplicate/:id', async (c) => {
  const viewConfigId = c.req.param('id');

  // Fetch original view config
  const [originalView] = await db
    .select()
    .from(viewConfigs)
    .where(eq(viewConfigs.id, viewConfigId));

  if (!originalView) {
    return c.json({ error: 'Vue introuvable' }, 404);
  }

  const newSlug = `${originalView.slug}-copie-${Date.now().toString(36)}`;

  // Create the duplicate
  const [newView] = await db
    .insert(viewConfigs)
    .values({
      clientId: originalView.clientId,
      name: `${originalView.name} (copie)`,
      slug: newSlug,
      description: originalView.description,
      type: originalView.type,
      boDefinitionId: originalView.boDefinitionId,
      config: originalView.config,
      isDefault: false,
      isActive: true,
      isPublished: false,
      displayOrder: originalView.displayOrder,
    })
    .returning();

  // Duplicate widgets
  const widgets = await db
    .select()
    .from(viewConfigWidgets)
    .where(eq(viewConfigWidgets.viewConfigId, viewConfigId));

  if (widgets.length > 0) {
    const widgetInserts = widgets.map(w => ({
      viewConfigId: newView.id,
      widgetType: w.widgetType,
      title: w.title,
      positionX: w.positionX,
      positionY: w.positionY,
      width: w.width,
      height: w.height,
      config: w.config,
      displayOrder: w.displayOrder,
      isActive: w.isActive,
    }));
    await db.insert(viewConfigWidgets).values(widgetInserts);
  }

  return c.json(toSnakeCase(newView), 201);
});

export default viewConfigsRouter;
