import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and, inArray, count } from 'drizzle-orm';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';
import { db } from '../db/index.js';
import {
  moduleCvCampaigns,
  moduleCvCampaignTargets,
  moduleCvResponses,
  moduleCvResponseValues,
  moduleCvFieldComments,
  moduleCvResponseDocuments,
  moduleCvResponseAuditLog,
  clientModules,
  moduleCvStatuses,
  moduleCvStatusTransitions,
  moduleCvStatusTransitionRoles,
  moduleCvSurveyTypes,
  moduleCvFieldDefinitions,
  moduleCvForms,
  eoEntities,
} from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateCsv, parseCsv } from '../lib/csv.js';
import { getUserPermissions, hasClientAccess, hasModulePermission, getModuleRoleIds } from '../lib/cache.js';
import { getEditableCvFormFieldIds } from '../lib/field-access.js';
import type { JwtPayload } from '../lib/jwt.js';

type Env = { Variables: { user: JwtPayload } };

const router = new Hono<Env>();

// ─── Client access guard for module-scoped routes ─────────────────────────────

async function verifyModuleClientAccess(
  c: import('hono').Context<Env>,
  moduleId: string
): Promise<globalThis.Response | null> {
  const user = c.get('user');
  if (user.persona === 'admin_delta') return null;

  const [mod] = await db.select({ clientId: clientModules.clientId }).from(clientModules).where(eq(clientModules.id, moduleId)).limit(1);
  if (!mod) return c.json({ error: 'Module introuvable' }, 404);

  const permissions = await getUserPermissions(user.sub);
  if (!hasClientAccess(permissions, mod.clientId, user.persona)) {
    return c.json({ error: 'Accès refusé à ce module' }, 403);
  }
  return null;
}


router.use('*', authMiddleware);
router.use('*', async (c, next) => {
  const moduleId = c.req.param('moduleId') as string | undefined;
  if (moduleId) {
    const err = await verifyModuleClientAccess(c, moduleId);
    if (err) return err;
  }
  await next();
});

// ─── Schemas ─────────────────────────────────────────────────────────────────

const launchCampaignSchema = z.object({
  survey_type_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  reference_year: z.number().int(),
  prefill_campaign_id: z.string().uuid().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  start_date: z.string().datetime().nullable().optional(),
  end_date: z.string().datetime().nullable().optional(),
});

const addTargetsSchema = z.object({
  eo_ids: z.array(z.string().uuid()).min(1).max(100),
});

const saveValuesSchema = z.object({
  values: z.array(
    z.object({
      field_definition_id: z.string().uuid(),
      value: z.unknown(),
    })
  ),
});

const transitionSchema = z.object({
  transition_id: z.string().uuid(),
});

const addCommentSchema = z.object({
  field_definition_id: z.string().uuid(),
  comment: z.string().min(1),
});

