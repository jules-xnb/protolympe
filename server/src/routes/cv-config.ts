import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  clientModules,
  moduleCvSurveyTypes,
  moduleCvFieldDefinitions,
  moduleCvStatuses,
  moduleCvStatusTransitions,
  moduleCvStatusTransitionRoles,
  moduleCvForms,
  moduleCvFormFields,
  moduleCvValidationRules,
  moduleRoles,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { getUserPermissions, hasModulePermission } from '../lib/cache.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppEnv = {
  Variables: {
    user: import('../lib/jwt.js').JwtPayload;
  };
};

const app = new Hono<AppEnv>();

app.use('*', authMiddleware);

// ─── Access helper ─────────────────────────────────────────────────────────────
// Admin/integrators: always allowed.
// client_user: needs can_configure_survey_type permission on the module.

async function canConfigure(
  user: import('../lib/jwt.js').JwtPayload,
  moduleId: string
): Promise<boolean> {
  if (
    user.persona === 'admin_delta' ||
    user.persona === 'integrator_delta' ||
    user.persona === 'integrator_external'
  ) {
    return true;
  }
  if (user.persona === 'client_user') {
    const permissions = await getUserPermissions(user.sub);
    return hasModulePermission(permissions, moduleId, 'can_configure_survey_type');
  }
  return false;
}

// ─── Module existence guard ────────────────────────────────────────────────────

async function getModule(moduleId: string) {
  const [mod] = await db
    .select()
    .from(clientModules)
    .where(eq(clientModules.id, moduleId));
  return mod ?? null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSurveyTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateSurveyTypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const createFieldDefinitionSchema = z.object({
  name: z.string().min(1),
  field_type: z.string().min(1),
  description: z.string().optional(),
  list_id: z.string().uuid().optional(),
  settings: z.record(z.unknown()).optional(),
});

const updateFieldDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  field_type: z.string().min(1).optional(),
  description: z.string().optional(),
  list_id: z.string().uuid().nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
});

const createStatusSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  display_order: z.number().int().optional(),
  is_initial: z.boolean().optional(),
  is_final: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  display_order: z.number().int().optional(),
  is_initial: z.boolean().optional(),
  is_final: z.boolean().optional(),
});

const reorderStatusesSchema = z.object({
  status_ids: z.array(z.string().uuid()).min(1),
});

const createTransitionSchema = z.object({
  from_status_id: z.string().uuid(),
  to_status_id: z.string().uuid(),
  label: z.string().optional(),
});

const updateTransitionSchema = z.object({
  label: z.string().nullable().optional(),
});

const setTransitionRolesSchema = z.object({
  module_role_ids: z.array(z.string().uuid()),
});

