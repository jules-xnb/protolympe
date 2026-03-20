import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { clientDesignConfigs } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { requireClientAccess } from '../middleware/client-access.js';
import { requireAdminOrIntegrator } from '../middleware/persona.js';
import { toSnakeCase } from '../lib/case-transform.js';

// Mounted at /clients/:clientId/design
const designRouter = new Hono();

designRouter.use('*', authMiddleware);
designRouter.use('*', requireClientAccess());

const DEFAULT_DESIGN = {
  primary_color: '#3B82F6',
  secondary_color: '#6B7280',
  accent_color: null,
  border_radius: 8,
  font_family: 'Inter',
  logo_url: null,
  app_name: null,
};

// GET / — get design config (returns defaults if none exists)
designRouter.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const [config] = await db
    .select()
    .from(clientDesignConfigs)
    .where(eq(clientDesignConfigs.clientId, clientId));

  if (!config) {
    return c.json({ ...DEFAULT_DESIGN, client_id: clientId });
  }

  return c.json(toSnakeCase(config));
});

const upsertDesignSchema = z.object({
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  accent_color: z.string().nullable().optional(),
  border_radius: z.number().int().optional(),
  font_family: z.string().optional(),
  logo_url: z.string().url().nullable().optional(),
  app_name: z.string().nullable().optional(),
});

// PUT / — upsert design config (admin/integrator only)
designRouter.put('/', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.json();
  const parsed = upsertDesignSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const {
    primary_color,
    secondary_color,
    accent_color,
    border_radius,
    font_family,
    logo_url,
    app_name,
  } = parsed.data;

  const [existing] = await db
    .select()
    .from(clientDesignConfigs)
    .where(eq(clientDesignConfigs.clientId, clientId));

  let config;

  if (existing) {
    [config] = await db
      .update(clientDesignConfigs)
      .set({
        ...(primary_color !== undefined && { primaryColor: primary_color }),
        ...(secondary_color !== undefined && { secondaryColor: secondary_color }),
        ...(accent_color !== undefined && { accentColor: accent_color }),
        ...(border_radius !== undefined && { borderRadius: border_radius }),
        ...(font_family !== undefined && { fontFamily: font_family }),
        ...(logo_url !== undefined && { logoUrl: logo_url }),
        ...(app_name !== undefined && { appName: app_name }),
        updatedAt: new Date(),
      })
      .where(eq(clientDesignConfigs.clientId, clientId))
      .returning();
  } else {
    [config] = await db
      .insert(clientDesignConfigs)
      .values({
        clientId,
        ...(primary_color !== undefined && { primaryColor: primary_color }),
        ...(secondary_color !== undefined && { secondaryColor: secondary_color }),
        ...(accent_color !== undefined && { accentColor: accent_color }),
        ...(border_radius !== undefined && { borderRadius: border_radius }),
        ...(font_family !== undefined && { fontFamily: font_family }),
        ...(logo_url !== undefined && { logoUrl: logo_url }),
        ...(app_name !== undefined && { appName: app_name }),
      })
      .returning();
  }

  return c.json(toSnakeCase(config));
});

export default designRouter;