const uploadDocumentSchema = z.object({
  field_definition_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  file_size: z.number().int().optional(),
  mime_type: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function campaignToSnake(c: typeof moduleCvCampaigns.$inferSelect) {
  return {
    id: c.id,
    survey_type_id: c.surveyTypeId,
    name: c.name,
    description: c.description,
    reference_year: c.referenceYear,
    prefill_campaign_id: c.prefillCampaignId,
    status: c.status,
    start_date: c.startDate,
    end_date: c.endDate,
    created_by: c.createdBy,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function targetToSnake(
  t: typeof moduleCvCampaignTargets.$inferSelect,
  eo?: typeof eoEntities.$inferSelect
) {
  return {
    id: t.id,
    campaign_id: t.campaignId,
    eo_id: t.eoId,
    created_at: t.createdAt,
    eo: eo
      ? {
          id: eo.id,
          name: eo.name,
          description: eo.description,
          parent_id: eo.parentId,
          path: eo.path,
          level: eo.level,
          is_active: eo.isActive,
        }
      : undefined,
  };
}

function responseToSnake(
  r: typeof moduleCvResponses.$inferSelect,
  extras?: { eo_name?: string; status_name?: string; status_color?: string | null }
) {
  return {
    id: r.id,
    campaign_id: r.campaignId,
    eo_id: r.eoId,
    status_id: r.statusId,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    ...extras,
  };
}

function valueToSnake(v: typeof moduleCvResponseValues.$inferSelect) {
  return {
    id: v.id,
    response_id: v.responseId,
    field_definition_id: v.fieldDefinitionId,
    value: v.value,
    updated_at: v.updatedAt,
    last_modified_by: v.lastModifiedBy,
  };
}

function commentToSnake(c: typeof moduleCvFieldComments.$inferSelect) {
  return {
    id: c.id,
    response_id: c.responseId,
    field_definition_id: c.fieldDefinitionId,
    comment: c.comment,
    created_at: c.createdAt,
    created_by: c.createdBy,
  };
}

function documentToSnake(d: typeof moduleCvResponseDocuments.$inferSelect) {
  return {
    id: d.id,
    response_id: d.responseId,
    field_definition_id: d.fieldDefinitionId,
    file_name: d.fileName,
    file_path: d.filePath,
    file_size: d.fileSize,
    mime_type: d.mimeType,
    display_order: d.displayOrder,
    uploaded_at: d.uploadedAt,
    uploaded_by: d.uploadedBy,
  };
}

function auditToSnake(a: typeof moduleCvResponseAuditLog.$inferSelect) {
  return {
    id: a.id,
    response_id: a.responseId,
    field_definition_id: a.fieldDefinitionId,
    field_name: a.fieldName,
    old_value: a.oldValue,
    new_value: a.newValue,
    changed_by: a.changedBy,
    changed_at: a.changedAt,
  };
}

async function requireManageCampaign(
  c: any,
  moduleId: string
): Promise<boolean> {
  const user = c.get('user');
  if (
    user.persona === 'admin_delta' ||
    user.persona === 'integrator_delta' ||
    user.persona === 'integrator_external'
  ) {
    return true;
  }
  if (user.persona !== 'client_user') return false;
  const permissions = await getUserPermissions(user.sub);
  return hasModulePermission(permissions, moduleId, 'can_manage_campaign');
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

// 1. GET /campaigns
router.get('/campaigns', async (c) => {
  const user = c.get('user');
  const moduleId = c.req.param('moduleId') as string;
  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });

  // Verify module access: survey types are scoped to the module
  const surveyTypes = await db
    .select({ id: moduleCvSurveyTypes.id })
    .from(moduleCvSurveyTypes)
    .where(eq(moduleCvSurveyTypes.clientModuleId, moduleId));

  const surveyTypeIds = surveyTypes.map((st) => st.id);
  if (surveyTypeIds.length === 0) {
    return c.json(paginatedResponse([], 0, pagination));
  }

  const where = inArray(moduleCvCampaigns.surveyTypeId, surveyTypeIds);
  const [{ total }] = await db.select({ total: count() }).from(moduleCvCampaigns).where(where);
  const campaigns = await db
    .select()
    .from(moduleCvCampaigns)
    .where(where)
    .orderBy(moduleCvCampaigns.createdAt)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(campaigns.map(campaignToSnake), total, pagination));
});

// 2. GET /campaigns/:id
router.get('/campaigns/:id', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));

  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  // Verify the campaign belongs to this module
  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  return c.json(campaignToSnake(campaign));
});

// 3. POST /campaigns — Launch campaign (client_user with can_manage_campaign)
router.post('/campaigns', async (c) => {
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const allowed = await requireManageCampaign(c, moduleId);
  if (!allowed) return c.json({ error: 'Permission requise : can_manage_campaign' }, 403);

  const rawBody = await c.req.json();
  const parsedBody = launchCampaignSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;

  // Verify survey type belongs to this module
  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, body.survey_type_id),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Type de questionnaire introuvable' }, 404);

  const [created] = await db
    .insert(moduleCvCampaigns)
    .values({
      surveyTypeId: body.survey_type_id,
      name: body.name,
      description: body.description,
      referenceYear: body.reference_year,
      prefillCampaignId: body.prefill_campaign_id,
      status: 'open',
      startDate: body.start_date ? new Date(body.start_date) : undefined,
      endDate: body.end_date ? new Date(body.end_date) : undefined,
      createdBy: user.sub,
    })
    .returning();

  return c.json(campaignToSnake(created), 201);
});