const createFormSchema = z.object({
  status_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateFormSchema = z.object({
  status_id: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

const createFormFieldSchema = z.object({
  field_definition_id: z.string().uuid(),
  is_required: z.boolean().optional(),
  visibility_conditions: z.record(z.unknown()).nullable().optional(),
  conditional_coloring: z.record(z.unknown()).nullable().optional(),
});

const updateFormFieldSchema = z.object({
  is_required: z.boolean().optional(),
  visibility_conditions: z.record(z.unknown()).nullable().optional(),
  conditional_coloring: z.record(z.unknown()).nullable().optional(),
});

const createValidationRuleSchema = z.object({
  field_definition_id: z.string().uuid().optional(),
  rule_type: z.string().min(1),
  config: z.record(z.unknown()).nullable().optional(),
});

const updateValidationRuleSchema = z.object({
  field_definition_id: z.string().uuid().nullable().optional(),
  rule_type: z.string().min(1).optional(),
  config: z.record(z.unknown()).nullable().optional(),
});

// ─── Serializers ──────────────────────────────────────────────────────────────

function surveyTypeToSnake(row: typeof moduleCvSurveyTypes.$inferSelect) {
  return {
    id: row.id,
    client_module_id: row.clientModuleId,
    name: row.name,
    description: row.description,
    is_active: row.isActive,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fieldDefinitionToSnake(row: typeof moduleCvFieldDefinitions.$inferSelect) {
  return {
    id: row.id,
    survey_type_id: row.surveyTypeId,
    name: row.name,
    field_type: row.fieldType,
    description: row.description,
    list_id: row.listId,
    is_active: row.isActive,
    settings: row.settings,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function statusToSnake(row: typeof moduleCvStatuses.$inferSelect) {
  return {
    id: row.id,
    survey_type_id: row.surveyTypeId,
    name: row.name,
    color: row.color,
    display_order: row.displayOrder,
    is_initial: row.isInitial,
    is_final: row.isFinal,
    created_at: row.createdAt,
  };
}

function transitionToSnake(row: typeof moduleCvStatusTransitions.$inferSelect) {
  return {
    id: row.id,
    survey_type_id: row.surveyTypeId,
    from_status_id: row.fromStatusId,
    to_status_id: row.toStatusId,
    label: row.label,
    created_at: row.createdAt,
  };
}

function formToSnake(row: typeof moduleCvForms.$inferSelect) {
  return {
    id: row.id,
    survey_type_id: row.surveyTypeId,
    status_id: row.statusId,
    name: row.name,
    description: row.description,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function formFieldToSnake(row: typeof moduleCvFormFields.$inferSelect) {
  return {
    id: row.id,
    form_id: row.formId,
    field_definition_id: row.fieldDefinitionId,
    is_required: row.isRequired,
    visibility_conditions: row.visibilityConditions,
    conditional_coloring: row.conditionalColoring,
    created_at: row.createdAt,
  };
}

function validationRuleToSnake(row: typeof moduleCvValidationRules.$inferSelect) {
  return {
    id: row.id,
    survey_type_id: row.surveyTypeId,
    field_definition_id: row.fieldDefinitionId,
    rule_type: row.ruleType,
    config: row.config,
    created_at: row.createdAt,
  };
}

// ─── Survey Types ──────────────────────────────────────────────────────────────

// 1. GET /survey-types
app.get('/survey-types', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const mod = await getModule(moduleId);
  if (!mod) return c.json({ error: 'Module introuvable' }, 404);

  const rows = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(eq(moduleCvSurveyTypes.clientModuleId, moduleId))
    .orderBy(moduleCvSurveyTypes.createdAt);

  return c.json(rows.map(surveyTypeToSnake));
});

// 2. GET /survey-types/:id
app.get('/survey-types/:id', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [row] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, id),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!row) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  return c.json(surveyTypeToSnake(row));
});

// 3. POST /survey-types
app.post('/survey-types', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const mod = await getModule(moduleId);
  if (!mod) return c.json({ error: 'Module introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedBody = createSurveyTypeSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;

  const [created] = await db
    .insert(moduleCvSurveyTypes)
    .values({
      clientModuleId: moduleId,
      name: body.name,
      description: body.description,
    })
    .returning();

  return c.json(surveyTypeToSnake(created), 201);
});

// 4. PATCH /survey-types/:id
app.patch('/survey-types/:id', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [existing] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, id),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!existing) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedBody = updateSurveyTypeSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;

  const [updated] = await db
    .update(moduleCvSurveyTypes)
    .set(updateData)
    .where(eq(moduleCvSurveyTypes.id, id))
    .returning();

  return c.json(surveyTypeToSnake(updated));
});

// 5. PATCH /survey-types/:id/deactivate
app.patch('/survey-types/:id/deactivate', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [existing] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, id),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!existing) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const [updated] = await db
    .update(moduleCvSurveyTypes)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(moduleCvSurveyTypes.id, id))
    .returning();

  return c.json(surveyTypeToSnake(updated));
});

// ─── Field Definitions ─────────────────────────────────────────────────────────

// 6. GET /survey-types/:typeId/fields
app.get('/survey-types/:typeId/fields', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, typeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const rows = await db
    .select()
    .from(moduleCvFieldDefinitions)
    .where(eq(moduleCvFieldDefinitions.surveyTypeId, typeId))
    .orderBy(moduleCvFieldDefinitions.createdAt);

  return c.json(rows.map(fieldDefinitionToSnake));
});

