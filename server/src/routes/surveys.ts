import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  surveys,
  surveyCampaigns,
  surveyCampaignTargets,
  surveyResponses,
  surveyFieldComments,
  surveyValidationRules,
  surveyResponsePermissions,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const surveysRouter = new Hono();

surveysRouter.use('*', authMiddleware);

// =============================================
// Surveys
// =============================================

// GET /surveys?client_id=X — list surveys
surveysRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(surveys)
    .where(eq(surveys.clientId, clientId))
    .orderBy(surveys.createdAt);

  return c.json(toSnakeCase(result));
});

// GET /surveys/:id — single survey
surveysRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [survey] = await db
    .select()
    .from(surveys)
    .where(eq(surveys.id, id));

  if (!survey) {
    return c.json({ error: 'Enquête introuvable' }, 404);
  }

  return c.json(toSnakeCase(survey));
});

const createSurveySchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  boDefinitionId: z.string().uuid().optional(),
  settings: z.any().optional(),
  isActive: z.boolean().optional(),
  createdBy: z.string().uuid().optional(),
});

// POST /surveys — create survey
surveysRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSurveySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [survey] = await db
    .insert(surveys)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(survey), 201);
});

const updateSurveySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  boDefinitionId: z.string().uuid().nullable().optional(),
  settings: z.any().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /surveys/:id — update survey
surveysRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSurveySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [survey] = await db
    .update(surveys)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(surveys.id, id))
    .returning();

  if (!survey) {
    return c.json({ error: 'Enquête introuvable' }, 404);
  }

  return c.json(toSnakeCase(survey));
});

// DELETE /surveys/:id — delete survey
surveysRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [survey] = await db
    .delete(surveys)
    .where(eq(surveys.id, id))
    .returning();

  if (!survey) {
    return c.json({ error: 'Enquête introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Campaigns
// =============================================

// GET /surveys/:id/campaigns — list campaigns for a survey
surveysRouter.get('/:id/campaigns', async (c) => {
  const surveyId = c.req.param('id');

  const result = await db
    .select()
    .from(surveyCampaigns)
    .where(eq(surveyCampaigns.surveyId, surveyId))
    .orderBy(surveyCampaigns.createdAt);

  return c.json(toSnakeCase(result));
});

const createCampaignSchema = z.object({
  surveyId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  settings: z.any().optional(),
  createdBy: z.string().uuid().optional(),
});

// POST /surveys/campaigns — create campaign
surveysRouter.post('/campaigns', async (c) => {
  const body = await c.req.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const values = {
    ...parsed.data,
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
  };

  const [campaign] = await db
    .insert(surveyCampaigns)
    .values(values)
    .returning();

  return c.json(toSnakeCase(campaign), 201);
});

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  settings: z.any().optional(),
});

// PATCH /surveys/campaigns/:id — update campaign
surveysRouter.patch('/campaigns/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const values = {
    ...parsed.data,
    startDate: parsed.data.startDate !== undefined
      ? (parsed.data.startDate ? new Date(parsed.data.startDate) : null)
      : undefined,
    endDate: parsed.data.endDate !== undefined
      ? (parsed.data.endDate ? new Date(parsed.data.endDate) : null)
      : undefined,
    updatedAt: new Date(),
  };

  const [campaign] = await db
    .update(surveyCampaigns)
    .set(values)
    .where(eq(surveyCampaigns.id, id))
    .returning();

  if (!campaign) {
    return c.json({ error: 'Campagne introuvable' }, 404);
  }

  return c.json(toSnakeCase(campaign));
});

// GET /surveys/campaigns/:id — single campaign with targets
surveysRouter.get('/campaigns/:id', async (c) => {
  const id = c.req.param('id');

  const [campaign] = await db
    .select()
    .from(surveyCampaigns)
    .where(eq(surveyCampaigns.id, id));

  if (!campaign) {
    return c.json({ error: 'Campagne introuvable' }, 404);
  }

  const targets = await db
    .select()
    .from(surveyCampaignTargets)
    .where(eq(surveyCampaignTargets.campaignId, id));

  return c.json({
    ...toSnakeCase(campaign),
    targets: toSnakeCase(targets),
  });
});