// 4. PATCH /campaigns/:id — Update campaign
router.patch('/campaigns/:id', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const allowed = await requireManageCampaign(c, moduleId);
  if (!allowed) return c.json({ error: 'Permission requise : can_manage_campaign' }, 403);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  // Verify module ownership
  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedBody = updateCampaignSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.start_date !== undefined) patch.startDate = body.start_date ? new Date(body.start_date) : null;
  if (body.end_date !== undefined) patch.endDate = body.end_date ? new Date(body.end_date) : null;

  const [updated] = await db
    .update(moduleCvCampaigns)
    .set(patch)
    .where(eq(moduleCvCampaigns.id, id))
    .returning();

  return c.json(campaignToSnake(updated));
});

// 5. PATCH /campaigns/:id/close — Close campaign
router.patch('/campaigns/:id/close', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const allowed = await requireManageCampaign(c, moduleId);
  if (!allowed) return c.json({ error: 'Permission requise : can_manage_campaign' }, 403);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  const [updated] = await db
    .update(moduleCvCampaigns)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(eq(moduleCvCampaigns.id, id))
    .returning();

  return c.json(campaignToSnake(updated));
});

// ─── Targets ─────────────────────────────────────────────────────────────────

// 6. GET /campaigns/:id/targets
router.get('/campaigns/:id/targets', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  const [{ total }] = await db.select({ total: count() }).from(moduleCvCampaignTargets).where(eq(moduleCvCampaignTargets.campaignId, id));
  const rows = await db
    .select({
      target: moduleCvCampaignTargets,
      eo: eoEntities,
    })
    .from(moduleCvCampaignTargets)
    .innerJoin(eoEntities, eq(eoEntities.id, moduleCvCampaignTargets.eoId))
    .where(eq(moduleCvCampaignTargets.campaignId, id))
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(rows.map((r) => targetToSnake(r.target, r.eo)), total, pagination));
});

// 7. POST /campaigns/:id/targets — Add targets
router.post('/campaigns/:id/targets', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const allowed = await requireManageCampaign(c, moduleId);
  if (!allowed) return c.json({ error: 'Permission requise : can_manage_campaign' }, 403);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  // Find the initial status for this survey type
  const [initialStatus] = await db
    .select()
    .from(moduleCvStatuses)
    .where(
      and(
        eq(moduleCvStatuses.surveyTypeId, campaign.surveyTypeId),
        eq(moduleCvStatuses.isInitial, true)
      )
    );
  if (!initialStatus) return c.json({ error: 'Statut initial introuvable pour ce type de questionnaire' }, 422);

  const rawBody = await c.req.json();
  const parsedBody = addTargetsSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const { eo_ids } = parsedBody.data;

  // Fetch prefill values if prefill_campaign_id is set
  let prefillValuesByEoId: Map<string, { fieldDefinitionId: string; value: unknown }[]> = new Map();

  if (campaign.prefillCampaignId) {
    const prefillResponses = await db
      .select()
      .from(moduleCvResponses)
      .where(
        and(
          eq(moduleCvResponses.campaignId, campaign.prefillCampaignId),
          inArray(moduleCvResponses.eoId, eo_ids)
        )
      );

    if (prefillResponses.length > 0) {
      const prefillResponseIds = prefillResponses.map((r) => r.id);
      const prefillValues = await db
        .select()
        .from(moduleCvResponseValues)
        .where(inArray(moduleCvResponseValues.responseId, prefillResponseIds));

      const responseToEo = new Map(prefillResponses.map((r) => [r.id, r.eoId]));
      for (const pv of prefillValues) {
        const eoId = responseToEo.get(pv.responseId);
        if (!eoId) continue;
        if (!prefillValuesByEoId.has(eoId)) prefillValuesByEoId.set(eoId, []);
        prefillValuesByEoId.get(eoId)!.push({
          fieldDefinitionId: pv.fieldDefinitionId,
          value: pv.value,
        });
      }
    }
  }

  const createdTargets: ReturnType<typeof targetToSnake>[] = [];

  for (const eoId of eo_ids) {
    // Insert target
    const [target] = await db
      .insert(moduleCvCampaignTargets)
      .values({ campaignId: id, eoId })
      .returning();

    // Create response at initial status
    const [response] = await db
      .insert(moduleCvResponses)
      .values({
        campaignId: id,
        eoId,
        statusId: initialStatus.id,
      })
      .returning();

    // Copy prefill values if available
    const prefillValues = prefillValuesByEoId.get(eoId);
    if (prefillValues && prefillValues.length > 0) {
      await db.insert(moduleCvResponseValues).values(
        prefillValues.map((pv) => ({
          responseId: response.id,
          fieldDefinitionId: pv.fieldDefinitionId,
          value: pv.value,
          lastModifiedBy: user.sub,
        }))
      );
    }

    createdTargets.push(targetToSnake(target));
  }

  return c.json(createdTargets, 201);
});

