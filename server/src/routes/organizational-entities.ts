import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  organizationalEntities,
  eoFieldDefinitions,
  eoFieldValues,
  eoGroups,
  eoGroupMembers,
  eoAuditLog,
  eoFieldChangeComments,
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase, toCamelCase } from '../lib/case-transform.js';

const organizationalEntitiesRouter = new Hono();

organizationalEntitiesRouter.use('*', authMiddleware);

// =============================================
// Field Definitions (static paths — must be before /:id)
// =============================================

// GET /fields?client_id=X — list eo_field_definitions for a client
organizationalEntitiesRouter.get('/fields', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(eoFieldDefinitions)
    .where(eq(eoFieldDefinitions.clientId, clientId))
    .orderBy(eoFieldDefinitions.displayOrder);

  return c.json(toSnakeCase(result));
});

const createFieldDefSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  fieldType: z.string().min(1),
  isRequired: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  settings: z.any().optional(),
});

// POST /fields — create field definition
organizationalEntitiesRouter.post('/fields', async (c) => {
  const body = toCamelCase(await c.req.json());
  const parsed = createFieldDefSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [field] = await db
    .insert(eoFieldDefinitions)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(field), 201);
});

const updateFieldDefSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  fieldType: z.string().min(1).optional(),
  isRequired: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  isSystem: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  settings: z.any().optional(),
});

// PATCH /fields/:id — update field definition
organizationalEntitiesRouter.patch('/fields/:id', async (c) => {
  const id = c.req.param('id');
  const body = toCamelCase(await c.req.json());
  const parsed = updateFieldDefSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [field] = await db
    .update(eoFieldDefinitions)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(eoFieldDefinitions.id, id))
    .returning();

  if (!field) {
    return c.json({ error: 'Définition de champ introuvable' }, 404);
  }

  return c.json(toSnakeCase(field));
});

// DELETE /fields/:id — soft delete field (is_active=false)
organizationalEntitiesRouter.delete('/fields/:id', async (c) => {
  const id = c.req.param('id');

  const [field] = await db
    .update(eoFieldDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(eoFieldDefinitions.id, id))
    .returning();

  if (!field) {
    return c.json({ error: 'Définition de champ introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Field Values (static path — must be before /:id)
// =============================================

const upsertFieldValueSchema = z.object({
  eoId: z.string().uuid(),
  fieldDefinitionId: z.string().uuid(),
  value: z.string().nullable().optional(),
  lastModifiedBy: z.string().uuid().optional(),
});

// POST /values — upsert field value (eo_id + field_definition_id + value)
organizationalEntitiesRouter.post('/values', async (c) => {
  const body = toCamelCase(await c.req.json());
  const parsed = upsertFieldValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { eoId, fieldDefinitionId, value, lastModifiedBy } = parsed.data;

  // Check if a value already exists for this eo + field combo
  const [existing] = await db
    .select()
    .from(eoFieldValues)
    .where(
      and(
        eq(eoFieldValues.eoId, eoId),
        eq(eoFieldValues.fieldDefinitionId, fieldDefinitionId),
      ),
    );

  if (existing) {
    const [updated] = await db
      .update(eoFieldValues)
      .set({
        value,
        lastModifiedBy,
        updatedAt: new Date(),
      })
      .where(eq(eoFieldValues.id, existing.id))
      .returning();

    return c.json(toSnakeCase(updated));
  }

  const [created] = await db
    .insert(eoFieldValues)
    .values({ eoId, fieldDefinitionId, value, lastModifiedBy })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

// =============================================
// Groups (static paths — must be before /:id)
// =============================================

// GET /groups?client_id=X — list eo_groups
organizationalEntitiesRouter.get('/groups', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(eoGroups)
    .where(eq(eoGroups.clientId, clientId))
    .orderBy(eoGroups.name);

  return c.json(toSnakeCase(result));
});

const createGroupSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// POST /groups — create group
organizationalEntitiesRouter.post('/groups', async (c) => {
  const body = toCamelCase(await c.req.json());
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [group] = await db
    .insert(eoGroups)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(group), 201);
});

// DELETE /groups/members/:id — remove member (must be before /groups/:id)
organizationalEntitiesRouter.delete('/groups/members/:id', async (c) => {
  const id = c.req.param('id');

  const [member] = await db
    .delete(eoGroupMembers)
    .where(eq(eoGroupMembers.id, id))
    .returning();

  if (!member) {
    return c.json({ error: 'Membre introuvable' }, 404);
  }

  return c.json({ success: true });
});

// DELETE /groups/:id — delete group
organizationalEntitiesRouter.delete('/groups/:id', async (c) => {
  const id = c.req.param('id');

  const [group] = await db
    .delete(eoGroups)
    .where(eq(eoGroups.id, id))
    .returning();

  if (!group) {
    return c.json({ error: 'Groupe introuvable' }, 404);
  }

  return c.json({ success: true });
});

// GET /groups/:id/members — list group members
organizationalEntitiesRouter.get('/groups/:id/members', async (c) => {
  const groupId = c.req.param('id');

  const result = await db
    .select()
    .from(eoGroupMembers)
    .where(eq(eoGroupMembers.groupId, groupId));

  return c.json(toSnakeCase(result));
});

const addMemberSchema = z.object({
  eoId: z.string().uuid(),
  includeDescendants: z.boolean().optional(),
});

// POST /groups/:id/members — add member
organizationalEntitiesRouter.post('/groups/:id/members', async (c) => {
  const groupId = c.req.param('id');
  const body = toCamelCase(await c.req.json());
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [member] = await db
    .insert(eoGroupMembers)
    .values({
      groupId,
      eoId: parsed.data.eoId,
      includeDescendants: parsed.data.includeDescendants,
    })
    .returning();

  return c.json(toSnakeCase(member), 201);
});

// =============================================
// Audit Log (static paths — must be before /:id)
// =============================================

// GET /audit?client_id=X — list all audit entries for a client
organizationalEntitiesRouter.get('/audit', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select({
      id: eoAuditLog.id,
      entityId: eoAuditLog.entityId,
      action: eoAuditLog.action,
      changedBy: eoAuditLog.changedBy,
      changedFields: eoAuditLog.changedFields,
      previousValues: eoAuditLog.previousValues,
      newValues: eoAuditLog.newValues,
      createdAt: eoAuditLog.createdAt,
    })
    .from(eoAuditLog)
    .innerJoin(organizationalEntities, eq(eoAuditLog.entityId, organizationalEntities.id))
    .where(eq(organizationalEntities.clientId, clientId))
    .orderBy(eoAuditLog.createdAt);

  return c.json(toSnakeCase(result));
});

const createAuditSchema = z.object({
  entityId: z.string().uuid(),
  action: z.string().min(1),
  changedBy: z.string().uuid().optional(),
  changedFields: z.any().optional(),
  previousValues: z.any().optional(),
  newValues: z.any().optional(),
});

// POST /audit — create audit entry
organizationalEntitiesRouter.post('/audit', async (c) => {
  const body = toCamelCase(await c.req.json());
  const parsed = createAuditSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entry] = await db
    .insert(eoAuditLog)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(entry), 201);
});

// =============================================
// Field Change Comments (static path — must be before /:id)
// =============================================

const createCommentSchema = z.object({
  eoId: z.string().uuid(),
  fieldDefinitionId: z.string().uuid(),
  oldValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  createdBy: z.string().uuid().optional(),
});

// POST /comments — create comment
organizationalEntitiesRouter.post('/comments', async (c) => {
  const body = toCamelCase(await c.req.json());
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [comment] = await db
    .insert(eoFieldChangeComments)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(comment), 201);
});

// =============================================
// Organizational Entities (CRUD — parameterized routes last)
// =============================================

// GET / ?client_id=X — list all entities for a client, ordered by name
organizationalEntitiesRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(organizationalEntities)
    .where(eq(organizationalEntities.clientId, clientId))
    .orderBy(organizationalEntities.name);

  return c.json(toSnakeCase(result));
});

