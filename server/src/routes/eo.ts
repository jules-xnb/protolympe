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
  eoExportHistory,
  clientModules,
} from '../db/schema.js';
import { generateCsv, parseCsv } from '../lib/csv.js';
import { eq, and, count, isNull } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { requireClientAccess } from '../middleware/client-access.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { getEditableFieldSlugs } from '../lib/field-access.js';
import type { JwtPayload } from '../lib/jwt.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';
import { logAdminAction } from '../lib/audit.js';

type Env = { Variables: { user: JwtPayload } };

const router = new Hono<Env>();

router.use('*', authMiddleware);
router.use('*', requireClientAccess());

// =============================================
// Entities
// =============================================

// GET / — List entities for a client
router.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const pagination = parsePaginationParams({ page: c.req.query('page'), per_page: c.req.query('per_page') });

  const baseWhere = and(eq(eoEntities.clientId, clientId), eq(eoEntities.isArchived, false));
  const [{ total }] = await db.select({ total: count() }).from(eoEntities).where(baseWhere);
  const result = await db
    .select()
    .from(eoEntities)
    .where(baseWhere)
    .orderBy(eoEntities.path, eoEntities.name)
    .limit(pagination.perPage).offset((pagination.page - 1) * pagination.perPage);

  return c.json(paginatedResponse(toSnakeCase(result) as any[], total, pagination));
});

// GET /export — Export entities as CSV
router.get('/export', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const entities = await db.select({
    id: eoEntities.id,
    name: eoEntities.name,
    description: eoEntities.description,
    parent_id: eoEntities.parentId,
    is_active: eoEntities.isActive,
    is_archived: eoEntities.isArchived,
    created_at: eoEntities.createdAt,
  }).from(eoEntities)
    .where(eq(eoEntities.clientId, clientId))
    .orderBy(eoEntities.name);

  // Log export
  const user = c.get('user');
  await db.insert(eoExportHistory).values({
    clientId,
    exportedBy: user.sub,
    rowCount: entities.length,
    fileName: `eo_export_${new Date().toISOString().split('T')[0]}.csv`,
  });

  const csv = generateCsv(
    ['id', 'name', 'description', 'parent_id', 'is_active', 'is_archived', 'created_at'],
    entities
  );

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="eo_export.csv"`);
  return c.body(csv);
});

// POST /import — Import entities from CSV
router.post('/import', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.text();
  const { rows } = parseCsv(body);

  const imported: string[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      if (!row.name) {
        errors.push({ row: i + 2, error: 'Nom requis' });
        continue;
      }
      const [entity] = await db.insert(eoEntities).values({
        clientId,
        name: row.name,
        description: row.description || null,
        parentId: row.parent_id || null,
        path: '',
        level: 0,
        createdBy: c.get('user').sub,
      }).returning();
      imported.push(entity.id);
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', event: 'eo.import.row_failure', row: i + 2, error: err instanceof Error ? err.message : 'Unknown error' }));
      errors.push({ row: i + 2, error: 'Erreur lors de l\'import de cette ligne' });
    }
  }

  return c.json({ imported: imported.length, errors });
});

// GET /:id — Entity detail
router.get('/:id', async (c) => {
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
router.post('/', async (c) => {
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

  await logAdminAction(user.sub, 'eo.entity.create', 'eo_entity', entity.id, { client_id: clientId, name });

  return c.json(toSnakeCase(entity), 201);
});

const updateEntitySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /:id — Update entity
router.patch('/:id', async (c) => {
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

  await logAdminAction(user.sub, 'eo.entity.update', 'eo_entity', id, { client_id: clientId, ...parsed.data });

  return c.json(toSnakeCase(entity));
});

// PATCH /:id/archive — Archive entity
router.patch('/:id/archive', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');

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

  await logAdminAction(user.sub, 'eo.entity.archive', 'eo_entity', id, { client_id: clientId });

  return c.json(toSnakeCase(entity));
});

// =============================================
// Field Definitions
// =============================================

// GET /fields — List field definitions for client
router.get('/fields', async (c) => {
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
router.post('/fields', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const user = c.get('user');
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

  await logAdminAction(user.sub, 'eo.field.create', 'eo_field_definition', field.id, { client_id: clientId, name });

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
router.patch('/fields/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');
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

  await logAdminAction(user.sub, 'eo.field.update', 'eo_field_definition', id, { client_id: clientId, ...parsed.data });

  return c.json(toSnakeCase(field));
});

// PATCH /fields/:id/deactivate — Deactivate field definition
router.patch('/fields/:id/deactivate', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');

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

  await logAdminAction(user.sub, 'eo.field.deactivate', 'eo_field_definition', id, { client_id: clientId });

  return c.json(toSnakeCase(field));
});

// =============================================
// Field Values
// =============================================

// GET /:id/values — List field values for an entity
router.get('/:id/values', async (c) => {
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
router.post('/:id/values', async (c) => {
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
router.get('/groups', async (c) => {
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
router.post('/groups', async (c) => {
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

  await logAdminAction(user.sub, 'eo.group.create', 'eo_group', group.id, { client_id: clientId, name });

  return c.json(toSnakeCase(group), 201);
});

const updateGroupSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

// PATCH /groups/:id — Update group
router.patch('/groups/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');
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

  await logAdminAction(user.sub, 'eo.group.update', 'eo_group', id, { client_id: clientId, ...parsed.data });

  return c.json(toSnakeCase(group));
});

// PATCH /groups/:id/deactivate — Deactivate group
router.patch('/groups/:id/deactivate', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const user = c.get('user');

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

  await logAdminAction(user.sub, 'eo.group.deactivate', 'eo_group', id, { client_id: clientId });

  return c.json(toSnakeCase(group));
});

// GET /groups/:id/members — List group members
router.get('/groups/:id/members', async (c) => {
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
    .where(and(eq(eoGroupMembers.groupId, id), isNull(eoGroupMembers.deletedAt)))
    .orderBy(eoGroupMembers.createdAt);

  return c.json(toSnakeCase(result));
});

const addMemberSchema = z.object({
  eo_id: z.string().uuid(),
  include_descendants: z.boolean().optional(),
});

// POST /groups/:id/members — Add member to group
router.post('/groups/:id/members', async (c) => {
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
router.delete('/groups/members/:memberId', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const memberId = c.req.param('memberId');

  // Verify the member belongs to a group in the current client (prevent cross-client deletion)
  const [member] = await db.select({ id: eoGroupMembers.id, clientId: eoGroups.clientId })
    .from(eoGroupMembers)
    .innerJoin(eoGroups, eq(eoGroupMembers.groupId, eoGroups.id))
    .where(and(eq(eoGroupMembers.id, memberId), eq(eoGroups.clientId, clientId), isNull(eoGroupMembers.deletedAt)));

  if (!member) {
    return c.json({ error: 'Membre introuvable' }, 404);
  }

  await db.update(eoGroupMembers).set({ deletedAt: new Date() }).where(eq(eoGroupMembers.id, memberId));

  return c.json({ success: true });
});

// =============================================
// Audit
// =============================================

// GET /:id/audit — List audit log for entity
router.get('/:id/audit', async (c) => {
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
router.get('/:id/comments', async (c) => {
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
router.post('/:id/comments', async (c) => {
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

export default router;