// 8. DELETE /campaigns/:id/targets/:targetId
router.delete('/campaigns/:id/targets/:targetId', async (c) => {
  const { id, targetId } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const allowed = await requireManageCampaign(c, moduleId);
  if (!allowed) return c.json({ error: 'Permission requise : can_manage_campaign' }, 403);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  const [deleted] = await db
    .delete(moduleCvCampaignTargets)
    .where(
      and(
        eq(moduleCvCampaignTargets.id, targetId),
        eq(moduleCvCampaignTargets.campaignId, id)
      )
    )
    .returning();

  if (!deleted) return c.json({ error: 'Cible introuvable' }, 404);

  return c.json({ success: true });
});

// ─── Responses ────────────────────────────────────────────────────────────────

// 9. GET /campaigns/:id/responses
router.get('/campaigns/:id/responses', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  const [{ total }] = await db.select({ total: count() }).from(moduleCvResponses).where(eq(moduleCvResponses.campaignId, id));
  const rows = await db
    .select({
      response: moduleCvResponses,
      eo_name: eoEntities.name,
      status_name: moduleCvStatuses.name,
      status_color: moduleCvStatuses.color,
    })
    .from(moduleCvResponses)
    .innerJoin(eoEntities, eq(eoEntities.id, moduleCvResponses.eoId))
    .innerJoin(moduleCvStatuses, eq(moduleCvStatuses.id, moduleCvResponses.statusId))
    .where(eq(moduleCvResponses.campaignId, id))
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(
    paginatedResponse(
      rows.map((r) =>
        responseToSnake(r.response, {
          eo_name: r.eo_name,
          status_name: r.status_name,
          status_color: r.status_color,
        })
      ),
      total,
      pagination
    )
  );
});

// 10. GET /responses/:id
router.get('/responses/:id', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  // Verify module ownership via campaign → survey type
  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const values = await db
    .select()
    .from(moduleCvResponseValues)
    .where(eq(moduleCvResponseValues.responseId, id));

  return c.json({
    ...responseToSnake(response),
    values: values.map(valueToSnake),
  });
});

// 11. PATCH /responses/:id — Save field values
router.patch('/responses/:id', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedBody = saveValuesSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;

  // Field access check for client_user persona
  // Find the form associated with the response's current status
  const [currentForm] = await db
    .select({ id: moduleCvForms.id })
    .from(moduleCvForms)
    .where(
      and(
        eq(moduleCvForms.surveyTypeId, surveyType.id),
        eq(moduleCvForms.statusId, response.statusId)
      )
    )
    .limit(1);

  if (currentForm) {
    const editableFieldIds = await getEditableCvFormFieldIds(user.sub, moduleId, currentForm.id);
    for (const entry of body.values) {
      if (!editableFieldIds.has(entry.field_definition_id)) {
        return c.json({ error: `Champ non autorisé : ${entry.field_definition_id}` }, 403);
      }
    }
  }

  // Fetch existing values for audit
  const existingValues = await db
    .select()
    .from(moduleCvResponseValues)
    .where(eq(moduleCvResponseValues.responseId, id));

  const existingByFieldId = new Map(existingValues.map((v) => [v.fieldDefinitionId, v]));

  const updatedValues: ReturnType<typeof valueToSnake>[] = [];

  for (const entry of body.values) {
    const existing = existingByFieldId.get(entry.field_definition_id);
    const oldValue = existing?.value ?? null;
    const newValue = entry.value ?? null;

    if (existing) {
      const [updated] = await db
        .update(moduleCvResponseValues)
        .set({
          value: newValue,
          updatedAt: new Date(),
          lastModifiedBy: user.sub,
        })
        .where(eq(moduleCvResponseValues.id, existing.id))
        .returning();
      updatedValues.push(valueToSnake(updated));
    } else {
      const [created] = await db
        .insert(moduleCvResponseValues)
        .values({
          responseId: id,
          fieldDefinitionId: entry.field_definition_id,
          value: newValue,
          lastModifiedBy: user.sub,
        })
        .returning();
      updatedValues.push(valueToSnake(created));
    }

    // Resolve field name for audit
    const [fieldDef] = await db
      .select({ name: moduleCvFieldDefinitions.name })
      .from(moduleCvFieldDefinitions)
      .where(eq(moduleCvFieldDefinitions.id, entry.field_definition_id));

    await db.insert(moduleCvResponseAuditLog).values({
      responseId: id,
      fieldDefinitionId: entry.field_definition_id,
      fieldName: fieldDef?.name ?? null,
      oldValue: oldValue as any,
      newValue: newValue as any,
      changedBy: user.sub,
    });
  }

  await db
    .update(moduleCvResponses)
    .set({ updatedAt: new Date() })
    .where(eq(moduleCvResponses.id, id));

  return c.json({ values: updatedValues });
});