// GET /:id — single entity
organizationalEntitiesRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [entity] = await db
    .select()
    .from(organizationalEntities)
    .where(eq(organizationalEntities.id, id));

  if (!entity) {
    return c.json({ error: 'Entité organisationnelle introuvable' }, 404);
  }

  return c.json(toSnakeCase(entity));
});

const createEntitySchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  path: z.string().optional(),
  level: z.number().int().optional(),
  slug: z.string().min(1),
  isActive: z.boolean().optional(),
});

// POST / — create entity
organizationalEntitiesRouter.post('/', async (c) => {
  const body = toCamelCase(await c.req.json());
  const parsed = createEntitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entity] = await db
    .insert(organizationalEntities)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(entity), 201);
});

const updateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  path: z.string().optional(),
  level: z.number().int().optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

// PATCH /:id — update entity
organizationalEntitiesRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = toCamelCase(await c.req.json());
  const parsed = updateEntitySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entity] = await db
    .update(organizationalEntities)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(organizationalEntities.id, id))
    .returning();

  if (!entity) {
    return c.json({ error: 'Entité organisationnelle introuvable' }, 404);
  }

  return c.json(toSnakeCase(entity));
});

// DELETE /:id — soft delete (set is_archived=true)
organizationalEntitiesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [entity] = await db
    .update(organizationalEntities)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(organizationalEntities.id, id))
    .returning();

  if (!entity) {
    return c.json({ error: 'Entité organisationnelle introuvable' }, 404);
  }

  return c.json({ success: true });
});

// GET /:id/values — list eo_field_values for an entity
organizationalEntitiesRouter.get('/:id/values', async (c) => {
  const eoId = c.req.param('id');

  const result = await db
    .select()
    .from(eoFieldValues)
    .where(eq(eoFieldValues.eoId, eoId));

  return c.json(toSnakeCase(result));
});

// GET /:id/audit — list audit log entries for an entity
organizationalEntitiesRouter.get('/:id/audit', async (c) => {
  const entityId = c.req.param('id');

  const result = await db
    .select()
    .from(eoAuditLog)
    .where(eq(eoAuditLog.entityId, entityId))
    .orderBy(eoAuditLog.createdAt);

  return c.json(toSnakeCase(result));
});

// GET /:id/comments — list field change comments for an entity
organizationalEntitiesRouter.get('/:id/comments', async (c) => {
  const eoId = c.req.param('id');

  const result = await db
    .select()
    .from(eoFieldChangeComments)
    .where(eq(eoFieldChangeComments.eoId, eoId))
    .orderBy(eoFieldChangeComments.createdAt);

  return c.json(toSnakeCase(result));
});

// POST /organizational-entities/field-values/bulk — bulk query eo_field_values by field_definition_id + eo_ids
const bulkFieldValuesSchema = z.object({
  field_definition_id: z.string().uuid(),
  eo_ids: z.array(z.string().uuid()).min(1),
});

organizationalEntitiesRouter.post('/field-values/bulk', async (c) => {
  const body = await c.req.json();
  const parsed = bulkFieldValuesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const result = await db
    .select()
    .from(eoFieldValues)
    .where(
      and(
        eq(eoFieldValues.fieldDefinitionId, parsed.data.field_definition_id),
        inArray(eoFieldValues.eoId, parsed.data.eo_ids),
      )
    );

  return c.json(toSnakeCase(result));
});

export default organizationalEntitiesRouter;
