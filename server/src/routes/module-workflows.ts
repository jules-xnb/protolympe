import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { moduleWorkflows } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const moduleWorkflowsRouter = new Hono();

moduleWorkflowsRouter.use('*', authMiddleware);

// GET /module-workflows?module_id=X — list workflows for a module
moduleWorkflowsRouter.get('/', async (c) => {
  const moduleId = c.req.query('module_id');

  if (!moduleId) {
    return c.json({ error: 'Le paramètre module_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(moduleWorkflows)
    .where(eq(moduleWorkflows.clientModuleId, moduleId))
    .orderBy(moduleWorkflows.createdAt);

  return c.json(toSnakeCase(result));
});

const createSchema = z.object({
  module_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
});

// POST /module-workflows — create a workflow
moduleWorkflowsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { module_id, name, description } = parsed.data;

  const [workflow] = await db
    .insert(moduleWorkflows)
    .values({
      clientModuleId: module_id,
      name,
      description,
    })
    .returning();

  return c.json(toSnakeCase(workflow), 201);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// PATCH /module-workflows/:id — update a workflow
moduleWorkflowsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, description, is_active } = parsed.data;

  const [workflow] = await db
    .update(moduleWorkflows)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(is_active !== undefined && { isActive: is_active }),
      updatedAt: new Date(),
    })
    .where(eq(moduleWorkflows.id, id))
    .returning();

  if (!workflow) {
    return c.json({ error: 'Workflow introuvable' }, 404);
  }

  return c.json(toSnakeCase(workflow));
});

// DELETE /module-workflows/:id — delete a workflow
moduleWorkflowsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [workflow] = await db
    .delete(moduleWorkflows)
    .where(eq(moduleWorkflows.id, id))
    .returning();

  if (!workflow) {
    return c.json({ error: 'Workflow introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default moduleWorkflowsRouter;