// 12. POST /responses/:id/transition — Execute status transition
router.post('/responses/:id/transition', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedBody = transitionSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;

  // Verify transition exists and is applicable from current status
  const [transition] = await db
    .select()
    .from(moduleCvStatusTransitions)
    .where(
      and(
        eq(moduleCvStatusTransitions.id, body.transition_id),
        eq(moduleCvStatusTransitions.fromStatusId, response.statusId)
      )
    );
  if (!transition) return c.json({ error: 'Transition introuvable ou non applicable depuis le statut actuel' }, 422);

  // Verify user's roles include at least one allowed role for this transition
  const permissions = await getUserPermissions(user.sub);
  const userRoleIds = getModuleRoleIds(permissions, moduleId);

  if (userRoleIds.length > 0) {
    const allowedRoles = await db
      .select()
      .from(moduleCvStatusTransitionRoles)
      .where(
        and(
          eq(moduleCvStatusTransitionRoles.transitionId, body.transition_id),
          inArray(moduleCvStatusTransitionRoles.moduleRoleId, userRoleIds)
        )
      );
    if (allowedRoles.length === 0) {
      return c.json({ error: 'Votre rôle ne permet pas cette transition' }, 403);
    }
  } else {
    // No roles in this module → check if transition has role restrictions at all
    const transitionRoles = await db
      .select()
      .from(moduleCvStatusTransitionRoles)
      .where(eq(moduleCvStatusTransitionRoles.transitionId, body.transition_id));
    if (transitionRoles.length > 0) {
      return c.json({ error: 'Votre rôle ne permet pas cette transition' }, 403);
    }
  }

  const [updated] = await db
    .update(moduleCvResponses)
    .set({ statusId: transition.toStatusId, updatedAt: new Date() })
    .where(eq(moduleCvResponses.id, id))
    .returning();

  return c.json(responseToSnake(updated));
});

// ─── Prefill ─────────────────────────────────────────────────────────────────

// 13. GET /responses/:id/prefill
router.get('/responses/:id/prefill', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  if (!campaign?.prefillCampaignId) {
    return c.json({ values: [] });
  }

  // Find response for same EO in the prefill campaign
  const [prefillResponse] = await db
    .select()
    .from(moduleCvResponses)
    .where(
      and(
        eq(moduleCvResponses.campaignId, campaign.prefillCampaignId),
        eq(moduleCvResponses.eoId, response.eoId)
      )
    );

  if (!prefillResponse) return c.json({ values: [] });

  const prefillValues = await db
    .select()
    .from(moduleCvResponseValues)
    .where(eq(moduleCvResponseValues.responseId, prefillResponse.id));

  return c.json({ values: prefillValues.map(valueToSnake) });
});

// ─── Comments ─────────────────────────────────────────────────────────────────

// 14. GET /responses/:id/comments
router.get('/responses/:id/comments', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const comments = await db
    .select()
    .from(moduleCvFieldComments)
    .where(eq(moduleCvFieldComments.responseId, id))
    .orderBy(moduleCvFieldComments.createdAt);

  return c.json(comments.map(commentToSnake));
});

// 15. POST /responses/:id/comments
router.post('/responses/:id/comments', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedBody = addCommentSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;

  const [created] = await db
    .insert(moduleCvFieldComments)
    .values({
      responseId: id,
      fieldDefinitionId: body.field_definition_id,
      comment: body.comment,
      createdBy: user.sub,
    })
    .returning();

  return c.json(commentToSnake(created), 201);
});

