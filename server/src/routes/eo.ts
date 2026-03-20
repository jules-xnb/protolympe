import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  eoEntities,
  eoFieldDefinitions,
  eoFieldValues,
  eoGroups,
  eoGroupMembers,
  eoAuditLog,
  eoFieldChangeComments,
  clientModules,
} from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { requireClientAccess } from '../middleware/client-access.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { getEditableFieldSlugs } from '../lib/field-access.js';
import type { JwtPayload } from '../lib/jwt.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';

type Env = { Variables: { user: JwtPayload } };

const eoRouter = new Hono<Env>();

eoRouter.use('*', authMiddleware);
eoRouter.use('*', requireClientAccess());

// =============================================
// Entities
// =============================================

// GET / — List entities for a client
eoRouter.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });

  const [{ total }] = await db.select({ total: count() }).from(eoEntities).where(eq(eoEntities.clientId, clientId));
  const result = await db
    .select()
    .from(eoEntities)
    .where(eq(eoEntities.clientId, clientId))
    .orderBy(eoEntities.path, eoEntities.name)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(toSnakeCase(result) as any[], total, pagination));
});

// GET /:id — Entity detail
eoRouter.get('/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [entity] = await db
    .select()
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!entity) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  return c.json(toSnakeCase(entity));
});

const createEntitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
});

// POST / — Create entity
eoRouter.post('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createEntitySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description, parent_id, is_active } = parsed.data;

  let path = '';
  let level = 0;

  if (parent_id) {
    const [parent] = await db
      .select({ id: eoEntities.id, path: eoEntities.path, level: eoEntities.level })
      .from(eoEntities)
      .where(and(eq(eoEntities.id, parent_id), eq(eoEntities.clientId, clientId)))
      .limit(1);

    if (!parent) {
      return c.json({ error: 'Entité parente introuvable' }, 404);
    }

    path = parent.path ? `${parent.path}/${parent.id}` : parent.id;
    level = parent.level + 1;
  }

  const [entity] = await db
    .insert(eoEntities)
    .values({
      clientId,
      name,
      ...(description !== undefined && { description }),
      ...(parent_id !== undefined && { parentId: parent_id }),
      path,
      level,
      ...(is_active !== undefined && { isActive: is_active }),
      createdBy: user.sub,
    })
    .returning();

  return c.json(toSnakeCase(entity), 201);
});

const updateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /:id — Update entity
eoRouter.patch('/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = updateEntitySchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  // Field access check for client_user persona
  if (user.persona === 'client_user') {
    const [orgModule] = await db
      .select({ id: clientModules.id })
      .from(clientModules)
      .where(and(eq(clientModules.clientId, clientId), eq(clientModules.moduleSlug, 'organisation')))
      .limit(1);

    if (orgModule) {
      const editableFields = await getEditableFieldSlugs(user.sub, orgModule.id, 'organisation');
      const requestedFields = Object.keys(body) as string[];
      for (const field of requestedFields) {
        if (!editableFields.has(field)) {
          return c.json({ error: `Champ non autorisé : ${field}` }, 403);
        }
      }
    }
  }

  const { name, description, is_active } = parsed.data;

  const [existing] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (is_active !== undefined) updates.isActive = is_active;

  const [entity] = await db
    .update(eoEntities)
    .set(updates)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .returning();

  return c.json(toSnakeCase(entity));
});

// PATCH /:id/archive — Archive entity
eoRouter.patch('/:id/archive', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [existing] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const [entity] = await db
    .update(eoEntities)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .returning();

  return c.json(toSnakeCase(entity));
});

// =============================================
// Field Definitions
// =============================================

// GET /fields — List field definitions for client
eoRouter.get('/fields', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const result = await db
    .select()
    .from(eoFieldDefinitions)
    .where(eq(eoFieldDefinitions.clientId, clientId))
    .orderBy(eoFieldDefinitions.name);

  return c.json(toSnakeCase(result));
});

const createFieldSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  field_type: z.string().min(1),
  is_required: z.boolean().optional(),
  is_unique: z.boolean().optional(),
  comment_on_change: z.string().optional(),
  list_id: z.string().uuid().optional(),
  settings: z.unknown().optional(),
});

// POST /fields — Create field definition
eoRouter.post('/fields', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.json();
  const parsed = createFieldSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description, field_type, is_required, is_unique, comment_on_change, list_id, settings } = parsed.data;

  const [field] = await db
    .insert(eoFieldDefinitions)
    .values({
      clientId,
      name,
      ...(description !== undefined && { description }),
      fieldType: field_type,
      ...(is_required !== undefined && { isRequired: is_required }),
      ...(is_unique !== undefined && { isUnique: is_unique }),
      ...(comment_on_change !== undefined && { commentOnChange: comment_on_change }),
      ...(list_id !== undefined && { listId: list_id }),
      ...(settings !== undefined && { settings }),
    })
    .returning();

  return c.json(toSnakeCase(field), 201);
});

const updateFieldSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  field_type: z.string().min(1).optional(),
  is_required: z.boolean().optional(),
  is_unique: z.boolean().optional(),
  comment_on_change: z.string().optional(),
  list_id: z.string().uuid().nullable().optional(),
  settings: z.unknown().optional(),
});

// PATCH /fields/:id — Update field definition
eoRouter.patch('/fields/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateFieldSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [existing] = await db
    .select({ id: eoFieldDefinitions.id })
    .from(eoFieldDefinitions)
    .where(and(eq(eoFieldDefinitions.id, id), eq(eoFieldDefinitions.clientId, clientId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Champ introuvable' }, 404);
  }

  const { name, description, field_type, is_required, is_unique, comment_on_change, list_id, settings } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (field_type !== undefined) updates.fieldType = field_type;
  if (is_required !== undefined) updates.isRequired = is_required;
  if (is_unique !== undefined) updates.isUnique = is_unique;
  if (comment_on_change !== undefined) updates.commentOnChange = comment_on_change;
  if (list_id !== undefined) updates.listId = list_id;
  if (settings !== undefined) updates.settings = settings;

  const [field] = await db
    .update(eoFieldDefinitions)
    .set(updates)
    .where(and(eq(eoFieldDefinitions.id, id), eq(eoFieldDefinitions.clientId, clientId)))
    .returning();

  return c.json(toSnakeCase(field));
});

// PATCH /fields/:id/deactivate — Deactivate field definition
eoRouter.patch('/fields/:id/deactivate', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [existing] = await db
    .select({ id: eoFieldDefinitions.id })
    .from(eoFieldDefinitions)
    .where(and(eq(eoFieldDefinitions.id, id), eq(eoFieldDefinitions.clientId, clientId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Champ introuvable' }, 404);
  }

  const [field] = await db
    .update(eoFieldDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(eoFieldDefinitions.id, id), eq(eoFieldDefinitions.clientId, clientId)))
    .returning();

  return c.json(toSnakeCase(field));
});

// =============================================
// Field Values
// =============================================

// GET /:id/values — List field values for an entity
eoRouter.get('/:id/values', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [entity] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!entity) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const result = await db
    .select()
    .from(eoFieldValues)
    .where(eq(eoFieldValues.eoId, id))
    .orderBy(eoFieldValues.createdAt);

  return c.json(toSnakeCase(result));
});

const upsertFieldValueSchema = z.object({
  field_definition_id: z.string().uuid(),
  value: z.unknown(),
});

// POST /:id/values — Upsert field value for an entity
eoRouter.post('/:id/values', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = upsertFieldValueSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entity] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!entity) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const { field_definition_id, value } = parsed.data;

  const [fieldDef] = await db.select({ id: eoFieldDefinitions.id }).from(eoFieldDefinitions)
    .where(and(eq(eoFieldDefinitions.id, field_definition_id), eq(eoFieldDefinitions.clientId, clientId)));
  if (!fieldDef) return c.json({ error: 'Définition de champ introuvable' }, 404);

  const [existing] = await db
    .select({ id: eoFieldValues.id })
    .from(eoFieldValues)
    .where(
      and(
        eq(eoFieldValues.eoId, id),
        eq(eoFieldValues.fieldDefinitionId, field_definition_id)
      )
    )
    .limit(1);

  let result;

  if (existing) {
    [result] = await db
      .update(eoFieldValues)
      .set({ value, updatedAt: new Date(), lastModifiedBy: user.sub })
      .where(eq(eoFieldValues.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(eoFieldValues)
      .values({
        eoId: id,
        fieldDefinitionId: field_definition_id,
        value,
        lastModifiedBy: user.sub,
      })
      .returning();
  }

  return c.json(toSnakeCase(result), existing ? 200 : 201);
});

// =============================================
// Groups
// =============================================

// GET /groups — List groups for client
eoRouter.get('/groups', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const result = await db
    .select()
    .from(eoGroups)
    .where(eq(eoGroups.clientId, clientId))
    .orderBy(eoGroups.name);

  return c.json(toSnakeCase(result));
});

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// POST /groups — Create group
eoRouter.post('/groups', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createGroupSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description } = parsed.data;

  const [group] = await db
    .insert(eoGroups)
    .values({
      clientId,
      name,
      ...(description !== undefined && { description }),
      createdBy: user.sub,
    })
    .returning();

  return c.json(toSnakeCase(group), 201);
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// PATCH /groups/:id — Update group
eoRouter.patch('/groups/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateGroupSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [existing] = await db
    .select({ id: eoGroups.id })
    .from(eoGroups)
    .where(and(eq(eoGroups.id, id), eq(eoGroups.clientId, clientId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Groupe introuvable' }, 404);
  }

  const { name, description } = parsed.data;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  const [group] = await db
    .update(eoGroups)
    .set(updates)
    .where(and(eq(eoGroups.id, id), eq(eoGroups.clientId, clientId)))
    .returning();

  return c.json(toSnakeCase(group));
});

// PATCH /groups/:id/deactivate — Deactivate group
eoRouter.patch('/groups/:id/deactivate', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [existing] = await db
    .select({ id: eoGroups.id })
    .from(eoGroups)
    .where(and(eq(eoGroups.id, id), eq(eoGroups.clientId, clientId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Groupe introuvable' }, 404);
  }

  const [group] = await db
    .update(eoGroups)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(eoGroups.id, id), eq(eoGroups.clientId, clientId)))
    .returning();

  return c.json(toSnakeCase(group));
});

