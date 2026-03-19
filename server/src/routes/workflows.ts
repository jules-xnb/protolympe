import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  workflows,
  workflowNodes,
  workflowTransitions,
  nodeFields,
  nodeSections,
  nodeRolePermissions,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const workflowsRouter = new Hono();

workflowsRouter.use('*', authMiddleware);

// =============================================
// Workflows
// =============================================

// GET /workflows/?client_id=X
workflowsRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.clientId, clientId),
        eq(workflows.isArchived, false),
      )
    )
    .orderBy(workflows.name);

  return c.json(toSnakeCase(result));
});

// GET /workflows/:id — single workflow with nodes and transitions
workflowsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [wf] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, id));

  if (!wf) {
    return c.json({ error: 'Workflow introuvable' }, 404);
  }

  const nodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, id))
    .orderBy(workflowNodes.displayOrder);

  const transitions = await db
    .select()
    .from(workflowTransitions)
    .where(eq(workflowTransitions.workflowId, id))
    .orderBy(workflowTransitions.displayOrder);

  return c.json({
    ...toSnakeCase(wf),
    nodes: toSnakeCase(nodes),
    transitions: toSnakeCase(transitions),
  });
});

const createWfSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  bo_definition_id: z.string().uuid().nullable().optional(),
});

// POST /workflows/
workflowsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createWfSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { client_id, bo_definition_id, ...rest } = parsed.data;

  const [wf] = await db
    .insert(workflows)
    .values({
      ...rest,
      clientId: client_id,
      ...(bo_definition_id !== undefined && { boDefinitionId: bo_definition_id }),
    })
    .returning();

  return c.json(toSnakeCase(wf), 201);
});

const updateWfSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  bo_definition_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /workflows/:id
workflowsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateWfSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { is_active, bo_definition_id, ...rest } = parsed.data;

  const [wf] = await db
    .update(workflows)
    .set({
      ...rest,
      ...(is_active !== undefined && { isActive: is_active }),
      ...(bo_definition_id !== undefined && { boDefinitionId: bo_definition_id }),
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, id))
    .returning();

  if (!wf) {
    return c.json({ error: 'Workflow introuvable' }, 404);
  }

  return c.json(toSnakeCase(wf));
});