// 7. POST /survey-types/:typeId/fields
app.post(
  '/survey-types/:typeId/fields',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [surveyType] = await db
      .select()
      .from(moduleCvSurveyTypes)
      .where(
        and(
          eq(moduleCvSurveyTypes.id, typeId),
          eq(moduleCvSurveyTypes.clientModuleId, moduleId)
        )
      );

    if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = createFieldDefinitionSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;

    const [created] = await db
      .insert(moduleCvFieldDefinitions)
      .values({
        surveyTypeId: typeId,
        name: body.name,
        fieldType: body.field_type,
        description: body.description,
        listId: body.list_id,
        settings: body.settings ?? null,
      })
      .returning();

    return c.json(fieldDefinitionToSnake(created), 201);
  }
);

// 8. PATCH /survey-types/:typeId/fields/:id
app.patch(
  '/survey-types/:typeId/fields/:id',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;
    const { id } = c.req.param();

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [existing] = await db
      .select()
      .from(moduleCvFieldDefinitions)
      .where(
        and(
          eq(moduleCvFieldDefinitions.id, id),
          eq(moduleCvFieldDefinitions.surveyTypeId, typeId)
        )
      );

    if (!existing) return c.json({ error: 'Champ introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = updateFieldDefinitionSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.field_type !== undefined) updateData.fieldType = body.field_type;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.list_id !== undefined) updateData.listId = body.list_id;
    if (body.settings !== undefined) updateData.settings = body.settings;

    const [updated] = await db
      .update(moduleCvFieldDefinitions)
      .set(updateData)
      .where(eq(moduleCvFieldDefinitions.id, id))
      .returning();

    return c.json(fieldDefinitionToSnake(updated));
  }
);

// 9. PATCH /survey-types/:typeId/fields/:id/deactivate
app.patch('/survey-types/:typeId/fields/:id/deactivate', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [existing] = await db
    .select()
    .from(moduleCvFieldDefinitions)
    .where(
      and(
        eq(moduleCvFieldDefinitions.id, id),
        eq(moduleCvFieldDefinitions.surveyTypeId, typeId)
      )
    );

  if (!existing) return c.json({ error: 'Champ introuvable' }, 404);

  const [updated] = await db
    .update(moduleCvFieldDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(moduleCvFieldDefinitions.id, id))
    .returning();

  return c.json(fieldDefinitionToSnake(updated));
});

// ─── Statuses ──────────────────────────────────────────────────────────────────

// 10. GET /survey-types/:typeId/statuses
app.get('/survey-types/:typeId/statuses', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, typeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const rows = await db
    .select()
    .from(moduleCvStatuses)
    .where(eq(moduleCvStatuses.surveyTypeId, typeId))
    .orderBy(asc(moduleCvStatuses.displayOrder));

  return c.json(rows.map(statusToSnake));
});

// 11. POST /survey-types/:typeId/statuses
app.post(
  '/survey-types/:typeId/statuses',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [surveyType] = await db
      .select()
      .from(moduleCvSurveyTypes)
      .where(
        and(
          eq(moduleCvSurveyTypes.id, typeId),
          eq(moduleCvSurveyTypes.clientModuleId, moduleId)
        )
      );

    if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = createStatusSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;

    const [created] = await db
      .insert(moduleCvStatuses)
      .values({
        surveyTypeId: typeId,
        name: body.name,
        color: body.color,
        displayOrder: body.display_order ?? 0,
        isInitial: body.is_initial ?? false,
        isFinal: body.is_final ?? false,
      })
      .returning();

    return c.json(statusToSnake(created), 201);
  }
);

