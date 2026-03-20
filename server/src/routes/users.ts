import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  accounts,
  userClientMemberships,
  clientProfiles,
  clientProfileUsers,
  userFieldDefinitions,
  userFieldValues,
  clientModules,
} from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { toSnakeCase } from '../lib/case-transform.js';
import { getEditableFieldSlugs } from '../lib/field-access.js';
import type { JwtPayload } from '../lib/jwt.js';
import { parsePaginationParams, paginatedResponse } from '../lib/pagination.js';

type Env = { Variables: { user: JwtPayload } };

const usersRouter = new Hono<Env>();

usersRouter.use('*', authMiddleware);

// ─── Users — list ─────────────────────────────────────────────────────────────

// GET /clients/:clientId/users
usersRouter.get('/', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const result = await db
    .select({
      membershipId: userClientMemberships.id,
      userId: accounts.id,
      email: accounts.email,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      persona: accounts.persona,
      isActive: userClientMemberships.isActive,
      invitedBy: userClientMemberships.invitedBy,
      activatedAt: userClientMemberships.activatedAt,
      membershipCreatedAt: userClientMemberships.createdAt,
    })
    .from(userClientMemberships)
    .innerJoin(accounts, eq(userClientMemberships.userId, accounts.id))
    .where(eq(userClientMemberships.clientId, clientId))
    .orderBy(accounts.lastName, accounts.firstName);

  return c.json(toSnakeCase(result));
});

// ─── Invite — static route before /:id ───────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
});

// POST /clients/:clientId/users/invite
usersRouter.post('/invite', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const requestingUser = c.get('user');
  const body = await c.req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { email, first_name, last_name } = parsed.data;

  // Check if account already exists
  const [existing] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.email, email));

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    const [newAccount] = await db
      .insert(accounts)
      .values({
        email,
        firstName: first_name,
        lastName: last_name,
        persona: 'client_user',
        passwordHash: null,
      })
      .returning();
    userId = newAccount.id;
  }

  // Check if membership already exists for this client
  const [existingMembership] = await db
    .select()
    .from(userClientMemberships)
    .where(
      and(
        eq(userClientMemberships.userId, userId),
        eq(userClientMemberships.clientId, clientId)
      )
    );

  if (existingMembership) {
    return c.json({ error: "L'utilisateur est déjà membre de ce client" }, 409);
  }

  const [membership] = await db
    .insert(userClientMemberships)
    .values({
      userId,
      clientId,
      invitedBy: requestingUser.sub,
      isActive: true,
    })
    .returning();

  return c.json(
    toSnakeCase({
      membership,
      userId,
      email,
      firstName: first_name,
      lastName: last_name,
    }),
    201
  );
});

// ─── Field Definitions — static routes before /:id ───────────────────────────

// GET /clients/:clientId/users/field-definitions
usersRouter.get('/field-definitions', async (c) => {
  const clientId = c.req.param('clientId') as string;

  const result = await db
    .select()
    .from(userFieldDefinitions)
    .where(eq(userFieldDefinitions.clientId, clientId))
    .orderBy(userFieldDefinitions.name);

  return c.json(toSnakeCase(result));
});

const createFieldDefinitionSchema = z.object({
  name: z.string().min(1),
  field_type: z.string().min(1),
  description: z.string().optional(),
  is_required: z.boolean().optional().default(false),
  is_unique: z.boolean().optional().default(false),
  list_id: z.string().uuid().optional(),
  settings: z.record(z.unknown()).optional(),
  default_value: z.unknown().optional(),
});

// POST /clients/:clientId/users/field-definitions
usersRouter.post('/field-definitions', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const requestingUser = c.get('user');
  const body = await c.req.json();
  const parsed = createFieldDefinitionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, field_type, description, is_required, is_unique, list_id, settings, default_value } =
    parsed.data;

  const [def] = await db
    .insert(userFieldDefinitions)
    .values({
      clientId,
      name,
      fieldType: field_type,
      ...(description !== undefined && { description }),
      ...(is_required !== undefined && { isRequired: is_required }),
      ...(is_unique !== undefined && { isUnique: is_unique }),
      ...(list_id !== undefined && { listId: list_id }),
      ...(settings !== undefined && { settings }),
      ...(default_value !== undefined && { defaultValue: default_value as any }),
      createdBy: requestingUser.sub,
    })
    .returning();

  return c.json(toSnakeCase(def), 201);
});