// DELETE /workflows/:id — soft delete (is_archived=true)
workflowsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [wf] = await db
    .update(workflows)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(workflows.id, id))
    .returning();

  if (!wf) {
    return c.json({ error: 'Workflow introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Workflow Nodes
// =============================================

// GET /workflows/:id/nodes
workflowsRouter.get('/:id/nodes', async (c) => {
  const workflowId = c.req.param('id');

  const nodes = await db
    .select()
    .from(workflowNodes)
    .where(eq(workflowNodes.workflowId, workflowId))
    .orderBy(workflowNodes.displayOrder);

  return c.json(toSnakeCase(nodes));
});

const createNodeSchema = z.object({
  workflow_id: z.string().uuid(),
  name: z.string().min(1),
  node_type: z.string().min(1),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  display_order: z.number().optional(),
  config: z.any().optional(),
});

// POST /workflows/nodes
workflowsRouter.post('/nodes', async (c) => {
  const body = await c.req.json();
  const parsed = createNodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { workflow_id, node_type, position_x, position_y, display_order, ...rest } = parsed.data;

  const [node] = await db
    .insert(workflowNodes)
    .values({
      ...rest,
      workflowId: workflow_id,
      nodeType: node_type,
      ...(position_x !== undefined && { positionX: position_x }),
      ...(position_y !== undefined && { positionY: position_y }),
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .returning();

  return c.json(toSnakeCase(node), 201);
});

const updateNodeSchema = z.object({
  name: z.string().min(1).optional(),
  node_type: z.string().optional(),
  position_x: z.number().optional(),
  position_y: z.number().optional(),
  display_order: z.number().optional(),
  config: z.any().optional(),
});

// PATCH /workflows/nodes/:id
workflowsRouter.patch('/nodes/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateNodeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { node_type, position_x, position_y, display_order, ...rest } = parsed.data;

  const [node] = await db
    .update(workflowNodes)
    .set({
      ...rest,
      ...(node_type !== undefined && { nodeType: node_type }),
      ...(position_x !== undefined && { positionX: position_x }),
      ...(position_y !== undefined && { positionY: position_y }),
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .where(eq(workflowNodes.id, id))
    .returning();

  if (!node) {
    return c.json({ error: 'Noeud introuvable' }, 404);
  }

  return c.json(toSnakeCase(node));
});

// DELETE /workflows/nodes/:id
workflowsRouter.delete('/nodes/:id', async (c) => {
  const id = c.req.param('id');

  const [node] = await db
    .delete(workflowNodes)
    .where(eq(workflowNodes.id, id))
    .returning();

  if (!node) {
    return c.json({ error: 'Noeud introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Workflow Transitions
// =============================================

// GET /workflows/:id/transitions
workflowsRouter.get('/:id/transitions', async (c) => {
  const workflowId = c.req.param('id');

  const trans = await db
    .select()
    .from(workflowTransitions)
    .where(eq(workflowTransitions.workflowId, workflowId))
    .orderBy(workflowTransitions.displayOrder);

  return c.json(toSnakeCase(trans));
});

const createTransitionSchema = z.object({
  workflow_id: z.string().uuid(),
  from_node_id: z.string().uuid(),
  to_node_id: z.string().uuid(),
  label: z.string().nullable().optional(),
  condition: z.any().optional(),
  display_order: z.number().optional(),
});

// POST /workflows/transitions
workflowsRouter.post('/transitions', async (c) => {
  const body = await c.req.json();
  const parsed = createTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { workflow_id, from_node_id, to_node_id, display_order, ...rest } = parsed.data;

  const [trans] = await db
    .insert(workflowTransitions)
    .values({
      ...rest,
      workflowId: workflow_id,
      fromNodeId: from_node_id,
      toNodeId: to_node_id,
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .returning();

  return c.json(toSnakeCase(trans), 201);
});

const updateTransitionSchema = z.object({
  from_node_id: z.string().uuid().optional(),
  to_node_id: z.string().uuid().optional(),
  label: z.string().nullable().optional(),
  condition: z.any().optional(),
  display_order: z.number().optional(),
});

// PATCH /workflows/transitions/:id
workflowsRouter.patch('/transitions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { from_node_id, to_node_id, display_order, ...rest } = parsed.data;

  const [trans] = await db
    .update(workflowTransitions)
    .set({
      ...rest,
      ...(from_node_id !== undefined && { fromNodeId: from_node_id }),
      ...(to_node_id !== undefined && { toNodeId: to_node_id }),
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .where(eq(workflowTransitions.id, id))
    .returning();

  if (!trans) {
    return c.json({ error: 'Transition introuvable' }, 404);
  }

  return c.json(toSnakeCase(trans));
});

// DELETE /workflows/transitions/:id
workflowsRouter.delete('/transitions/:id', async (c) => {
  const id = c.req.param('id');

  const [trans] = await db
    .delete(workflowTransitions)
    .where(eq(workflowTransitions.id, id))
    .returning();

  if (!trans) {
    return c.json({ error: 'Transition introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Node Fields
// =============================================

// GET /workflows/nodes/:nodeId/fields
workflowsRouter.get('/nodes/:nodeId/fields', async (c) => {
  const nodeId = c.req.param('nodeId');

  const fields = await db
    .select()
    .from(nodeFields)
    .where(eq(nodeFields.nodeId, nodeId))
    .orderBy(nodeFields.displayOrder);

  return c.json(toSnakeCase(fields));
});

const createNodeFieldSchema = z.object({
  node_id: z.string().uuid(),
  field_definition_id: z.string().uuid(),
  is_editable: z.boolean().optional(),
  is_required: z.boolean().optional(),
  is_visible: z.boolean().optional(),
  display_order: z.number().optional(),
  section_id: z.string().uuid().nullable().optional(),
});

// POST /workflows/node-fields
workflowsRouter.post('/node-fields', async (c) => {
  const body = await c.req.json();
  const parsed = createNodeFieldSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { node_id, field_definition_id, is_editable, is_required, is_visible, display_order, section_id } = parsed.data;

  const [nf] = await db
    .insert(nodeFields)
    .values({
      nodeId: node_id,
      fieldDefinitionId: field_definition_id,
      ...(is_editable !== undefined && { isEditable: is_editable }),
      ...(is_required !== undefined && { isRequired: is_required }),
      ...(is_visible !== undefined && { isVisible: is_visible }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(section_id !== undefined && { sectionId: section_id }),
    })
    .returning();

  return c.json(toSnakeCase(nf), 201);
});

const updateNodeFieldSchema = z.object({
  is_editable: z.boolean().optional(),
  is_required: z.boolean().optional(),
  is_visible: z.boolean().optional(),
  display_order: z.number().optional(),
  section_id: z.string().uuid().nullable().optional(),
});

// PATCH /workflows/node-fields/:id
workflowsRouter.patch('/node-fields/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateNodeFieldSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { is_editable, is_required, is_visible, display_order, section_id } = parsed.data;

  const [nf] = await db
    .update(nodeFields)
    .set({
      ...(is_editable !== undefined && { isEditable: is_editable }),
      ...(is_required !== undefined && { isRequired: is_required }),
      ...(is_visible !== undefined && { isVisible: is_visible }),
      ...(display_order !== undefined && { displayOrder: display_order }),
      ...(section_id !== undefined && { sectionId: section_id }),
    })
    .where(eq(nodeFields.id, id))
    .returning();

  if (!nf) {
    return c.json({ error: 'Champ de noeud introuvable' }, 404);
  }

  return c.json(toSnakeCase(nf));
});

// DELETE /workflows/node-fields/:id
workflowsRouter.delete('/node-fields/:id', async (c) => {
  const id = c.req.param('id');

  const [nf] = await db
    .delete(nodeFields)
    .where(eq(nodeFields.id, id))
    .returning();

  if (!nf) {
    return c.json({ error: 'Champ de noeud introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Node Sections
// =============================================

// GET /workflows/nodes/:nodeId/sections
workflowsRouter.get('/nodes/:nodeId/sections', async (c) => {
  const nodeId = c.req.param('nodeId');

  const sections = await db
    .select()
    .from(nodeSections)
    .where(eq(nodeSections.nodeId, nodeId))
    .orderBy(nodeSections.displayOrder);

  return c.json(toSnakeCase(sections));
});

const createSectionSchema = z.object({
  node_id: z.string().uuid(),
  name: z.string().min(1),
  display_order: z.number().optional(),
});

// POST /workflows/node-sections
workflowsRouter.post('/node-sections', async (c) => {
  const body = await c.req.json();
  const parsed = createSectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { node_id, display_order, ...rest } = parsed.data;

  const [section] = await db
    .insert(nodeSections)
    .values({
      ...rest,
      nodeId: node_id,
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .returning();

  return c.json(toSnakeCase(section), 201);
});

const updateSectionSchema = z.object({
  name: z.string().min(1).optional(),
  display_order: z.number().optional(),
});

// PATCH /workflows/node-sections/:id
workflowsRouter.patch('/node-sections/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { display_order, ...rest } = parsed.data;

  const [section] = await db
    .update(nodeSections)
    .set({
      ...rest,
      ...(display_order !== undefined && { displayOrder: display_order }),
    })
    .where(eq(nodeSections.id, id))
    .returning();

  if (!section) {
    return c.json({ error: 'Section introuvable' }, 404);
  }

  return c.json(toSnakeCase(section));
});

// DELETE /workflows/node-sections/:id
workflowsRouter.delete('/node-sections/:id', async (c) => {
  const id = c.req.param('id');

  const [section] = await db
    .delete(nodeSections)
    .where(eq(nodeSections.id, id))
    .returning();

  if (!section) {
    return c.json({ error: 'Section introuvable' }, 404);
  }

  return c.json({ success: true });
});

// =============================================
// Node Role Permissions
// =============================================

// GET /workflows/nodes/:nodeId/role-permissions
workflowsRouter.get('/nodes/:nodeId/role-permissions', async (c) => {
  const nodeId = c.req.param('nodeId');

  const perms = await db
    .select()
    .from(nodeRolePermissions)
    .where(eq(nodeRolePermissions.nodeId, nodeId));

  return c.json(toSnakeCase(perms));
});

const upsertPermSchema = z.object({
  node_id: z.string().uuid(),
  role_id: z.string().uuid(),
  can_view: z.boolean().optional(),
  can_edit: z.boolean().optional(),
  can_execute_transition: z.boolean().optional(),
});

// POST /workflows/node-role-permissions — upsert permission
workflowsRouter.post('/node-role-permissions', async (c) => {
  const body = await c.req.json();
  const parsed = upsertPermSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { node_id, role_id, can_view, can_edit, can_execute_transition } = parsed.data;

  const [existing] = await db
    .select()
    .from(nodeRolePermissions)
    .where(
      and(
        eq(nodeRolePermissions.nodeId, node_id),
        eq(nodeRolePermissions.roleId, role_id),
      )
    );

  let result;
  if (existing) {
    [result] = await db
      .update(nodeRolePermissions)
      .set({
        ...(can_view !== undefined && { canView: can_view }),
        ...(can_edit !== undefined && { canEdit: can_edit }),
        ...(can_execute_transition !== undefined && { canExecuteTransition: can_execute_transition }),
      })
      .where(eq(nodeRolePermissions.id, existing.id))
      .returning();
  } else {
    [result] = await db
      .insert(nodeRolePermissions)
      .values({
        nodeId: node_id,
        roleId: role_id,
        ...(can_view !== undefined && { canView: can_view }),
        ...(can_edit !== undefined && { canEdit: can_edit }),
        ...(can_execute_transition !== undefined && { canExecuteTransition: can_execute_transition }),
      })
      .returning();
  }

  return c.json(toSnakeCase(result), existing ? 200 : 201);
});

export default workflowsRouter;
