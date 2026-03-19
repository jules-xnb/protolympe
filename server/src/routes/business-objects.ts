import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  businessObjectDefinitions,
  fieldDefinitions,
  businessObjects,
  objectFieldValues,
  boDocuments,
  boFieldValueAuditLog,
} from '../db/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const businessObjectsRouter = new Hono();

businessObjectsRouter.use('*', authMiddleware);

// =============================================
// Business Object Definitions
// =============================================

// GET /business-objects/definitions?client_id=X
businessObjectsRouter.get('/definitions', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const defs = await db
    .select()
    .from(businessObjectDefinitions)
    .where(
      and(
        eq(businessObjectDefinitions.clientId, clientId),
        eq(businessObjectDefinitions.isActive, true),
      )
    )
    .orderBy(businessObjectDefinitions.name);

  return c.json(toSnakeCase(defs));
});

// GET /business-objects/definitions/:id
businessObjectsRouter.get('/definitions/:id', async (c) => {
  const id = c.req.param('id');

  const [def] = await db
    .select()
    .from(businessObjectDefinitions)
    .where(eq(businessObjectDefinitions.id, id));

  if (!def) {
    return c.json({ error: 'Définition introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

const createDefSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  settings: z.any().optional(),
  client_id: z.string().uuid(),
});

// POST /business-objects/definitions
businessObjectsRouter.post('/definitions', async (c) => {
  const body = await c.req.json();
  const parsed = createDefSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { client_id, ...rest } = parsed.data;

  const [def] = await db
    .insert(businessObjectDefinitions)
    .values({
      ...rest,
      clientId: client_id,
    })
    .returning();

  return c.json(toSnakeCase(def), 201);
});

const updateDefSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  settings: z.any().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /business-objects/definitions/:id
businessObjectsRouter.patch('/definitions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateDefSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { is_active, ...rest } = parsed.data;

  const [def] = await db
    .update(businessObjectDefinitions)
    .set({
      ...rest,
      ...(is_active !== undefined && { isActive: is_active }),
      updatedAt: new Date(),
    })
    .where(eq(businessObjectDefinitions.id, id))
    .returning();

  if (!def) {
    return c.json({ error: 'Définition introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

// DELETE /business-objects/definitions/:id — soft delete
businessObjectsRouter.delete('/definitions/:id', async (c) => {
  const id = c.req.param('id');

  const [def] = await db
    .update(businessObjectDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(businessObjectDefinitions.id, id))
    .returning();

  if (!def) {
    return c.json({ error: 'Définition introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Field Definitions
// =============================================

// GET /business-objects/definitions/:defId/fields
businessObjectsRouter.get('/definitions/:defId/fields', async (c) => {
  const defId = c.req.param('defId');

  const fields = await db
    .select()
    .from(fieldDefinitions)
    .where(eq(fieldDefinitions.boDefinitionId, defId))
    .orderBy(fieldDefinitions.displayOrder);

  return c.json(toSnakeCase(fields));
});

const createFieldSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  field_type: z.string().min(1),
  is_required: z.boolean().optional(),
  is_unique: z.boolean().optional(),
  is_system: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  display_order: z.number().optional(),
  parent_field_id: z.string().uuid().nullable().optional(),
  settings: z.any().optional(),
});

// POST /business-objects/definitions/:defId/fields
businessObjectsRouter.post('/definitions/:defId/fields', async (c) => {
  const defId = c.req.param('defId');
  const body = await c.req.json();
  const parsed = createFieldSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { field_type, is_required, is_unique, is_system, is_hidden, display_order, parent_field_id, ...rest } = parsed.data;

  const [field] = await db
    .insert(fieldDefinitions)
    .values({
      ...rest,
      boDefinitionId: defId,
      fieldType: field_type,
      ...(is_required !== undefined && { isRequired: is_required }),
      ...(is_unique !== undefined && { isUnique: is_unique }),
      ...(is_system !== undefined && { isSystem: is_system }),
      ...(is_hidden !== undefined && { isHidden: is_hidden }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(parent_field_id !== undefined && { parentFieldId: parent_field_id }),
    })
    .returning();

  return c.json(toSnakeCase(field), 201);
});

const updateFieldSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  field_type: z.string().optional(),
  is_required: z.boolean().optional(),
  is_unique: z.boolean().optional(),
  is_system: z.boolean().optional(),
  is_hidden: z.boolean().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().optional(),
  parent_field_id: z.string().uuid().nullable().optional(),
  settings: z.any().optional(),
});

// PATCH /business-objects/fields/:id
businessObjectsRouter.patch('/fields/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateFieldSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { field_type, is_required, is_unique, is_system, is_hidden, is_active, display_order, parent_field_id, ...rest } = parsed.data;

  const [field] = await db
    .update(fieldDefinitions)
    .set({
      ...rest,
      ...(field_type !== undefined && { fieldType: field_type }),
      ...(is_required !== undefined && { isRequired: is_required }),
      ...(is_unique !== undefined && { isUnique: is_unique }),
      ...(is_system !== undefined && { isSystem: is_system }),
      ...(is_hidden !== undefined && { isHidden: is_hidden }),
      ...(is_active !== undefined && { isActive: is_active }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(parent_field_id !== undefined && { parentFieldId: parent_field_id }),
      updatedAt: new Date(),
    })
    .where(eq(fieldDefinitions.id, id))
    .returning();

  if (!field) {
    return c.json({ error: 'Champ introuvable' }, 404);
  }

  return c.json(toSnakeCase(field));
});

// DELETE /business-objects/fields/:id — soft delete
businessObjectsRouter.delete('/fields/:id', async (c) => {
  const id = c.req.param('id');

  const [field] = await db
    .update(fieldDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(fieldDefinitions.id, id))
    .returning();

  if (!field) {
    return c.json({ error: 'Champ introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Business Objects (instances)
// =============================================

// GET /business-objects/?definition_id=X&page=N&page_size=M
businessObjectsRouter.get('/', async (c) => {
  const definitionId = c.req.query('definition_id');
  if (!definitionId) {
    return c.json({ error: 'Le paramètre definition_id est requis' }, 400);
  }

  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query('page_size')) || 25));
  const offset = (page - 1) * pageSize;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(businessObjects)
    .where(
      and(
        eq(businessObjects.definitionId, definitionId),
        eq(businessObjects.isArchived, false),
      )
    );

  const items = await db
    .select()
    .from(businessObjects)
    .where(
      and(
        eq(businessObjects.definitionId, definitionId),
        eq(businessObjects.isArchived, false),
      )
    )
    .orderBy(businessObjects.createdAt)
    .limit(pageSize)
    .offset(offset);

  return c.json({
    data: toSnakeCase(items),
    pagination: {
      page,
      page_size: pageSize,
      total: Number(countResult.count),
      total_pages: Math.ceil(Number(countResult.count) / pageSize),
    },
  });
});

// GET /business-objects/:id
businessObjectsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [bo] = await db
    .select()
    .from(businessObjects)
    .where(eq(businessObjects.id, id));

  if (!bo) {
    return c.json({ error: 'Objet métier introuvable' }, 404);
  }

  return c.json(toSnakeCase(bo));
});

const createBoSchema = z.object({
  definition_id: z.string().uuid(),
  reference: z.string().min(1),
  status: z.string().nullable().optional(),
  workflow_id: z.string().uuid().nullable().optional(),
  current_node_id: z.string().uuid().nullable().optional(),
  eo_id: z.string().uuid().nullable().optional(),
  created_by_user_id: z.string().uuid(),
});

// POST /business-objects/
businessObjectsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createBoSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { definition_id, created_by_user_id, workflow_id, current_node_id, eo_id, ...rest } = parsed.data;

  const [bo] = await db
    .insert(businessObjects)
    .values({
      ...rest,
      definitionId: definition_id,
      createdByUserId: created_by_user_id,
      ...(workflow_id !== undefined && { workflowId: workflow_id }),
      ...(current_node_id !== undefined && { currentNodeId: current_node_id }),
      ...(eo_id !== undefined && { eoId: eo_id }),
    })
    .returning();

  return c.json(toSnakeCase(bo), 201);
});

const updateBoSchema = z.object({
  reference: z.string().min(1).optional(),
  status: z.string().nullable().optional(),
  workflow_id: z.string().uuid().nullable().optional(),
  current_node_id: z.string().uuid().nullable().optional(),
  eo_id: z.string().uuid().nullable().optional(),
});

// PATCH /business-objects/:id
businessObjectsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateBoSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { workflow_id, current_node_id, eo_id, ...rest } = parsed.data;

  const [bo] = await db
    .update(businessObjects)
    .set({
      ...rest,
      ...(workflow_id !== undefined && { workflowId: workflow_id }),
      ...(current_node_id !== undefined && { currentNodeId: current_node_id }),
      ...(eo_id !== undefined && { eoId: eo_id }),
      updatedAt: new Date(),
    })
    .where(eq(businessObjects.id, id))
    .returning();

  if (!bo) {
    return c.json({ error: 'Objet métier introuvable' }, 404);
  }

  return c.json(toSnakeCase(bo));
});

// DELETE /business-objects/:id — soft delete (is_archived=true)
businessObjectsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [bo] = await db
    .update(businessObjects)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(businessObjects.id, id))
    .returning();

  if (!bo) {
    return c.json({ error: 'Objet métier introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Object Field Values
// =============================================

// GET /business-objects/:id/values
businessObjectsRouter.get('/:id/values', async (c) => {
  const boId = c.req.param('id');

  const values = await db
    .select()
    .from(objectFieldValues)
    .where(eq(objectFieldValues.businessObjectId, boId))
    .orderBy(objectFieldValues.createdAt);

  return c.json(toSnakeCase(values));
});

const upsertValueSchema = z.object({
  business_object_id: z.string().uuid(),
  field_definition_id: z.string().uuid(),
  value: z.string().nullable().optional(),
  last_modified_by: z.string().uuid().nullable().optional(),
});

// POST /business-objects/values — upsert field value
businessObjectsRouter.post('/values', async (c) => {
  const body = await c.req.json();
  const parsed = upsertValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { business_object_id, field_definition_id, value, last_modified_by } = parsed.data;

  const [existing] = await db
    .select()
    .from(objectFieldValues)
    .where(
      and(
        eq(objectFieldValues.businessObjectId, business_object_id),
        eq(objectFieldValues.fieldDefinitionId, field_definition_id),
      )
    );

  let result;
  if (existing) {
    [result] = await db
      .update(objectFieldValues)
      .set({
        value: value ?? null,
        ...(last_modified_by !== undefined && { lastModifiedBy: last_modified_by }),
        updatedAt: new Date(),
      })
      .where(eq(objectFieldValues.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(objectFieldValues)
      .values({
        businessObjectId: business_object_id,
        fieldDefinitionId: field_definition_id,
        value: value ?? null,
        ...(last_modified_by !== undefined && { lastModifiedBy: last_modified_by }),
      })
      .returning();
  }

  return c.json(toSnakeCase(result), existing ? 200 : 201);
});

// =============================================
// BO Documents
// =============================================

// GET /business-objects/:id/documents
businessObjectsRouter.get('/:id/documents', async (c) => {
  const boId = c.req.param('id');

  const docs = await db
    .select()
    .from(boDocuments)
    .where(eq(boDocuments.businessObjectId, boId))
    .orderBy(boDocuments.displayOrder);

  return c.json(toSnakeCase(docs));
});

const createDocSchema = z.object({
  business_object_id: z.string().uuid(),
  field_definition_id: z.string().uuid(),
  file_name: z.string().min(1),
  file_path: z.string().min(1),
  file_size: z.number().optional(),
  mime_type: z.string().nullable().optional(),
  display_order: z.number().optional(),
  uploaded_by: z.string().uuid().nullable().optional(),
});

// POST /business-objects/documents
businessObjectsRouter.post('/documents', async (c) => {
  const body = await c.req.json();
  const parsed = createDocSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { business_object_id, field_definition_id, file_name, file_path, file_size, mime_type, display_order, uploaded_by } = parsed.data;

  const [doc] = await db
    .insert(boDocuments)
    .values({
      businessObjectId: business_object_id,
      fieldDefinitionId: field_definition_id,
      fileName: file_name,
      filePath: file_path,
      ...(file_size !== undefined && { fileSize: file_size }),
      ...(mime_type !== undefined && { mimeType: mime_type }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(uploaded_by !== undefined && { uploadedBy: uploaded_by }),
    })
    .returning();

  return c.json(toSnakeCase(doc), 201);
});

// DELETE /business-objects/documents/:id
businessObjectsRouter.delete('/documents/:id', async (c) => {
  const id = c.req.param('id');

  const [doc] = await db
    .delete(boDocuments)
    .where(eq(boDocuments.id, id))
    .returning();

  if (!doc) {
    return c.json({ error: 'Document introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Audit Log
// =============================================

// GET /business-objects/:id/audit
businessObjectsRouter.get('/:id/audit', async (c) => {
  const boId = c.req.param('id');

  const entries = await db
    .select()
    .from(boFieldValueAuditLog)
    .where(eq(boFieldValueAuditLog.businessObjectId, boId))
    .orderBy(boFieldValueAuditLog.changedAt);

  return c.json(toSnakeCase(entries));
});

const createAuditSchema = z.object({
  business_object_id: z.string().uuid(),
  field_definition_id: z.string().uuid().nullable().optional(),
  field_name: z.string().nullable().optional(),
  old_value: z.string().nullable().optional(),
  new_value: z.string().nullable().optional(),
  changed_by: z.string().uuid().nullable().optional(),
});

// POST /business-objects/audit
businessObjectsRouter.post('/audit', async (c) => {
  const body = await c.req.json();
  const parsed = createAuditSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { business_object_id, field_definition_id, field_name, old_value, new_value, changed_by } = parsed.data;

  const [entry] = await db
    .insert(boFieldValueAuditLog)
    .values({
      businessObjectId: business_object_id,
      ...(field_definition_id !== undefined && { fieldDefinitionId: field_definition_id }),
      ...(field_name !== undefined && { fieldName: field_name }),
      ...(old_value !== undefined && { oldValue: old_value }),
      ...(new_value !== undefined && { newValue: new_value }),
      ...(changed_by !== undefined && { changedBy: changed_by }),
    })
    .returning();

  return c.json(toSnakeCase(entry), 201);
});

// POST /business-objects/field-values/bulk — bulk query object_field_values by field_definition_id + business_object_ids
const bulkObjFieldValuesSchema = z.object({
  field_definition_id: z.string().uuid(),
  business_object_ids: z.array(z.string().uuid()).min(1),
});

businessObjectsRouter.post('/field-values/bulk', async (c) => {
  const body = await c.req.json();
  const parsed = bulkObjFieldValuesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const result = await db
    .select()
    .from(objectFieldValues)
    .where(
      and(
        eq(objectFieldValues.fieldDefinitionId, parsed.data.field_definition_id),
        inArray(objectFieldValues.businessObjectId, parsed.data.business_object_ids),
      )
    );

  return c.json(toSnakeCase(result));
});

export default businessObjectsRouter;
