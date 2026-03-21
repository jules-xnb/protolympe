import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  moduleOrgDisplayConfigs,
  moduleOrgDisplayConfigRoles,
  moduleOrgDisplayConfigFields,
  moduleUsersDisplayConfigs,
  moduleUsersDisplayConfigRoles,
  moduleUsersDisplayConfigFields,
  moduleProfilsDisplayConfigs,
  moduleProfilsDisplayConfigRoles,
  moduleProfilsDisplayConfigFields,
  moduleCvFormDisplayConfigs,
  moduleCvFormDisplayConfigRoles,
  moduleCvFormDisplayConfigFields,
  moduleCvDisplayConfigs,
  moduleCvDisplayConfigRoles,
  moduleCvDisplayConfigFields,
  moduleCvForms,
  clientModules,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { getUserPermissions, hasClientAccess } from '../lib/cache.js';
import { toSnakeCase } from '../lib/case-transform.js';
import type { JwtPayload } from '../lib/jwt.js';

type Env = { Variables: { user: JwtPayload } };

const router = new Hono<Env>();

router.use('*', authMiddleware);
router.use('*', async (c, next) => {
  const moduleId = c.req.param('moduleId') as string | undefined;
  if (moduleId) {
    const err = await verifyModuleClientAccess(c, moduleId);
    if (err) return err;
  }
  await next();
});

// ─── Auth helper ─────────────────────────────────────────────────────────────

function isAdminOrIntegrator(persona: string): boolean {
  return (
    persona === 'admin_delta' ||
    persona === 'integrator_delta' ||
    persona === 'integrator_external'
  );
}

function isAdminIntegratorOrCvConfigurer(persona: string): boolean {
  // CV configs additionally allow users with can_configure_survey_type permission.
  // Permission check is done at route level; this helper covers persona-based bypass.
  return isAdminOrIntegrator(persona);
}


// ─── Client access guard for module-scoped routes ─────────────────────────────