// 12. PATCH /survey-types/:typeId/statuses/:id
app.patch(
  '/survey-types/:typeId/statuses/:id',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;
    const { id } = c.req.param();

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [existing] = await db
      .select()
      .from(moduleCvStatuses)
      .where(
        and(
          eq(moduleCvStatuses.id, id),
          eq(moduleCvStatuses.surveyTypeId, typeId)
        )
      );

    if (!existing) return c.json({ error: 'Statut introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = updateStatusSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.display_order !== undefined) updateData.displayOrder = body.display_order;
    if (body.is_initial !== undefined) updateData.isInitial = body.is_initial;
    if (body.is_final !== undefined) updateData.isFinal = body.is_final;

    const [updated] = await db
      .update(moduleCvStatuses)
      .set(updateData)
      .where(eq(moduleCvStatuses.id, id))
      .returning();

    return c.json(statusToSnake(updated));
  }
);

// 13. PATCH /survey-types/:typeId/statuses/reorder
app.patch(
  '/survey-types/:typeId/statuses/reorder',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [surveyType] = await db
      .select()
      .from(moduleCvSurveyTypes)
      .where(
        and(
          eq(moduleCvSurveyTypes.id, typeId),
          eq(moduleCvSurveyTypes.clientModuleId, moduleId)
        )
      );

    if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = reorderStatusesSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const { status_ids } = parsedBody.data;

    // Update display_order for each status id in the provided order
    await Promise.all(
      status_ids.map((statusId, index) =>
        db
          .update(moduleCvStatuses)
          .set({ displayOrder: index })
          .where(
            and(
              eq(moduleCvStatuses.id, statusId),
              eq(moduleCvStatuses.surveyTypeId, typeId)
            )
          )
      )
    );

    const rows = await db
      .select()
      .from(moduleCvStatuses)
      .where(eq(moduleCvStatuses.surveyTypeId, typeId))
      .orderBy(asc(moduleCvStatuses.displayOrder));

    return c.json(rows.map(statusToSnake));
  }
);

// ─── Transitions ───────────────────────────────────────────────────────────────

// 14. GET /survey-types/:typeId/transitions
app.get('/survey-types/:typeId/transitions', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, typeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const transitions = await db
    .select()
    .from(moduleCvStatusTransitions)
    .where(eq(moduleCvStatusTransitions.surveyTypeId, typeId))
    .orderBy(moduleCvStatusTransitions.createdAt);

  // Load all roles for these transitions in one query
  const transitionIds = transitions.map((t) => t.id);
  const allRoles =
    transitionIds.length > 0
      ? await db
          .select({
            transitionId: moduleCvStatusTransitionRoles.transitionId,
            moduleRoleId: moduleCvStatusTransitionRoles.moduleRoleId,
            roleName: moduleRoles.name,
          })
          .from(moduleCvStatusTransitionRoles)
          .innerJoin(
            moduleRoles,
            eq(moduleCvStatusTransitionRoles.moduleRoleId, moduleRoles.id)
          )
          .where(inArray(moduleCvStatusTransitionRoles.transitionId, transitionIds))
      : [];

  const rolesByTransition = new Map<string, { module_role_id: string; name: string }[]>();
  for (const r of allRoles) {
    if (!rolesByTransition.has(r.transitionId)) rolesByTransition.set(r.transitionId, []);
    rolesByTransition.get(r.transitionId)!.push({
      module_role_id: r.moduleRoleId,
      name: r.roleName,
    });
  }

  return c.json(
    transitions.map((t) => ({
      ...transitionToSnake(t),
      roles: rolesByTransition.get(t.id) ?? [],
    }))
  );
});

// 15. POST /survey-types/:typeId/transitions
app.post(
  '/survey-types/:typeId/transitions',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [surveyType] = await db
      .select()
      .from(moduleCvSurveyTypes)
      .where(
        and(
          eq(moduleCvSurveyTypes.id, typeId),
          eq(moduleCvSurveyTypes.clientModuleId, moduleId)
        )
      );

    if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = createTransitionSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;

    const [created] = await db
      .insert(moduleCvStatusTransitions)
      .values({
        surveyTypeId: typeId,
        fromStatusId: body.from_status_id,
        toStatusId: body.to_status_id,
        label: body.label,
      })
      .returning();

    return c.json({ ...transitionToSnake(created), roles: [] }, 201);
  }
);