const updateFieldDefinitionSchema = z.object({
  name: z.string().min(1).optional(),
  field_type: z.string().min(1).optional(),
  description: z.string().optional(),
  is_required: z.boolean().optional(),
  is_unique: z.boolean().optional(),
  list_id: z.string().uuid().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
  default_value: z.unknown().optional(),
});

// PATCH /clients/:clientId/users/field-definitions/:id
usersRouter.patch('/field-definitions/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateFieldDefinitionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { name, field_type, description, is_required, is_unique, list_id, settings, default_value } =
    parsed.data;

  const [def] = await db
    .update(userFieldDefinitions)
    .set({
      ...(name !== undefined && { name }),
      ...(field_type !== undefined && { fieldType: field_type }),
      ...(description !== undefined && { description }),
      ...(is_required !== undefined && { isRequired: is_required }),
      ...(is_unique !== undefined && { isUnique: is_unique }),
      ...(list_id !== undefined && { listId: list_id }),
      ...(settings !== undefined && { settings }),
      ...(default_value !== undefined && { defaultValue: default_value as any }),
      updatedAt: new Date(),
    })
    .where(and(eq(userFieldDefinitions.id, id), eq(userFieldDefinitions.clientId, clientId)))
    .returning();

  if (!def) {
    return c.json({ error: 'Définition de champ introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

// PATCH /clients/:clientId/users/field-definitions/:id/deactivate
usersRouter.patch('/field-definitions/:id/deactivate', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [def] = await db
    .update(userFieldDefinitions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(userFieldDefinitions.id, id), eq(userFieldDefinitions.clientId, clientId)))
    .returning();

  if (!def) {
    return c.json({ error: 'Définition de champ introuvable' }, 404);
  }

  return c.json(toSnakeCase(def));
});

// ─── Users — by id (dynamic, always after static routes) ─────────────────────

// GET /clients/:clientId/users/:id
usersRouter.get('/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [result] = await db
    .select({
      membershipId: userClientMemberships.id,
      userId: accounts.id,
      email: accounts.email,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      persona: accounts.persona,
      isActive: userClientMemberships.isActive,
      invitedBy: userClientMemberships.invitedBy,
      activatedAt: userClientMemberships.activatedAt,
      membershipCreatedAt: userClientMemberships.createdAt,
    })
    .from(userClientMemberships)
    .innerJoin(accounts, eq(userClientMemberships.userId, accounts.id))
    .where(and(eq(userClientMemberships.clientId, clientId), eq(accounts.id, id)));

  if (!result) {
    return c.json({ error: 'Utilisateur introuvable' }, 404);
  }

  return c.json(toSnakeCase(result));
});

const updateUserSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
});

// PATCH /clients/:clientId/users/:id
usersRouter.patch('/:id', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');
  const requestingUser = c.get('user');
  const body = await c.req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  // Field access check for client_user persona
  if (requestingUser.persona === 'client_user') {
    const [usersModule] = await db
      .select({ id: clientModules.id })
      .from(clientModules)
      .where(and(eq(clientModules.clientId, clientId), eq(clientModules.moduleSlug, 'users')))
      .limit(1);

    if (usersModule) {
      const editableFields = await getEditableFieldSlugs(requestingUser.sub, usersModule.id, 'users');
      const requestedFields = Object.keys(body) as string[];
      for (const field of requestedFields) {
        if (!editableFields.has(field)) {
          return c.json({ error: `Champ non autorisé : ${field}` }, 403);
        }
      }
    }
  }

  const { first_name, last_name } = parsed.data;

  // Verify membership exists for this client
  const [membership] = await db
    .select()
    .from(userClientMemberships)
    .where(
      and(eq(userClientMemberships.userId, id), eq(userClientMemberships.clientId, clientId))
    );

  if (!membership) {
    return c.json({ error: 'Utilisateur introuvable' }, 404);
  }

  const [updated] = await db
    .update(accounts)
    .set({
      ...(first_name !== undefined && { firstName: first_name }),
      ...(last_name !== undefined && { lastName: last_name }),
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, id))
    .returning();

  return c.json(toSnakeCase(updated));
});