async function verifyModuleClientAccess(
  c: import('hono').Context<Env>,
  moduleId: string
): Promise<globalThis.Response | null> {
  const user = c.get('user');
  if (user.persona === 'admin_delta') return null;

  const [mod] = await db.select({ clientId: clientModules.clientId }).from(clientModules).where(eq(clientModules.id, moduleId)).limit(1);
  if (!mod) return c.json({ error: 'Module introuvable' }, 404);

  const permissions = await getUserPermissions(user.sub, user.activeProfileId);
  if (!hasClientAccess(permissions, mod.clientId, user.persona)) {
    return c.json({ error: 'Accès refusé à ce module' }, 403);
  }
  return null;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

// --- Org ---

const createOrgDisplayConfigSchema = z.object({
  name: z.string().min(1),
  default_view_mode: z.string().optional(),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const updateOrgDisplayConfigSchema = z.object({
  name: z.string().min(1).optional(),
  default_view_mode: z.string().optional(),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const setOrgDisplayConfigRolesSchema = z.object({
  module_role_ids: z.array(z.string().uuid()),
});

const setOrgDisplayConfigFieldsSchema = z.object({
  fields: z.array(
    z.object({
      field_slug: z.string().optional(),
      eo_field_definition_id: z.string().uuid().optional(),
      can_edit: z.boolean(),
      show_in_table: z.boolean(),
      show_in_drawer: z.boolean(),
      show_in_export: z.boolean(),
      display_order: z.number().int(),
    }),
  ),
});

// --- Users ---

const createUsersDisplayConfigSchema = z.object({
  name: z.string().min(1),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const updateUsersDisplayConfigSchema = z.object({
  name: z.string().min(1).optional(),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const setUsersDisplayConfigRolesSchema = z.object({
  module_role_ids: z.array(z.string().uuid()),
});

const setUsersDisplayConfigFieldsSchema = z.object({
  fields: z.array(
    z.object({
      field_slug: z.string().optional(),
      user_field_definition_id: z.string().uuid().optional(),
      can_edit: z.boolean(),
      show_in_table: z.boolean(),
      show_in_drawer: z.boolean(),
      show_in_export: z.boolean(),
      is_anonymized: z.boolean(),
      display_order: z.number().int(),
    }),
  ),
});

// --- Profils ---

const createProfilsDisplayConfigSchema = z.object({
  name: z.string().min(1),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const updateProfilsDisplayConfigSchema = z.object({
  name: z.string().min(1).optional(),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const setProfilsDisplayConfigRolesSchema = z.object({
  module_role_ids: z.array(z.string().uuid()),
});

const setProfilsDisplayConfigFieldsSchema = z.object({
  fields: z.array(
    z.object({
      field_slug: z.string(),
      can_edit: z.boolean(),
      show_in_table: z.boolean(),
      show_in_drawer: z.boolean(),
      show_in_export: z.boolean(),
      display_order: z.number().int(),
    }),
  ),
});

// --- CV Form ---

const createCvFormDisplayConfigSchema = z.object({
  name: z.string().min(1),
});

const updateCvFormDisplayConfigSchema = z.object({
  name: z.string().min(1).optional(),
});

const setCvFormDisplayConfigRolesSchema = z.object({
  module_role_ids: z.array(z.string().uuid()),
});

const setCvFormDisplayConfigFieldsSchema = z.object({
  fields: z.array(
    z.object({
      form_field_id: z.string().uuid(),
      can_view: z.boolean(),
      can_edit: z.boolean(),
      display_order: z.number().int(),
    }),
  ),
});

// --- CV Listing ---

const createCvDisplayConfigSchema = z.object({
  name: z.string().min(1),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const updateCvDisplayConfigSchema = z.object({
  name: z.string().min(1).optional(),
  filters: z.unknown().optional(),
  pre_filters: z.unknown().optional(),
});

const setCvDisplayConfigRolesSchema = z.object({
  module_role_ids: z.array(z.string().uuid()),
});

const setCvDisplayConfigFieldsSchema = z.object({
  fields: z.array(
    z.object({
      field_slug: z.string().optional(),
      cv_field_definition_id: z.string().uuid().optional(),
      show_in_table: z.boolean(),
      show_in_export: z.boolean(),
      display_order: z.number().int(),
    }),
  ),
});

// ─── ORG Display Configs — /modules/:moduleId/org/display-configs ────────────

// GET /modules/:moduleId/org/display-configs
router.get('/modules/:moduleId/org/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();

  const configs = await db
    .select()
    .from(moduleOrgDisplayConfigs)
    .where(eq(moduleOrgDisplayConfigs.clientModuleId, moduleId))
    .orderBy(moduleOrgDisplayConfigs.createdAt);

  return c.json(toSnakeCase(configs));
});

// POST /modules/:moduleId/org/display-configs
router.post('/modules/:moduleId/org/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const body = await c.req.json();
  const parsed = createOrgDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, default_view_mode, filters, pre_filters } = parsed.data;

  const [created] = await db
    .insert(moduleOrgDisplayConfigs)
    .values({
      clientModuleId: moduleId,
      name,
      ...(default_view_mode !== undefined && { defaultViewMode: default_view_mode }),
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
    })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

// PATCH /modules/:moduleId/org/display-configs/:id
router.patch('/modules/:moduleId/org/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateOrgDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, default_view_mode, filters, pre_filters } = parsed.data;

  const [updated] = await db
    .update(moduleOrgDisplayConfigs)
    .set({
      ...(name !== undefined && { name }),
      ...(default_view_mode !== undefined && { defaultViewMode: default_view_mode }),
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(moduleOrgDisplayConfigs.id, id),
        eq(moduleOrgDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json(toSnakeCase(updated));
});

// DELETE /modules/:moduleId/org/display-configs/:id
router.delete('/modules/:moduleId/org/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();

  const [deleted] = await db
    .delete(moduleOrgDisplayConfigs)
    .where(
      and(
        eq(moduleOrgDisplayConfigs.id, id),
        eq(moduleOrgDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json({ success: true });
});

// PUT /modules/:moduleId/org/display-configs/:id/roles
router.put('/modules/:moduleId/org/display-configs/:id/roles', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setOrgDisplayConfigRolesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_role_ids } = parsed.data;

  await db
    .delete(moduleOrgDisplayConfigRoles)
    .where(eq(moduleOrgDisplayConfigRoles.displayConfigId, id));

  if (module_role_ids.length > 0) {
    await db.insert(moduleOrgDisplayConfigRoles).values(
      module_role_ids.map((roleId) => ({
        displayConfigId: id,
        moduleRoleId: roleId,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleOrgDisplayConfigRoles)
    .where(eq(moduleOrgDisplayConfigRoles.displayConfigId, id));

  return c.json(toSnakeCase(rows));
});

// PUT /modules/:moduleId/org/display-configs/:id/fields
router.put('/modules/:moduleId/org/display-configs/:id/fields', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setOrgDisplayConfigFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { fields } = parsed.data;

  await db
    .delete(moduleOrgDisplayConfigFields)
    .where(eq(moduleOrgDisplayConfigFields.displayConfigId, id));

  if (fields.length > 0) {
    await db.insert(moduleOrgDisplayConfigFields).values(
      fields.map((f) => ({
        displayConfigId: id,
        ...(f.field_slug !== undefined && { fieldSlug: f.field_slug }),
        ...(f.eo_field_definition_id !== undefined && { eoFieldDefinitionId: f.eo_field_definition_id }),
        canEdit: f.can_edit,
        showInTable: f.show_in_table,
        showInDrawer: f.show_in_drawer,
        showInExport: f.show_in_export,
        displayOrder: f.display_order,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleOrgDisplayConfigFields)
    .where(eq(moduleOrgDisplayConfigFields.displayConfigId, id))
    .orderBy(moduleOrgDisplayConfigFields.displayOrder);

  return c.json(toSnakeCase(rows));
});

// ─── USERS Display Configs — /modules/:moduleId/users/display-configs ─────────

// GET /modules/:moduleId/users/display-configs
router.get('/modules/:moduleId/users/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();

  const configs = await db
    .select()
    .from(moduleUsersDisplayConfigs)
    .where(eq(moduleUsersDisplayConfigs.clientModuleId, moduleId))
    .orderBy(moduleUsersDisplayConfigs.createdAt);

  return c.json(toSnakeCase(configs));
});

// POST /modules/:moduleId/users/display-configs
router.post('/modules/:moduleId/users/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const body = await c.req.json();
  const parsed = createUsersDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, filters, pre_filters } = parsed.data;

  const [created] = await db
    .insert(moduleUsersDisplayConfigs)
    .values({
      clientModuleId: moduleId,
      name,
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
    })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

// PATCH /modules/:moduleId/users/display-configs/:id
router.patch('/modules/:moduleId/users/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateUsersDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, filters, pre_filters } = parsed.data;

  const [updated] = await db
    .update(moduleUsersDisplayConfigs)
    .set({
      ...(name !== undefined && { name }),
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(moduleUsersDisplayConfigs.id, id),
        eq(moduleUsersDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json(toSnakeCase(updated));
});

// DELETE /modules/:moduleId/users/display-configs/:id
router.delete('/modules/:moduleId/users/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();

  const [deleted] = await db
    .delete(moduleUsersDisplayConfigs)
    .where(
      and(
        eq(moduleUsersDisplayConfigs.id, id),
        eq(moduleUsersDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json({ success: true });
});

// PUT /modules/:moduleId/users/display-configs/:id/roles
router.put('/modules/:moduleId/users/display-configs/:id/roles', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setUsersDisplayConfigRolesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_role_ids } = parsed.data;

  await db
    .delete(moduleUsersDisplayConfigRoles)
    .where(eq(moduleUsersDisplayConfigRoles.displayConfigId, id));

  if (module_role_ids.length > 0) {
    await db.insert(moduleUsersDisplayConfigRoles).values(
      module_role_ids.map((roleId) => ({
        displayConfigId: id,
        moduleRoleId: roleId,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleUsersDisplayConfigRoles)
    .where(eq(moduleUsersDisplayConfigRoles.displayConfigId, id));

  return c.json(toSnakeCase(rows));
});

// PUT /modules/:moduleId/users/display-configs/:id/fields
router.put('/modules/:moduleId/users/display-configs/:id/fields', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setUsersDisplayConfigFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { fields } = parsed.data;

  await db
    .delete(moduleUsersDisplayConfigFields)
    .where(eq(moduleUsersDisplayConfigFields.displayConfigId, id));

  if (fields.length > 0) {
    await db.insert(moduleUsersDisplayConfigFields).values(
      fields.map((f) => ({
        displayConfigId: id,
        ...(f.field_slug !== undefined && { fieldSlug: f.field_slug }),
        ...(f.user_field_definition_id !== undefined && { userFieldDefinitionId: f.user_field_definition_id }),
        canEdit: f.can_edit,
        showInTable: f.show_in_table,
        showInDrawer: f.show_in_drawer,
        showInExport: f.show_in_export,
        isAnonymized: f.is_anonymized,
        displayOrder: f.display_order,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleUsersDisplayConfigFields)
    .where(eq(moduleUsersDisplayConfigFields.displayConfigId, id))
    .orderBy(moduleUsersDisplayConfigFields.displayOrder);

  return c.json(toSnakeCase(rows));
});

// ─── PROFILS Display Configs — /modules/:moduleId/profils/display-configs ─────

// GET /modules/:moduleId/profils/display-configs
router.get('/modules/:moduleId/profils/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();

  const configs = await db
    .select()
    .from(moduleProfilsDisplayConfigs)
    .where(eq(moduleProfilsDisplayConfigs.clientModuleId, moduleId))
    .orderBy(moduleProfilsDisplayConfigs.createdAt);

  return c.json(toSnakeCase(configs));
});

// POST /modules/:moduleId/profils/display-configs
router.post('/modules/:moduleId/profils/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const body = await c.req.json();
  const parsed = createProfilsDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, filters, pre_filters } = parsed.data;

  const [created] = await db
    .insert(moduleProfilsDisplayConfigs)
    .values({
      clientModuleId: moduleId,
      name,
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
    })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

// PATCH /modules/:moduleId/profils/display-configs/:id
router.patch('/modules/:moduleId/profils/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateProfilsDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, filters, pre_filters } = parsed.data;

  const [updated] = await db
    .update(moduleProfilsDisplayConfigs)
    .set({
      ...(name !== undefined && { name }),
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(moduleProfilsDisplayConfigs.id, id),
        eq(moduleProfilsDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json(toSnakeCase(updated));
});

// DELETE /modules/:moduleId/profils/display-configs/:id
router.delete('/modules/:moduleId/profils/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();

  const [deleted] = await db
    .delete(moduleProfilsDisplayConfigs)
    .where(
      and(
        eq(moduleProfilsDisplayConfigs.id, id),
        eq(moduleProfilsDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json({ success: true });
});

// PUT /modules/:moduleId/profils/display-configs/:id/roles
router.put('/modules/:moduleId/profils/display-configs/:id/roles', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setProfilsDisplayConfigRolesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_role_ids } = parsed.data;

  await db
    .delete(moduleProfilsDisplayConfigRoles)
    .where(eq(moduleProfilsDisplayConfigRoles.displayConfigId, id));

  if (module_role_ids.length > 0) {
    await db.insert(moduleProfilsDisplayConfigRoles).values(
      module_role_ids.map((roleId) => ({
        displayConfigId: id,
        moduleRoleId: roleId,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleProfilsDisplayConfigRoles)
    .where(eq(moduleProfilsDisplayConfigRoles.displayConfigId, id));

  return c.json(toSnakeCase(rows));
});

// PUT /modules/:moduleId/profils/display-configs/:id/fields
router.put('/modules/:moduleId/profils/display-configs/:id/fields', async (c) => {
  const user = c.get('user');
  if (!isAdminOrIntegrator(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setProfilsDisplayConfigFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { fields } = parsed.data;

  await db
    .delete(moduleProfilsDisplayConfigFields)
    .where(eq(moduleProfilsDisplayConfigFields.displayConfigId, id));

  if (fields.length > 0) {
    await db.insert(moduleProfilsDisplayConfigFields).values(
      fields.map((f) => ({
        displayConfigId: id,
        fieldSlug: f.field_slug,
        canEdit: f.can_edit,
        showInTable: f.show_in_table,
        showInDrawer: f.show_in_drawer,
        showInExport: f.show_in_export,
        displayOrder: f.display_order,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleProfilsDisplayConfigFields)
    .where(eq(moduleProfilsDisplayConfigFields.displayConfigId, id))
    .orderBy(moduleProfilsDisplayConfigFields.displayOrder);

  return c.json(toSnakeCase(rows));
});

// ─── CV FORM Display Configs — /modules/:moduleId/cv/forms/:formId/display-configs

// GET /modules/:moduleId/cv/forms/:formId/display-configs
router.get('/modules/:moduleId/cv/forms/:formId/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { formId } = c.req.param();

  // Verify the form exists
  const [form] = await db
    .select()
    .from(moduleCvForms)
    .where(eq(moduleCvForms.id, formId));
  if (!form) return c.json({ error: 'Formulaire introuvable' }, 404);

  const configs = await db
    .select()
    .from(moduleCvFormDisplayConfigs)
    .where(eq(moduleCvFormDisplayConfigs.formId, formId))
    .orderBy(moduleCvFormDisplayConfigs.createdAt);

  return c.json(toSnakeCase(configs));
});

// POST /modules/:moduleId/cv/forms/:formId/display-configs
router.post('/modules/:moduleId/cv/forms/:formId/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { formId } = c.req.param();
  const body = await c.req.json();
  const parsed = createCvFormDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  // Verify the form exists
  const [form] = await db
    .select()
    .from(moduleCvForms)
    .where(eq(moduleCvForms.id, formId));
  if (!form) return c.json({ error: 'Formulaire introuvable' }, 404);

  const [created] = await db
    .insert(moduleCvFormDisplayConfigs)
    .values({
      formId,
      name: parsed.data.name,
    })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

// PATCH /modules/:moduleId/cv/forms/:formId/display-configs/:id
router.patch('/modules/:moduleId/cv/forms/:formId/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { formId, id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateCvFormDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name } = parsed.data;

  const [updated] = await db
    .update(moduleCvFormDisplayConfigs)
    .set({
      ...(name !== undefined && { name }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(moduleCvFormDisplayConfigs.id, id),
        eq(moduleCvFormDisplayConfigs.formId, formId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json(toSnakeCase(updated));
});

// DELETE /modules/:moduleId/cv/forms/:formId/display-configs/:id
router.delete('/modules/:moduleId/cv/forms/:formId/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { formId, id } = c.req.param();

  const [deleted] = await db
    .delete(moduleCvFormDisplayConfigs)
    .where(
      and(
        eq(moduleCvFormDisplayConfigs.id, id),
        eq(moduleCvFormDisplayConfigs.formId, formId),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json({ success: true });
});

// PUT /modules/:moduleId/cv/forms/:formId/display-configs/:id/roles
router.put('/modules/:moduleId/cv/forms/:formId/display-configs/:id/roles', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setCvFormDisplayConfigRolesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_role_ids } = parsed.data;

  await db
    .delete(moduleCvFormDisplayConfigRoles)
    .where(eq(moduleCvFormDisplayConfigRoles.displayConfigId, id));

  if (module_role_ids.length > 0) {
    await db.insert(moduleCvFormDisplayConfigRoles).values(
      module_role_ids.map((roleId) => ({
        displayConfigId: id,
        moduleRoleId: roleId,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleCvFormDisplayConfigRoles)
    .where(eq(moduleCvFormDisplayConfigRoles.displayConfigId, id));

  return c.json(toSnakeCase(rows));
});

// PUT /modules/:moduleId/cv/forms/:formId/display-configs/:id/fields
router.put('/modules/:moduleId/cv/forms/:formId/display-configs/:id/fields', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setCvFormDisplayConfigFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { fields } = parsed.data;

  await db
    .delete(moduleCvFormDisplayConfigFields)
    .where(eq(moduleCvFormDisplayConfigFields.displayConfigId, id));

  if (fields.length > 0) {
    await db.insert(moduleCvFormDisplayConfigFields).values(
      fields.map((f) => ({
        displayConfigId: id,
        formFieldId: f.form_field_id,
        canView: f.can_view,
        canEdit: f.can_edit,
        displayOrder: f.display_order,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleCvFormDisplayConfigFields)
    .where(eq(moduleCvFormDisplayConfigFields.displayConfigId, id))
    .orderBy(moduleCvFormDisplayConfigFields.displayOrder);

  return c.json(toSnakeCase(rows));
});

// ─── CV LISTING Display Configs — /modules/:moduleId/cv/display-configs ───────

// GET /modules/:moduleId/cv/display-configs
router.get('/modules/:moduleId/cv/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();

  const configs = await db
    .select()
    .from(moduleCvDisplayConfigs)
    .where(eq(moduleCvDisplayConfigs.clientModuleId, moduleId))
    .orderBy(moduleCvDisplayConfigs.createdAt);

  return c.json(toSnakeCase(configs));
});

// POST /modules/:moduleId/cv/display-configs
router.post('/modules/:moduleId/cv/display-configs', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId } = c.req.param();
  const body = await c.req.json();
  const parsed = createCvDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, filters, pre_filters } = parsed.data;

  const [created] = await db
    .insert(moduleCvDisplayConfigs)
    .values({
      clientModuleId: moduleId,
      name,
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
    })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

// PATCH /modules/:moduleId/cv/display-configs/:id
router.patch('/modules/:moduleId/cv/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();
  const body = await c.req.json();
  const parsed = updateCvDisplayConfigSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, filters, pre_filters } = parsed.data;

  const [updated] = await db
    .update(moduleCvDisplayConfigs)
    .set({
      ...(name !== undefined && { name }),
      ...(filters !== undefined && { filters }),
      ...(pre_filters !== undefined && { preFilters: pre_filters }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(moduleCvDisplayConfigs.id, id),
        eq(moduleCvDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json(toSnakeCase(updated));
});

// DELETE /modules/:moduleId/cv/display-configs/:id
router.delete('/modules/:moduleId/cv/display-configs/:id', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { moduleId, id } = c.req.param();

  const [deleted] = await db
    .delete(moduleCvDisplayConfigs)
    .where(
      and(
        eq(moduleCvDisplayConfigs.id, id),
        eq(moduleCvDisplayConfigs.clientModuleId, moduleId),
      ),
    )
    .returning();

  if (!deleted) return c.json({ error: 'Configuration introuvable' }, 404);

  return c.json({ success: true });
});

// PUT /modules/:moduleId/cv/display-configs/:id/roles
router.put('/modules/:moduleId/cv/display-configs/:id/roles', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setCvDisplayConfigRolesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_role_ids } = parsed.data;

  await db
    .delete(moduleCvDisplayConfigRoles)
    .where(eq(moduleCvDisplayConfigRoles.displayConfigId, id));

  if (module_role_ids.length > 0) {
    await db.insert(moduleCvDisplayConfigRoles).values(
      module_role_ids.map((roleId) => ({
        displayConfigId: id,
        moduleRoleId: roleId,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleCvDisplayConfigRoles)
    .where(eq(moduleCvDisplayConfigRoles.displayConfigId, id));

  return c.json(toSnakeCase(rows));
});

// PUT /modules/:moduleId/cv/display-configs/:id/fields
router.put('/modules/:moduleId/cv/display-configs/:id/fields', async (c) => {
  const user = c.get('user');
  if (!isAdminIntegratorOrCvConfigurer(user.persona)) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const { id } = c.req.param();
  const body = await c.req.json();
  const parsed = setCvDisplayConfigFieldsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { fields } = parsed.data;

  await db
    .delete(moduleCvDisplayConfigFields)
    .where(eq(moduleCvDisplayConfigFields.displayConfigId, id));

  if (fields.length > 0) {
    await db.insert(moduleCvDisplayConfigFields).values(
      fields.map((f) => ({
        displayConfigId: id,
        ...(f.field_slug !== undefined && { fieldSlug: f.field_slug }),
        ...(f.cv_field_definition_id !== undefined && { cvFieldDefinitionId: f.cv_field_definition_id }),
        showInTable: f.show_in_table,
        showInExport: f.show_in_export,
        displayOrder: f.display_order,
      })),
    );
  }

  const rows = await db
    .select()
    .from(moduleCvDisplayConfigFields)
    .where(eq(moduleCvDisplayConfigFields.displayConfigId, id))
    .orderBy(moduleCvDisplayConfigFields.displayOrder);

  return c.json(toSnakeCase(rows));
});

export default router;