// 16. PATCH /survey-types/:typeId/transitions/:id
app.patch(
  '/survey-types/:typeId/transitions/:id',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;
    const { id } = c.req.param();

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [existing] = await db
      .select()
      .from(moduleCvStatusTransitions)
      .where(
        and(
          eq(moduleCvStatusTransitions.id, id),
          eq(moduleCvStatusTransitions.surveyTypeId, typeId)
        )
      );

    if (!existing) return c.json({ error: 'Transition introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = updateTransitionSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;

    const [updated] = await db
      .update(moduleCvStatusTransitions)
      .set({ label: body.label !== undefined ? body.label : existing.label })
      .where(eq(moduleCvStatusTransitions.id, id))
      .returning();

    return c.json(transitionToSnake(updated));
  }
);

// 17. DELETE /survey-types/:typeId/transitions/:id
app.delete('/survey-types/:typeId/transitions/:id', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [existing] = await db
    .select()
    .from(moduleCvStatusTransitions)
    .where(
      and(
        eq(moduleCvStatusTransitions.id, id),
        eq(moduleCvStatusTransitions.surveyTypeId, typeId)
      )
    );

  if (!existing) return c.json({ error: 'Transition introuvable' }, 404);

  await db
    .delete(moduleCvStatusTransitions)
    .where(eq(moduleCvStatusTransitions.id, id));

  return c.json({ success: true });
});

// 18. GET /survey-types/:typeId/transitions/:id/roles
app.get('/survey-types/:typeId/transitions/:id/roles', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [existing] = await db
    .select()
    .from(moduleCvStatusTransitions)
    .where(
      and(
        eq(moduleCvStatusTransitions.id, id),
        eq(moduleCvStatusTransitions.surveyTypeId, typeId)
      )
    );

  if (!existing) return c.json({ error: 'Transition introuvable' }, 404);

  const rows = await db
    .select({
      id: moduleCvStatusTransitionRoles.id,
      transition_id: moduleCvStatusTransitionRoles.transitionId,
      module_role_id: moduleCvStatusTransitionRoles.moduleRoleId,
      role_name: moduleRoles.name,
      created_at: moduleCvStatusTransitionRoles.createdAt,
    })
    .from(moduleCvStatusTransitionRoles)
    .innerJoin(
      moduleRoles,
      eq(moduleCvStatusTransitionRoles.moduleRoleId, moduleRoles.id)
    )
    .where(eq(moduleCvStatusTransitionRoles.transitionId, id));

  return c.json(rows);
});

// 19. PUT /survey-types/:typeId/transitions/:id/roles
app.put(
  '/survey-types/:typeId/transitions/:id/roles',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;
    const { id } = c.req.param();

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [existing] = await db
      .select()
      .from(moduleCvStatusTransitions)
      .where(
        and(
          eq(moduleCvStatusTransitions.id, id),
          eq(moduleCvStatusTransitions.surveyTypeId, typeId)
        )
      );

    if (!existing) return c.json({ error: 'Transition introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = setTransitionRolesSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const { module_role_ids } = parsedBody.data;

    // Delete existing role assignments, then insert new ones
    await db
      .delete(moduleCvStatusTransitionRoles)
      .where(eq(moduleCvStatusTransitionRoles.transitionId, id));

    if (module_role_ids.length > 0) {
      await db.insert(moduleCvStatusTransitionRoles).values(
        module_role_ids.map((roleId) => ({
          transitionId: id,
          moduleRoleId: roleId,
        }))
      );
    }

    const rows = await db
      .select({
        id: moduleCvStatusTransitionRoles.id,
        transition_id: moduleCvStatusTransitionRoles.transitionId,
        module_role_id: moduleCvStatusTransitionRoles.moduleRoleId,
        role_name: moduleRoles.name,
        created_at: moduleCvStatusTransitionRoles.createdAt,
      })
      .from(moduleCvStatusTransitionRoles)
      .innerJoin(
        moduleRoles,
        eq(moduleCvStatusTransitionRoles.moduleRoleId, moduleRoles.id)
      )
      .where(eq(moduleCvStatusTransitionRoles.transitionId, id));

    return c.json(rows);
  }
);

// ─── Forms ─────────────────────────────────────────────────────────────────────

// 20. GET /survey-types/:typeId/forms
app.get('/survey-types/:typeId/forms', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, typeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const rows = await db
    .select()
    .from(moduleCvForms)
    .where(eq(moduleCvForms.surveyTypeId, typeId))
    .orderBy(moduleCvForms.createdAt);

  return c.json(rows.map(formToSnake));
});

