import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { clientDesignConfigs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const designRouter = new Hono();

designRouter.use('*', authMiddleware);

// GET /design?client_id=X — get design config for a client (single row)
designRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const [config] = await db
    .select()
    .from(clientDesignConfigs)
    .where(eq(clientDesignConfigs.clientId, clientId));

  if (!config) {
    return c.json({ error: 'Configuration de design introuvable' }, 404);
  }

  return c.json(toSnakeCase(config));
});

const createDesignSchema = z.object({
  clientId: z.string().uuid(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  textOnPrimary: z.string().optional(),
  textOnSecondary: z.string().optional(),
  accentColor: z.string().optional(),
  borderRadius: z.number().optional(),
  fontFamily: z.string().optional(),
  logoUrl: z.string().optional(),
  appName: z.string().optional(),
});

// POST /design — create/upsert design config
designRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createDesignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  // Check if config already exists for this client
  const [existing] = await db
    .select()
    .from(clientDesignConfigs)
    .where(eq(clientDesignConfigs.clientId, parsed.data.clientId));

  if (existing) {
    const { clientId, ...updateData } = parsed.data;
    const [updated] = await db
      .update(clientDesignConfigs)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(clientDesignConfigs.id, existing.id))
      .returning();

    return c.json(toSnakeCase(updated));
  }

  const [config] = await db
    .insert(clientDesignConfigs)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(config), 201);
});

const updateDesignSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  textOnPrimary: z.string().optional(),
  textOnSecondary: z.string().optional(),
  accentColor: z.string().nullable().optional(),
  borderRadius: z.number().optional(),
  fontFamily: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  appName: z.string().nullable().optional(),
});

// PATCH /design/:id — update design config
designRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateDesignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [config] = await db
    .update(clientDesignConfigs)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(clientDesignConfigs.id, id))
    .returning();

  if (!config) {
    return c.json({ error: 'Configuration de design introuvable' }, 404);
  }

  return c.json(toSnakeCase(config));
});

export default designRouter;