// ─── Documents ───────────────────────────────────────────────────────────────

// 16. GET /responses/:id/documents
router.get('/responses/:id/documents', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const documents = await db
    .select()
    .from(moduleCvResponseDocuments)
    .where(eq(moduleCvResponseDocuments.responseId, id))
    .orderBy(moduleCvResponseDocuments.displayOrder);

  return c.json(documents.map(documentToSnake));
});

// 17. POST /responses/:id/documents
router.post('/responses/:id/documents', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const rawBody = await c.req.json();
  const parsedBody = uploadDocumentSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Données invalides', details: parsedBody.error.flatten() }, 400);
  }
  const body = parsedBody.data;

  const [created] = await db
    .insert(moduleCvResponseDocuments)
    .values({
      responseId: id,
      fieldDefinitionId: body.field_definition_id,
      fileName: body.file_name,
      filePath: body.file_path,
      fileSize: body.file_size ?? 0,
      mimeType: body.mime_type,
      uploadedBy: user.sub,
    })
    .returning();

  return c.json(documentToSnake(created), 201);
});

// 18. DELETE /responses/:id/documents/:docId
router.delete('/responses/:id/documents/:docId', async (c) => {
  const { id, docId } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  if (user.persona !== 'client_user') {
    return c.json({ error: 'Réservé aux utilisateurs client' }, 403);
  }

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const [deleted] = await db
    .delete(moduleCvResponseDocuments)
    .where(
      and(
        eq(moduleCvResponseDocuments.id, docId),
        eq(moduleCvResponseDocuments.responseId, id)
      )
    )
    .returning();

  if (!deleted) return c.json({ error: 'Document introuvable' }, 404);

  return c.json({ success: true });
});

// ─── Campaign Export / Import ─────────────────────────────────────────────────

// GET /campaigns/:id/export — Export responses with field values as CSV
router.get('/campaigns/:id/export', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  // Fetch all field definitions for this survey type
  const fieldDefs = await db
    .select()
    .from(moduleCvFieldDefinitions)
    .where(eq(moduleCvFieldDefinitions.surveyTypeId, campaign.surveyTypeId));

  // Fetch all responses with EO names and status names
  const responses = await db
    .select({
      response: moduleCvResponses,
      eo_name: eoEntities.name,
      status_name: moduleCvStatuses.name,
    })
    .from(moduleCvResponses)
    .innerJoin(eoEntities, eq(eoEntities.id, moduleCvResponses.eoId))
    .innerJoin(moduleCvStatuses, eq(moduleCvStatuses.id, moduleCvResponses.statusId))
    .where(eq(moduleCvResponses.campaignId, id));

  if (responses.length === 0) {
    const csv = generateCsv(['response_id', 'eo_name', 'status'], []);
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="campaign_${id}_export.csv"`);
    return c.body(csv);
  }

  const responseIds = responses.map((r) => r.response.id);
  const allValues = await db
    .select()
    .from(moduleCvResponseValues)
    .where(inArray(moduleCvResponseValues.responseId, responseIds));

  // Build a lookup: responseId -> fieldDefinitionId -> value
  const valuesByResponse = new Map<string, Map<string, unknown>>();
  for (const v of allValues) {
    if (!valuesByResponse.has(v.responseId)) {
      valuesByResponse.set(v.responseId, new Map());
    }
    valuesByResponse.get(v.responseId)!.set(v.fieldDefinitionId, v.value);
  }

  // Build headers: fixed columns + one per field definition
  const fixedHeaders = ['response_id', 'eo_name', 'status'];
  const fieldHeaders = fieldDefs.map((f) => f.name);
  const headers = [...fixedHeaders, ...fieldHeaders];

  // Build rows
  const rows = responses.map((r) => {
    const row: Record<string, unknown> = {
      response_id: r.response.id,
      eo_name: r.eo_name,
      status: r.status_name,
    };
    const valMap = valuesByResponse.get(r.response.id) ?? new Map();
    for (const f of fieldDefs) {
      const val = valMap.get(f.id);
      row[f.name] = val !== undefined && val !== null
        ? (typeof val === 'object' ? JSON.stringify(val) : val)
        : '';
    }
    return row;
  });

  const csv = generateCsv(headers, rows);
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="campaign_${id}_export.csv"`);
  return c.body(csv);
});