// 21. POST /survey-types/:typeId/forms
app.post(
  '/survey-types/:typeId/forms',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [surveyType] = await db
      .select()
      .from(moduleCvSurveyTypes)
      .where(
        and(
          eq(moduleCvSurveyTypes.id, typeId),
          eq(moduleCvSurveyTypes.clientModuleId, moduleId)
        )
      );

    if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = createFormSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;

    const [created] = await db
      .insert(moduleCvForms)
      .values({
        surveyTypeId: typeId,
        statusId: body.status_id,
        name: body.name,
        description: body.description,
      })
      .returning();

    return c.json(formToSnake(created), 201);
  }
);

// 22. PATCH /survey-types/:typeId/forms/:id
app.patch(
  '/survey-types/:typeId/forms/:id',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;
    const { id } = c.req.param();

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [existing] = await db
      .select()
      .from(moduleCvForms)
      .where(
        and(
          eq(moduleCvForms.id, id),
          eq(moduleCvForms.surveyTypeId, typeId)
        )
      );

    if (!existing) return c.json({ error: 'Formulaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = updateFormSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status_id !== undefined) updateData.statusId = body.status_id;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;

    const [updated] = await db
      .update(moduleCvForms)
      .set(updateData)
      .where(eq(moduleCvForms.id, id))
      .returning();

    return c.json(formToSnake(updated));
  }
);

// ─── Form Fields ───────────────────────────────────────────────────────────────

// 23. GET /forms/:formId/fields
app.get('/forms/:formId/fields', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const formId = c.req.param('formId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [form] = await db
    .select()
    .from(moduleCvForms)
    .where(eq(moduleCvForms.id, formId));

  if (!form) return c.json({ error: 'Formulaire introuvable' }, 404);

  const rows = await db
    .select()
    .from(moduleCvFormFields)
    .where(eq(moduleCvFormFields.formId, formId))
    .orderBy(moduleCvFormFields.createdAt);

  return c.json(rows.map(formFieldToSnake));
});

// 24. POST /forms/:formId/fields
app.post(
  '/forms/:formId/fields',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const formId = c.req.param('formId') as string;

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [form] = await db
      .select()
      .from(moduleCvForms)
      .where(eq(moduleCvForms.id, formId));

    if (!form) return c.json({ error: 'Formulaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = createFormFieldSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;

    const [created] = await db
      .insert(moduleCvFormFields)
      .values({
        formId,
        fieldDefinitionId: body.field_definition_id,
        isRequired: body.is_required ?? false,
        visibilityConditions: body.visibility_conditions ?? null,
        conditionalColoring: body.conditional_coloring ?? null,
      })
      .returning();

    return c.json(formFieldToSnake(created), 201);
  }
);

// 25. PATCH /forms/:formId/fields/:id
app.patch(
  '/forms/:formId/fields/:id',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const formId = c.req.param('formId') as string;
    const { id } = c.req.param();

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [existing] = await db
      .select()
      .from(moduleCvFormFields)
      .where(
        and(
          eq(moduleCvFormFields.id, id),
          eq(moduleCvFormFields.formId, formId)
        )
      );

    if (!existing) return c.json({ error: 'Champ de formulaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = updateFormFieldSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;
    const updateData: Record<string, unknown> = {};
    if (body.is_required !== undefined) updateData.isRequired = body.is_required;
    if (body.visibility_conditions !== undefined) updateData.visibilityConditions = body.visibility_conditions;
    if (body.conditional_coloring !== undefined) updateData.conditionalColoring = body.conditional_coloring;

    const [updated] = await db
      .update(moduleCvFormFields)
      .set(updateData)
      .where(eq(moduleCvFormFields.id, id))
      .returning();

    return c.json(formFieldToSnake(updated));
  }
);

// 26. DELETE /forms/:formId/fields/:id
app.delete('/forms/:formId/fields/:id', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const formId = c.req.param('formId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [existing] = await db
    .select()
    .from(moduleCvFormFields)
    .where(
      and(
        eq(moduleCvFormFields.id, id),
        eq(moduleCvFormFields.formId, formId)
      )
    );

  if (!existing) return c.json({ error: 'Champ de formulaire introuvable' }, 404);

  await db.delete(moduleCvFormFields).where(eq(moduleCvFormFields.id, id));

  return c.json({ success: true });
});

// ─── Validation Rules ──────────────────────────────────────────────────────────

// 27. GET /survey-types/:typeId/validation-rules
app.get('/survey-types/:typeId/validation-rules', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, typeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );

  if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const rows = await db
    .select()
    .from(moduleCvValidationRules)
    .where(eq(moduleCvValidationRules.surveyTypeId, typeId))
    .orderBy(moduleCvValidationRules.createdAt);

  return c.json(rows.map(validationRuleToSnake));
});

// 28. POST /survey-types/:typeId/validation-rules
app.post(
  '/survey-types/:typeId/validation-rules',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [surveyType] = await db
      .select()
      .from(moduleCvSurveyTypes)
      .where(
        and(
          eq(moduleCvSurveyTypes.id, typeId),
          eq(moduleCvSurveyTypes.clientModuleId, moduleId)
        )
      );

    if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = createValidationRuleSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;

    const [created] = await db
      .insert(moduleCvValidationRules)
      .values({
        surveyTypeId: typeId,
        fieldDefinitionId: body.field_definition_id,
        ruleType: body.rule_type,
        config: body.config ?? null,
      })
      .returning();

    return c.json(validationRuleToSnake(created), 201);
  }
);