// PATCH /clients/:clientId/users/:id/deactivate
usersRouter.patch('/:id/deactivate', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const [membership] = await db
    .update(userClientMemberships)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(eq(userClientMemberships.userId, id), eq(userClientMemberships.clientId, clientId))
    )
    .returning();

  if (!membership) {
    return c.json({ error: 'Utilisateur introuvable' }, 404);
  }

  return c.json(toSnakeCase(membership));
});

// ─── User Profiles ────────────────────────────────────────────────────────────

// GET /clients/:clientId/users/:id/profiles
usersRouter.get('/:id/profiles', async (c) => {
  const clientId = c.req.param('clientId') as string;
  const id = c.req.param('id');

  const result = await db
    .select({
      assignmentId: clientProfileUsers.id,
      userId: clientProfileUsers.userId,
      profileId: clientProfileUsers.profileId,
      assignedAt: clientProfileUsers.createdAt,
      profileName: clientProfiles.name,
      profileDescription: clientProfiles.description,
      profileIsArchived: clientProfiles.isArchived,
    })
    .from(clientProfileUsers)
    .innerJoin(clientProfiles, eq(clientProfileUsers.profileId, clientProfiles.id))
    .where(and(eq(clientProfileUsers.userId, id), eq(clientProfiles.clientId, clientId)))
    .orderBy(clientProfiles.name);

  return c.json(toSnakeCase(result));
});

const assignProfileSchema = z.object({
  profile_id: z.string().uuid(),
});

// POST /clients/:clientId/users/:id/profiles
usersRouter.post('/:id/profiles', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = assignProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const [entry] = await db
    .insert(clientProfileUsers)
    .values({
      userId: id,
      profileId: parsed.data.profile_id,
    })
    .returning();

  return c.json(toSnakeCase(entry), 201);
});

// DELETE /clients/:clientId/users/:id/profiles/:profileId
usersRouter.delete('/:id/profiles/:profileId', async (c) => {
  const id = c.req.param('id');
  const profileId = c.req.param('profileId');

  const [entry] = await db
    .delete(clientProfileUsers)
    .where(
      and(eq(clientProfileUsers.userId, id), eq(clientProfileUsers.profileId, profileId))
    )
    .returning();

  if (!entry) {
    return c.json({ error: 'Affectation introuvable' }, 404);
  }

  return c.json({ success: true });
});

// ─── Field Values ─────────────────────────────────────────────────────────────

// GET /clients/:clientId/users/:id/field-values
usersRouter.get('/:id/field-values', async (c) => {
  const id = c.req.param('id');

  const result = await db
    .select({
      id: userFieldValues.id,
      userId: userFieldValues.userId,
      fieldDefinitionId: userFieldValues.fieldDefinitionId,
      value: userFieldValues.value,
      updatedBy: userFieldValues.updatedBy,
      updatedAt: userFieldValues.updatedAt,
      fieldName: userFieldDefinitions.name,
      fieldType: userFieldDefinitions.fieldType,
    })
    .from(userFieldValues)
    .innerJoin(
      userFieldDefinitions,
      eq(userFieldValues.fieldDefinitionId, userFieldDefinitions.id)
    )
    .where(eq(userFieldValues.userId, id));

  return c.json(toSnakeCase(result));
});

const upsertFieldValueSchema = z.object({
  field_definition_id: z.string().uuid(),
  value: z.unknown(),
});

// POST /clients/:clientId/users/:id/field-values
usersRouter.post('/:id/field-values', async (c) => {
  const id = c.req.param('id');
  const requestingUser = c.get('user');
  const body = await c.req.json();
  const parsed = upsertFieldValueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400);
  }

  const { field_definition_id, value } = parsed.data;

  // Check if a value already exists for this user + field
  const [existing] = await db
    .select()
    .from(userFieldValues)
    .where(
      and(
        eq(userFieldValues.userId, id),
        eq(userFieldValues.fieldDefinitionId, field_definition_id)
      )
    );

  if (existing) {
    const [updated] = await db
      .update(userFieldValues)
      .set({
        value: value as any,
        updatedBy: requestingUser.sub,
        updatedAt: new Date(),
      })
      .where(eq(userFieldValues.id, existing.id))
      .returning();

    return c.json(toSnakeCase(updated));
  }

  const [created] = await db
    .insert(userFieldValues)
    .values({
      userId: id,
      fieldDefinitionId: field_definition_id,
      value: value as any,
      updatedBy: requestingUser.sub,
    })
    .returning();

  return c.json(toSnakeCase(created), 201);
});

export default usersRouter;
