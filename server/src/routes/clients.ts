import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { clients } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const clientsRouter = new Hono();

clientsRouter.use('*', authMiddleware);

// GET /clients — list all clients
clientsRouter.get('/', async (c) => {
  const result = await db
    .select()
    .from(clients)
    .orderBy(clients.name);

  return c.json(toSnakeCase(result));
});

// GET /clients/:id
clientsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id));

  if (!client) {
    return c.json({ error: 'Client introuvable' }, 404);
  }

  return c.json(toSnakeCase(client));
});

const createSchema = z.object({
  name: z.string().min(2),
  is_active: z.boolean().optional(),
  settings: z.any().optional(),
});

// POST /clients
clientsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { is_active, ...rest } = parsed.data;

  const [client] = await db
    .insert(clients)
    .values({
      ...rest,
      isActive: is_active,
    })
    .returning();

  return c.json(toSnakeCase(client), 201);
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  is_active: z.boolean().optional(),
  settings: z.any().optional(),
});

// PATCH /clients/:id
clientsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { is_active, ...rest } = parsed.data;

  const [client] = await db
    .update(clients)
    .set({
      ...rest,
      ...(is_active !== undefined && { isActive: is_active }),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, id))
    .returning();

  if (!client) {
    return c.json({ error: 'Client introuvable' }, 404);
  }

  return c.json(toSnakeCase(client));
});

// DELETE /clients/:id
clientsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [client] = await db
    .delete(clients)
    .where(eq(clients.id, id))
    .returning();

  if (!client) {
    return c.json({ error: 'Client introuvable' }, 404);
  }

  return c.json({ success: true });
});

export default clientsRouter;
