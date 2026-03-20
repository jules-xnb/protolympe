import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { translations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { requireClientAccess } from '../middleware/client-access.js';
import { requireAdminOrIntegrator } from '../middleware/persona.js';
import { toSnakeCase } from '../lib/case-transform.js';

// Mounted at /clients/:clientId/translations
const translationsRouter = new Hono();

translationsRouter.use('*', authMiddleware);
translationsRouter.use('*', requireClientAccess());

// GET / — get translations. Query params: scope, language
translationsRouter.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const scope = c.req.query('scope');
  const language = c.req.query('language');

  const conditions = [eq(translations.clientId, clientId)];

  if (scope) {
    conditions.push(eq(translations.scope, scope));
  }
  if (language) {
    conditions.push(eq(translations.language, language));
  }

  const result = await db
    .select({
      key: translations.key,
      value: translations.value,
    })
    .from(translations)
    .where(and(...conditions))
    .orderBy(translations.key);

  return c.json(toSnakeCase(result));
});

const batchUpsertSchema = z.object({
  scope: z.string().min(1),
  language: z.string().min(1),
  translations: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .min(1)
    .max(500),
});

// PUT / — batch upsert translations (admin/integrator only)
// Deletes existing entries for scope+language, then inserts the new set.
translationsRouter.put('/', requireAdminOrIntegrator(), async (c) => {
  const clientId = c.req.param('clientId') as string;
  const body = await c.req.json();
  const parsed = batchUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { scope, language, translations: entries } = parsed.data;

  // Delete existing translations for this client/scope/language
  await db
    .delete(translations)
    .where(
      and(
        eq(translations.clientId, clientId),
        eq(translations.scope, scope),
        eq(translations.language, language)
      )
    );

  // Insert the new set
  const rows = entries.map(({ key, value }) => ({
    clientId,
    scope,
    language,
    key,
    value,
  }));

  const result = await db.insert(translations).values(rows).returning({
    key: translations.key,
    value: translations.value,
  });

  return c.json(toSnakeCase(result));
});

export default translationsRouter;
