import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import {
  accounts,
  userClientMemberships,
  userFieldDefinitions,
  userFieldValues,
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';
import type { JwtPayload } from '../lib/jwt.js';

type Env = {
  Variables: {
    user: JwtPayload;
  };
};

const clientUsersRouter = new Hono<Env>();

clientUsersRouter.use('*', authMiddleware);

// =============================================
// Client Users
// =============================================

// GET /client-users?client_id=X — list users for a client (join profiles + memberships)
clientUsersRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const memberships = await db
    .select()
    .from(userClientMemberships)
    .where(eq(userClientMemberships.clientId, clientId))
    .orderBy(userClientMemberships.createdAt);

  if (memberships.length === 0) return c.json([]);

  const userIds = [...new Set(memberships.map((m) => m.userId))];

  const userProfiles = await db
    .select({
      id: accounts.id,
      email: accounts.email,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(inArray(accounts.id, userIds));

  const result = toSnakeCase(memberships).map((m: Record<string, unknown>) => ({
    ...m,
    profile: toSnakeCase(userProfiles.find((p) => p.id === m.user_id)) || null,
  }));

  return c.json(result);
});

// =============================================
// User Field Values
// =============================================

// GET /client-users/:userId/field-values — list user_field_values
clientUsersRouter.get('/:userId/field-values', async (c) => {
  const userId = c.req.param('userId');

  const result = await db
    .select()
    .from(userFieldValues)
    .where(eq(userFieldValues.userId, userId));

  return c.json(toSnakeCase(result));
});

const upsertFieldValueSchema = z.object({
  userId: z.string().uuid(),
  fieldDefinitionId: z.string().uuid(),
  value: z.any(),
  updatedBy: z.string().uuid().optional(),
});

// POST /client-users/field-values — upsert user field value
clientUsersRouter.post('/field-values', async (c) => {
  const body = await c.req.json();
  const parsed = upsertFieldValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const { userId, fieldDefinitionId, value, updatedBy } = parsed.data;

  // Check if a value already exists for this user + field_definition
  const [existing] = await db
    .select()
    .from(userFieldValues)
    .where(
      and(
        eq(userFieldValues.userId, userId),
        eq(userFieldValues.fieldDefinitionId, fieldDefinitionId),
      )
    );

  if (existing) {
    const [updated] = await db
      .update(userFieldValues)
      .set({
        value,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(userFieldValues.id, existing.id))
      .returning();

    return c.json(toSnakeCase(updated));
  }

  const [created] = await db
    .insert(userFieldValues)
    .values({
      userId,
      fieldDefinitionId,
      value,
      updatedBy,
    })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

// =============================================
// User Field Definitions
// =============================================

// GET /client-users/field-definitions?client_id=X — list user_field_definitions
clientUsersRouter.get('/field-definitions', async (c) => {
  const clientId = c.req.query('client_id');

  if (!clientId) {
    return c.json({ error: 'Le parametre client_id est requis' }, 400);
  }

  const result = await db
    .select()
    .from(userFieldDefinitions)
    .where(and(eq(userFieldDefinitions.clientId, clientId), eq(userFieldDefinitions.isActive, true)))
    .orderBy(userFieldDefinitions.name);

  return c.json(toSnakeCase(result));
});

const createFieldDefSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1),
  fieldType: z.string().optional(),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  settings: z.any().optional(),
  defaultValue: z.any().optional(),
});

// POST /client-users/field-definitions — create user field definition
clientUsersRouter.post('/field-definitions', async (c) => {
  const body = await c.req.json();
  const parsed = createFieldDefSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const currentUser = c.get('user');

  const [def] = await db
    .insert(userFieldDefinitions)
    .values({
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      fieldType: parsed.data.fieldType || 'text',
      description: parsed.data.description,
      isRequired: parsed.data.isRequired,
      isUnique: parsed.data.isUnique,
      settings: parsed.data.settings,
      defaultValue: parsed.data.defaultValue,
      createdBy: currentUser.sub,
    })
    .returning();

  return c.json(toSnakeCase(def), 201);
});

const updateFieldDefSchema = z.object({
  name: z.string().min(1).optional(),
  fieldType: z.string().optional(),
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  settings: z.any().optional(),
  defaultValue: z.any().optional(),
});

// PATCH /client-users/field-definitions/:id — update user field definition
clientUsersRouter.patch('/field-definitions/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateFieldDefSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const {
    name, fieldType, description, isRequired,
    isUnique, settings, defaultValue,
  } = parsed.data;

  const [def] = await db
    .update(userFieldDefinitions)
    .set({
      ...(name !== undefined && { name }),
      ...(fieldType !== undefined && { fieldType }),
      ...(description !== undefined && { description }),
      ...(isRequired !== undefined && { isRequired }),
      ...(isUnique !== undefined && { isUnique }),
      ...(settings !== undefined && { settings }),
      ...(defaultValue !== undefined && { defaultValue }),
      updatedAt: new Date(),
    })
    .where(eq(userFieldDefinitions.id, id))
    .returning();

  if (!def) {
    return c.json({ error: 'Definition introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

// DELETE /client-users/field-definitions/:id — soft delete (is_active = false)
clientUsersRouter.delete('/field-definitions/:id', async (c) => {
  const id = c.req.param('id');

  const [def] = await db
    .update(userFieldDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(userFieldDefinitions.id, id))
    .returning();

  if (!def) {
    return c.json({ error: 'Definition introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

// =============================================
// Invite (create user account)
// =============================================

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  clientId: z.string().uuid(),
});

// POST /client-users/invite — create user account (hash password, create profile, create membership)
clientUsersRouter.post('/invite', async (c) => {
  const body = await c.req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const { email, firstName, lastName, clientId } = parsed.data;
  const currentUser = c.get('user');
  const defaultPassword = process.env.DEFAULT_PASSWORD || 'Delta75002-@';

  // Check if profile already exists
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.email, email.toLowerCase()));

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    const [newUser] = await db
      .insert(accounts)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        persona: 'client_user',
      })
      .returning();
    userId = newUser.id;
  }

  // Create membership
  try {
    await db.insert(userClientMemberships).values({
      userId,
      clientId,
      invitedBy: currentUser.sub,
      activatedAt: new Date(),
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code !== '23505') throw err;
  }

  return c.json({
    success: true,
    userId,
    message: existing
      ? "Membership ajoutee a l'utilisateur existant"
      : 'Compte cree avec le mot de passe par defaut',
  });
});

// =============================================
// Memberships
// =============================================

const updateMembershipSchema = z.object({
  isActive: z.boolean().optional(),
});

// PATCH /client-users/memberships/:id — update membership (activate/deactivate)
clientUsersRouter.patch('/memberships/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateMembershipSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }

  const { isActive } = parsed.data;

  const [membership] = await db
    .update(userClientMemberships)
    .set({
      ...(isActive !== undefined && { isActive }),
      ...(isActive === true && { activatedAt: new Date() }),
      updatedAt: new Date(),
    })
    .where(eq(userClientMemberships.id, id))
    .returning();

  if (!membership) {
    return c.json({ error: 'Membership introuvable' }, 404);
  }

  return c.json(toSnakeCase(membership));
});

// POST /client-users/field-values/bulk — bulk query user_field_values by field_definition_id + user_ids
const bulkUserFieldValuesSchema = z.object({
  field_definition_id: z.string().uuid(),
  user_ids: z.array(z.string().uuid()).min(1),
});

clientUsersRouter.post('/field-values/bulk', async (c) => {
  const body = await c.req.json();
  const parsed = bulkUserFieldValuesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const result = await db
    .select()
    .from(userFieldValues)
    .where(
      and(
        eq(userFieldValues.fieldDefinitionId, parsed.data.field_definition_id),
        inArray(userFieldValues.userId, parsed.data.user_ids),
      )
    );

  return c.json(toSnakeCase(result));
});

export default clientUsersRouter;