// GET /groups/:id/members — List group members
eoRouter.get('/groups/:id/members', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [group] = await db
    .select({ id: eoGroups.id })
    .from(eoGroups)
    .where(and(eq(eoGroups.id, id), eq(eoGroups.clientId, clientId)))
    .limit(1);

  if (!group) {
    return c.json({ error: 'Groupe introuvable' }, 404);
  }

  const result = await db
    .select()
    .from(eoGroupMembers)
    .where(eq(eoGroupMembers.groupId, id))
    .orderBy(eoGroupMembers.createdAt);

  return c.json(toSnakeCase(result));
});

const addMemberSchema = z.object({
  eo_id: z.string().uuid(),
  include_descendants: z.boolean().optional(),
});

// POST /groups/:id/members — Add member to group
eoRouter.post('/groups/:id/members', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = addMemberSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [group] = await db
    .select({ id: eoGroups.id })
    .from(eoGroups)
    .where(and(eq(eoGroups.id, id), eq(eoGroups.clientId, clientId)))
    .limit(1);

  if (!group) {
    return c.json({ error: 'Groupe introuvable' }, 404);
  }

  const { eo_id, include_descendants } = parsed.data;

  const [eoEntity] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, eo_id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!eoEntity) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const [member] = await db
    .insert(eoGroupMembers)
    .values({
      groupId: id,
      eoId: eo_id,
      ...(include_descendants !== undefined && { includeDescendants: include_descendants }),
      createdBy: user.sub,
    })
    .returning();

  return c.json(toSnakeCase(member), 201);
});

// DELETE /groups/members/:memberId — Remove member from group
eoRouter.delete('/groups/members/:memberId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const memberId = c.req.param('memberId');

  // Verify the member belongs to a group in the current client (prevent cross-client deletion)
  const [member] = await db.select({ id: eoGroupMembers.id, clientId: eoGroups.clientId })
    .from(eoGroupMembers)
    .innerJoin(eoGroups, eq(eoGroupMembers.groupId, eoGroups.id))
    .where(and(eq(eoGroupMembers.id, memberId), eq(eoGroups.clientId, clientId)));

  if (!member) {
    return c.json({ error: 'Membre introuvable' }, 404);
  }

  await db.delete(eoGroupMembers).where(eq(eoGroupMembers.id, memberId));

  return c.json({ success: true });
});

// =============================================
// Audit
// =============================================

// GET /:id/audit — List audit log for entity
eoRouter.get('/:id/audit', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [entity] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!entity) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });
  const [{ total }] = await db.select({ total: count() }).from(eoAuditLog).where(eq(eoAuditLog.entityId, id));
  const result = await db
    .select()
    .from(eoAuditLog)
    .where(eq(eoAuditLog.entityId, id))
    .orderBy(eoAuditLog.createdAt)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(toSnakeCase(result) as any[], total, pagination));
});

// =============================================
// Comments
// =============================================

// GET /:id/comments — List field change comments for entity
eoRouter.get('/:id/comments', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [entity] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!entity) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });
  const [{ total }] = await db.select({ total: count() }).from(eoFieldChangeComments).where(eq(eoFieldChangeComments.eoId, id));
  const result = await db
    .select()
    .from(eoFieldChangeComments)
    .where(eq(eoFieldChangeComments.eoId, id))
    .orderBy(eoFieldChangeComments.createdAt)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(toSnakeCase(result) as any[], total, pagination));
});

const createCommentSchema = z.object({
  field_definition_id: z.string().uuid(),
  old_value: z.unknown().optional(),
  new_value: z.unknown().optional(),
  comment: z.string().min(1),
});

// POST /:id/comments — Add field change comment for entity
eoRouter.post('/:id/comments', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');
  const body = await c.req.json();
  const parsed = createCommentSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entity] = await db
    .select({ id: eoEntities.id })
    .from(eoEntities)
    .where(and(eq(eoEntities.id, id), eq(eoEntities.clientId, clientId)))
    .limit(1);

  if (!entity) {
    return c.json({ error: 'Entité introuvable' }, 404);
  }

  const { field_definition_id, old_value, new_value, comment } = parsed.data;

  const [entry] = await db
    .insert(eoFieldChangeComments)
    .values({
      eoId: id,
      fieldDefinitionId: field_definition_id,
      ...(old_value !== undefined && { oldValue: old_value }),
      ...(new_value !== undefined && { newValue: new_value }),
      comment,
      createdBy: user.sub,
    })
    .returning();

  return c.json(toSnakeCase(entry), 201);
});

export default eoRouter;