// DELETE /surveys/campaigns/:id — delete campaign
surveysRouter.delete('/campaigns/:id', async (c) => {
  const id = c.req.param('id');

  const [campaign] = await db
    .delete(surveyCampaigns)
    .where(eq(surveyCampaigns.id, id))
    .returning();

  if (!campaign) {
    return c.json({ error: 'Campagne introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Campaign Targets
// =============================================

// GET /surveys/campaigns/:id/targets — list targets
surveysRouter.get('/campaigns/:id/targets', async (c) => {
  const campaignId = c.req.param('id');

  const result = await db
    .select()
    .from(surveyCampaignTargets)
    .where(eq(surveyCampaignTargets.campaignId, campaignId))
    .orderBy(surveyCampaignTargets.createdAt);

  return c.json(toSnakeCase(result));
});

const createTargetsSchema = z.object({
  targets: z.array(
    z.object({
      eoId: z.string().uuid(),
    })
  ),
});

// POST /surveys/campaigns/:id/targets — add targets (batch)
surveysRouter.post('/campaigns/:id/targets', async (c) => {
  const campaignId = c.req.param('id');
  const body = await c.req.json();
  const parsed = createTargetsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const values = parsed.data.targets.map((t) => ({
    campaignId,
    eoId: t.eoId,
  }));

  const result = await db
    .insert(surveyCampaignTargets)
    .values(values)
    .returning();

  return c.json(toSnakeCase(result), 201);
});

// DELETE /surveys/campaigns/targets/:id — remove target
surveysRouter.delete('/campaigns/targets/:id', async (c) => {
  const id = c.req.param('id');

  const [target] = await db
    .delete(surveyCampaignTargets)
    .where(eq(surveyCampaignTargets.id, id))
    .returning();

  if (!target) {
    return c.json({ error: 'Cible introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Responses
// =============================================

// GET /surveys/campaigns/:id/responses — list responses
surveysRouter.get('/campaigns/:id/responses', async (c) => {
  const campaignId = c.req.param('id');

  const result = await db
    .select()
    .from(surveyResponses)
    .where(eq(surveyResponses.campaignId, campaignId))
    .orderBy(surveyResponses.createdAt);

  return c.json(toSnakeCase(result));
});

const createResponseSchema = z.object({
  campaignId: z.string().uuid(),
  businessObjectId: z.string().uuid().optional(),
  respondentEoId: z.string().uuid(),
  status: z.string().optional(),
  currentStepId: z.string().uuid().optional(),
});

// POST /surveys/responses — create response
surveysRouter.post('/responses', async (c) => {
  const body = await c.req.json();
  const parsed = createResponseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [response] = await db
    .insert(surveyResponses)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(response), 201);
});

const updateResponseSchema = z.object({
  status: z.string().optional(),
  currentStepId: z.string().uuid().nullable().optional(),
  submittedAt: z.string().optional(),
  validatedAt: z.string().optional(),
});

// PATCH /surveys/responses/:id — update response
surveysRouter.patch('/responses/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateResponseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const values = {
    ...parsed.data,
    submittedAt: parsed.data.submittedAt ? new Date(parsed.data.submittedAt) : undefined,
    validatedAt: parsed.data.validatedAt ? new Date(parsed.data.validatedAt) : undefined,
    updatedAt: new Date(),
  };

  const [response] = await db
    .update(surveyResponses)
    .set(values)
    .where(eq(surveyResponses.id, id))
    .returning();

  if (!response) {
    return c.json({ error: 'Réponse introuvable' }, 404);
  }

  return c.json(toSnakeCase(response));
});

// =============================================
// Field Comments
// =============================================

// GET /surveys/responses/:id/comments — list field comments
surveysRouter.get('/responses/:id/comments', async (c) => {
  const responseId = c.req.param('id');

  const result = await db
    .select()
    .from(surveyFieldComments)
    .where(eq(surveyFieldComments.responseId, responseId))
    .orderBy(surveyFieldComments.createdAt);

  return c.json(toSnakeCase(result));
});

const createCommentSchema = z.object({
  responseId: z.string().uuid(),
  fieldDefinitionId: z.string().uuid(),
  comment: z.string().optional(),
  createdBy: z.string().uuid().optional(),
});

// POST /surveys/responses/comments — add comment
surveysRouter.post('/responses/comments', async (c) => {
  const body = await c.req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [comment] = await db
    .insert(surveyFieldComments)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(comment), 201);
});

// =============================================
// Validation Rules
// =============================================

// GET /surveys/:id/validation-rules — list validation rules
surveysRouter.get('/:id/validation-rules', async (c) => {
  const surveyId = c.req.param('id');

  const result = await db
    .select()
    .from(surveyValidationRules)
    .where(eq(surveyValidationRules.surveyId, surveyId))
    .orderBy(surveyValidationRules.createdAt);

  return c.json(toSnakeCase(result));
});

const createValidationRuleSchema = z.object({
  surveyId: z.string().uuid(),
  fieldDefinitionId: z.string().uuid().optional(),
  ruleType: z.string().optional(),
  config: z.any().optional(),
});

// POST /surveys/validation-rules — create rule
surveysRouter.post('/validation-rules', async (c) => {
  const body = await c.req.json();
  const parsed = createValidationRuleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [rule] = await db
    .insert(surveyValidationRules)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(rule), 201);
});

// =============================================
// Response Permissions
// =============================================

// GET /surveys/:id/response-permissions — list response permissions
surveysRouter.get('/:id/response-permissions', async (c) => {
  const surveyId = c.req.param('id');

  const result = await db
    .select()
    .from(surveyResponsePermissions)
    .where(eq(surveyResponsePermissions.surveyId, surveyId));

  return c.json(toSnakeCase(result));
});

const upsertResponsePermissionSchema = z.object({
  surveyId: z.string().uuid(),
  roleId: z.string().uuid(),
  canView: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canValidate: z.boolean().optional(),
});

// POST /surveys/response-permissions — upsert permission
surveysRouter.post('/response-permissions', async (c) => {
  const body = await c.req.json();
  const parsed = upsertResponsePermissionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  // Check if permission already exists
  const [existing] = await db
    .select()
    .from(surveyResponsePermissions)
    .where(
      and(
        eq(surveyResponsePermissions.surveyId, parsed.data.surveyId),
        eq(surveyResponsePermissions.roleId, parsed.data.roleId)
      )
    );

  if (existing) {
    const [updated] = await db
      .update(surveyResponsePermissions)
      .set({
        canView: parsed.data.canView ?? existing.canView,
        canEdit: parsed.data.canEdit ?? existing.canEdit,
        canValidate: parsed.data.canValidate ?? existing.canValidate,
      })
      .where(eq(surveyResponsePermissions.id, existing.id))
      .returning();

    return c.json(toSnakeCase(updated));
  }

  const [perm] = await db
    .insert(surveyResponsePermissions)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(perm), 201);
});

export default surveysRouter;