// POST /campaigns/:id/import — Import response values from CSV
router.post('/campaigns/:id/import', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;
  const user = c.get('user');

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, id));
  if (!campaign) return c.json({ error: 'Campagne introuvable' }, 404);

  const [surveyType] = await db
    .select()
    .from(moduleCvSurveyTypes)
    .where(
      and(
        eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
        eq(moduleCvSurveyTypes.clientModuleId, moduleId)
      )
    );
  if (!surveyType) return c.json({ error: 'Campagne introuvable' }, 404);

  // Fetch field definitions indexed by name
  const fieldDefs = await db
    .select()
    .from(moduleCvFieldDefinitions)
    .where(eq(moduleCvFieldDefinitions.surveyTypeId, campaign.surveyTypeId));
  const fieldByName = new Map(fieldDefs.map((f) => [f.name, f]));

  const body = await c.req.text();
  const { headers, rows } = parseCsv(body);

  const imported: number[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const responseId = row['response_id'];
      if (!responseId) {
        errors.push({ row: i + 2, error: 'response_id requis' });
        continue;
      }

      // Verify response belongs to this campaign
      const [response] = await db
        .select()
        .from(moduleCvResponses)
        .where(
          and(
            eq(moduleCvResponses.id, responseId),
            eq(moduleCvResponses.campaignId, id)
          )
        );
      if (!response) {
        errors.push({ row: i + 2, error: `Réponse introuvable : ${responseId}` });
        continue;
      }

      // Import values for each field column (skip fixed columns)
      const fixedCols = new Set(['response_id', 'eo_name', 'status']);
      let valuesImported = 0;
      for (const header of headers) {
        if (fixedCols.has(header)) continue;
        const fieldDef = fieldByName.get(header);
        if (!fieldDef) continue;
        const rawValue = row[header];

        // Try parsing JSON values, fall back to string
        let parsedValue: unknown = rawValue;
        try {
          if (rawValue && (rawValue.startsWith('{') || rawValue.startsWith('['))) {
            parsedValue = JSON.parse(rawValue);
          }
        } catch {
          // keep as string
        }

        const [existing] = await db
          .select()
          .from(moduleCvResponseValues)
          .where(
            and(
              eq(moduleCvResponseValues.responseId, responseId),
              eq(moduleCvResponseValues.fieldDefinitionId, fieldDef.id)
            )
          );

        if (existing) {
          await db
            .update(moduleCvResponseValues)
            .set({ value: parsedValue, updatedAt: new Date(), lastModifiedBy: user.sub })
            .where(eq(moduleCvResponseValues.id, existing.id));
        } else {
          await db.insert(moduleCvResponseValues).values({
            responseId,
            fieldDefinitionId: fieldDef.id,
            value: parsedValue,
            lastModifiedBy: user.sub,
          });
        }
        valuesImported++;
      }
      imported.push(valuesImported);
    } catch (err) {
      errors.push({ row: i + 2, error: String(err) });
    }
  }

  return c.json({ imported: imported.length, total_values_imported: imported.reduce((a, b) => a + b, 0), errors });
});

// ─── Audit ────────────────────────────────────────────────────────────────────

// 19. GET /responses/:id/audit
router.get('/responses/:id/audit', async (c) => {
  const { id } = c.req.param();
  const moduleId = c.req.param('moduleId') as string;

  const [response] = await db
    .select()
    .from(moduleCvResponses)
    .where(eq(moduleCvResponses.id, id));
  if (!response) return c.json({ error: 'Réponse introuvable' }, 404);

  const [campaign] = await db
    .select()
    .from(moduleCvCampaigns)
    .where(eq(moduleCvCampaigns.id, response.campaignId));

  const [surveyType] = campaign
    ? await db
        .select()
        .from(moduleCvSurveyTypes)
        .where(
          and(
            eq(moduleCvSurveyTypes.id, campaign.surveyTypeId),
            eq(moduleCvSurveyTypes.clientModuleId, moduleId)
          )
        )
    : [undefined];
  if (!surveyType) return c.json({ error: 'Réponse introuvable' }, 404);

  const logs = await db
    .select()
    .from(moduleCvResponseAuditLog)
    .where(eq(moduleCvResponseAuditLog.responseId, id))
    .orderBy(moduleCvResponseAuditLog.changedAt);

  return c.json(logs.map(auditToSnake));
});

export default router;