// 29. PATCH /survey-types/:typeId/validation-rules/:id
app.patch(
  '/survey-types/:typeId/validation-rules/:id',
  async (c) => {
    const user = c.get('user');
    const moduleId = c.req.param('moduleId') as string;
    const typeId = c.req.param('typeId') as string;
    const { id } = c.req.param();

    if (!(await canConfigure(user, moduleId))) {
      return c.json({ error: 'Accès refusé' }, 403);
    }

    const [existing] = await db
      .select()
      .from(moduleCvValidationRules)
      .where(
        and(
          eq(moduleCvValidationRules.id, id),
          eq(moduleCvValidationRules.surveyTypeId, typeId)
        )
      );

    if (!existing) return c.json({ error: 'Règle de validation introuvable' }, 404);

    const rawBody = await c.req.json();
    const parsedBody = updateValidationRuleSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
    }
    const body = parsedBody.data;
    const updateData: Record<string, unknown> = {};
    if (body.field_definition_id !== undefined) updateData.fieldDefinitionId = body.field_definition_id;
    if (body.rule_type !== undefined) updateData.ruleType = body.rule_type;
    if (body.config !== undefined) updateData.config = body.config;

    const [updated] = await db
      .update(moduleCvValidationRules)
      .set(updateData)
      .where(eq(moduleCvValidationRules.id, id))
      .returning();

    return c.json(validationRuleToSnake(updated));
  }
);

// 30. DELETE /survey-types/:typeId/validation-rules/:id
app.delete('/survey-types/:typeId/validation-rules/:id', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const typeId = c.req.param('typeId') as string;
  const { id } = c.req.param();

  if (!(await canConfigure(user, moduleId))) {
    return c.json({ error: 'Accès refusé' }, 403);
  }

  const [existing] = await db
    .select()
    .from(moduleCvValidationRules)
    .where(
      and(
        eq(moduleCvValidationRules.id, id),
        eq(moduleCvValidationRules.surveyTypeId, typeId)
      )
    );

  if (!existing) return c.json({ error: 'Règle de validation introuvable' }, 404);

  await db
    .delete(moduleCvValidationRules)
    .where(eq(moduleCvValidationRules.id, id));

  return c.json({ success: true });
});

export default app;
