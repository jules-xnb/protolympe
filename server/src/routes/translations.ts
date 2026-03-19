import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { translations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';

const translationsRouter = new Hono();

translationsRouter.use('*', authMiddleware);

// GET /translations?client_id=X&language=Y — list translations
translationsRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');
  const language = c.req.query('language');

  if (!clientId) {
    return c.json({ error: 'Le paramètre client_id est requis' }, 400);
  }

  const conditions = [eq(translations.clientId, clientId)];
  if (language) {
    conditions.push(eq(translations.language, language));
  }

  const result = await db
    .select()
    .from(translations)
    .where(and(...conditions))
    .orderBy(translations.createdAt);

  return c.json(toSnakeCase(result));
});

const createTranslationSchema = z.object({
  clientId: z.string().uuid(),
  scope: z.string().min(1),
  language: z.string().min(1),
  key: z.string().min(1),
  value: z.string().min(1),
});

// POST /translations — create translation
translationsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const parsed = createTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [translation] = await db
    .insert(translations)
    .values(parsed.data)
    .returning();

  return c.json(toSnakeCase(translation), 201);
});

const updateTranslationSchema = z.object({
  scope: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
});

// PATCH /translations/:id — update translation
translationsRouter.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateTranslationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [translation] = await db
    .update(translations)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(translations.id, id))
    .returning();

  if (!translation) {
    return c.json({ error: 'Traduction introuvable' }, 404);
  }

  return c.json(toSnakeCase(translation));
});

// DELETE /translations/:id — delete translation
translationsRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const [translation] = await db
    .delete(translations)
    .where(eq(translations.id, id))
    .returning();

  if (!translation) {
    return c.json({ error: 'Traduction introuvable' }, 404);
  }

  return c.json({ success: true });
});

const batchUpsertSchema = z.object({
  clientId: z.string().uuid(),
  translations: z.array(
    z.object({
      scope: z.string().min(1),
      language: z.string().min(1),
      key: z.string().min(1),
      value: z.string().min(1),
    })
  ),
});

// POST /translations/batch — batch upsert translations
translationsRouter.post('/batch', async (c) => {
  const body = await c.req.json();
  const parsed = batchUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { clientId, translations: items } = parsed.data;
  const results = [];

  for (const item of items) {
    // Check if translation already exists
    const [existing] = await db
      .select()
      .from(translations)
      .where(
        and(
          eq(translations.clientId, clientId),
          eq(translations.scope, item.scope),
          eq(translations.language, item.language),
          eq(translations.key, item.key)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(translations)
        .set({
          value: item.value,
          updatedAt: new Date(),
        })
        .where(eq(translations.id, existing.id))
        .returning();

      results.push(updated);
    } else {
      const [created] = await db
        .insert(translations)
        .values({
          clientId,
          ...item,
        })
        .returning();

      results.push(created);
    }
  }

  return c.json(toSnakeCase(results), 201);
});

export default translationsRouter;
