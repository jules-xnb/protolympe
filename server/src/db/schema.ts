import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// =============================================
// Enums
// =============================================

export const systemPersonaEnum = pgEnum('system_persona', [
  'admin_delta',
  'integrator_delta',
  'integrator_external',
  'client_user',
]);

// =============================================
// Socle — Utilisateurs & Accès
// =============================================

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  persona: systemPersonaEnum('persona').notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('accounts_persona_idx').on(table.persona),
]);

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  subdomain: text('subdomain').unique(),
  customHostname: text('custom_hostname').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('refresh_tokens_user_id_idx').on(table.userId),
  index('refresh_tokens_token_hash_idx').on(table.tokenHash),
]);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('password_reset_tokens_token_hash_idx').on(table.tokenHash),
  index('password_reset_tokens_user_id_idx').on(table.userId),
]);

export const clientSsoConfigs = pgTable('client_sso_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  issuerUrl: text('issuer_url').notNull(),
  clientIdOidc: text('client_id_oidc').notNull(),
  clientSecret: text('client_secret').notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('client_sso_configs_client_id_idx').on(table.clientId),
]);

export const integratorClientAssignments = pgTable('integrator_client_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => accounts.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('integrator_client_assignments_user_id_idx').on(table.userId),
  index('integrator_client_assignments_client_id_idx').on(table.clientId),
  index('integrator_client_assignments_user_client_idx').on(table.userId, table.clientId),
]);

export const userClientMemberships = pgTable('user_client_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  invitedBy: uuid('invited_by').references(() => accounts.id),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_client_memberships_user_id_idx').on(table.userId),
  index('user_client_memberships_client_id_idx').on(table.clientId),
  index('user_client_memberships_user_client_idx').on(table.userId, table.clientId),
]);

// =============================================
// Modules & Rôles métier
// =============================================

export const clientModules = pgTable('client_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  moduleSlug: text('module_slug').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('client_modules_client_id_idx').on(table.clientId),
  index('client_modules_client_slug_idx').on(table.clientId, table.moduleSlug),
]);

export const moduleRoles = pgTable('module_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_roles_client_module_id_idx').on(table.clientModuleId),
]);

export const modulePermissions = pgTable('module_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  permissionSlug: text('permission_slug').notNull(),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  isGranted: boolean('is_granted').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('module_permissions_unique').on(table.moduleRoleId, table.permissionSlug),
  index('module_permissions_client_module_id_idx').on(table.clientModuleId),
  index('module_permissions_module_role_id_idx').on(table.moduleRoleId),
]);

// =============================================
// Entités organisationnelles
// =============================================

export const eoEntities = pgTable('eo_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  parentId: uuid('parent_id'),
  path: text('path').notNull().default(''),
  level: integer('level').notNull().default(0),
  isActive: boolean('is_active').default(true).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
}, (table) => [
  index('eo_entities_client_id_idx').on(table.clientId),
  index('eo_entities_client_path_idx').on(table.clientId, table.path),
  index('eo_entities_parent_id_idx').on(table.parentId),
]);

export const eoFieldDefinitions = pgTable('eo_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  fieldType: text('field_type').notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  isUnique: boolean('is_unique').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  commentOnChange: text('comment_on_change').default('none').notNull(),
  listId: uuid('list_id').references(() => lists.id, { onDelete: 'set null' }),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('eo_field_definitions_client_id_idx').on(table.clientId),
]);

export const eoFieldValues = pgTable('eo_field_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  eoId: uuid('eo_id').notNull().references(() => eoEntities.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => eoFieldDefinitions.id, { onDelete: 'cascade' }),
  value: jsonb('value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastModifiedBy: uuid('last_modified_by').references(() => accounts.id, { onDelete: 'set null' }),
}, (table) => [
  index('eo_field_values_eo_id_idx').on(table.eoId),
  index('eo_field_values_eo_field_idx').on(table.eoId, table.fieldDefinitionId),
]);

export const eoGroups = pgTable('eo_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('eo_groups_client_id_idx').on(table.clientId),
]);

export const eoGroupMembers = pgTable('eo_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => eoGroups.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => eoEntities.id, { onDelete: 'cascade' }),
  includeDescendants: boolean('include_descendants').default(false).notNull(),
  createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('eo_group_members_group_id_idx').on(table.groupId),
]);

export const eoFieldChangeComments = pgTable('eo_field_change_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  eoId: uuid('eo_id').notNull().references(() => eoEntities.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => eoFieldDefinitions.id, { onDelete: 'cascade' }),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
}, (table) => [
  index('eo_field_change_comments_eo_id_idx').on(table.eoId),
]);

export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull().references(() => accounts.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('admin_audit_log_created_at_idx').on(table.createdAt),
]);

export const eoAuditLog = pgTable('eo_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull().references(() => eoEntities.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  changedBy: uuid('changed_by').references(() => accounts.id, { onDelete: 'set null' }),
  changedFields: jsonb('changed_fields'),
  previousValues: jsonb('previous_values'),
  newValues: jsonb('new_values'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('eo_audit_log_entity_id_idx').on(table.entityId),
]);

export const eoExportHistory = pgTable('eo_export_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  exportedBy: uuid('exported_by').references(() => accounts.id, { onDelete: 'set null' }),
  exportedAt: timestamp('exported_at', { withTimezone: true }).defaultNow().notNull(),
  rowCount: integer('row_count'),
  fileName: text('file_name'),
}, (table) => [
  index('eo_export_history_client_id_idx').on(table.clientId),
]);

// =============================================
// Profils (Templates)
// =============================================

export const clientProfiles = pgTable('client_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('client_profiles_client_id_idx').on(table.clientId),
]);

export const clientProfileUsers = pgTable('client_profile_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('client_profile_users_user_id_idx').on(table.userId),
  index('client_profile_users_profile_id_idx').on(table.profileId),
]);

export const clientProfileEos = pgTable('client_profile_eos', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => eoEntities.id, { onDelete: 'cascade' }),
  includeDescendants: boolean('include_descendants').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('client_profile_eos_profile_id_idx').on(table.profileId),
]);

export const clientProfileEoGroups = pgTable('client_profile_eo_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => eoGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('client_profile_eo_groups_profile_id_idx').on(table.profileId),
]);

export const clientProfileModuleRoles = pgTable('client_profile_module_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: uuid('profile_id').notNull().references(() => clientProfiles.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('client_profile_module_roles_profile_id_idx').on(table.profileId),
]);

// =============================================
// Champs utilisateur
// =============================================

export const userFieldDefinitions = pgTable('user_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fieldType: text('field_type').notNull().default('text'),
  description: text('description'),
  isRequired: boolean('is_required').default(false).notNull(),
  isUnique: boolean('is_unique').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  listId: uuid('list_id').references(() => lists.id, { onDelete: 'set null' }),
  settings: jsonb('settings'),
  defaultValue: jsonb('default_value'),
  createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_field_definitions_client_id_idx').on(table.clientId),
]);

export const userFieldValues = pgTable('user_field_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => userFieldDefinitions.id, { onDelete: 'cascade' }),
  value: jsonb('value'),
  updatedBy: uuid('updated_by').references(() => accounts.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('user_field_values_user_id_idx').on(table.userId),
  index('user_field_values_user_field_idx').on(table.userId, table.fieldDefinitionId),
]);

// =============================================
// Listes (référentiels)
// =============================================

export const lists = pgTable('lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('lists_client_id_idx').on(table.clientId),
]);

export const listValues = pgTable('list_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id').notNull().references(() => lists.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  description: text('description'),
  color: text('color'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  parentId: uuid('parent_id'),
  level: integer('level').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('list_values_list_id_idx').on(table.listId),
]);

// =============================================
// Design & i18n
// =============================================

export const clientDesignConfigs = pgTable('client_design_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  primaryColor: text('primary_color').default('#3B82F6').notNull(),
  secondaryColor: text('secondary_color').default('#6B7280').notNull(),
  accentColor: text('accent_color'),
  borderRadius: integer('border_radius').default(8).notNull(),
  fontFamily: text('font_family').default('Inter').notNull(),
  logoUrl: text('logo_url'),
  appName: text('app_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('client_design_configs_client_id_idx').on(table.clientId),
]);

export const translations = pgTable('translations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull(),
  language: text('language').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('translations_client_scope_lang_idx').on(table.clientId, table.scope, table.language),
]);

// =============================================
// Module Collecte de Valeur — Configuration
// =============================================

export const moduleCvSurveyTypes = pgTable('module_cv_survey_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_survey_types_client_module_id_idx').on(table.clientModuleId),
]);

export const moduleCvFieldDefinitions = pgTable('module_cv_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fieldType: text('field_type').notNull(),
  description: text('description'),
  listId: uuid('list_id').references(() => lists.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true).notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_field_definitions_survey_type_id_idx').on(table.surveyTypeId),
]);

export const moduleCvStatuses = pgTable('module_cv_statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  displayOrder: integer('display_order').default(0).notNull(),
  isInitial: boolean('is_initial').default(false).notNull(),
  isFinal: boolean('is_final').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_statuses_survey_type_id_idx').on(table.surveyTypeId),
]);

export const moduleCvStatusTransitions = pgTable('module_cv_status_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  fromStatusId: uuid('from_status_id').notNull().references(() => moduleCvStatuses.id, { onDelete: 'cascade' }),
  toStatusId: uuid('to_status_id').notNull().references(() => moduleCvStatuses.id, { onDelete: 'cascade' }),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_status_transitions_survey_type_id_idx').on(table.surveyTypeId),
  index('module_cv_status_transitions_from_status_idx').on(table.fromStatusId),
]);

export const moduleCvStatusTransitionRoles = pgTable('module_cv_status_transition_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  transitionId: uuid('transition_id').notNull().references(() => moduleCvStatusTransitions.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_status_transition_roles_transition_id_idx').on(table.transitionId),
]);

export const moduleCvForms = pgTable('module_cv_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  statusId: uuid('status_id').notNull().references(() => moduleCvStatuses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_forms_survey_type_id_idx').on(table.surveyTypeId),
  index('module_cv_forms_survey_status_idx').on(table.surveyTypeId, table.statusId),
]);

export const moduleCvFormFields = pgTable('module_cv_form_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => moduleCvForms.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  isRequired: boolean('is_required').default(false).notNull(),
  visibilityConditions: jsonb('visibility_conditions'),
  conditionalColoring: jsonb('conditional_coloring'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_form_fields_form_id_idx').on(table.formId),
]);

export const moduleCvFormDisplayConfigs = pgTable('module_cv_form_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => moduleCvForms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_form_display_configs_form_id_idx').on(table.formId),
]);

export const moduleCvFormDisplayConfigRoles = pgTable('module_cv_form_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvFormDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_form_display_config_roles_config_id_idx').on(table.displayConfigId),
  index('module_cv_form_display_config_roles_role_id_idx').on(table.moduleRoleId),
]);

export const moduleCvFormDisplayConfigFields = pgTable('module_cv_form_display_config_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvFormDisplayConfigs.id, { onDelete: 'cascade' }),
  formFieldId: uuid('form_field_id').notNull().references(() => moduleCvFormFields.id, { onDelete: 'cascade' }),
  canView: boolean('can_view').default(false).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_form_display_config_fields_config_id_idx').on(table.displayConfigId),
]);

// --- CV Listing display configs (tableaux campagnes/réponses) ---

export const moduleCvDisplayConfigs = pgTable('module_cv_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filters: jsonb('filters'),
  preFilters: jsonb('pre_filters'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_display_configs_client_module_id_idx').on(table.clientModuleId),
]);

export const moduleCvDisplayConfigRoles = pgTable('module_cv_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_display_config_roles_config_id_idx').on(table.displayConfigId),
]);

export const moduleCvDisplayConfigFields = pgTable('module_cv_display_config_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvDisplayConfigs.id, { onDelete: 'cascade' }),
  fieldSlug: text('field_slug'),
  cvFieldDefinitionId: uuid('cv_field_definition_id').references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  showInTable: boolean('show_in_table').default(false).notNull(),
  showInExport: boolean('show_in_export').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_display_config_fields_config_id_idx').on(table.displayConfigId),
]);

export const moduleCvValidationRules = pgTable('module_cv_validation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  ruleType: text('rule_type').notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_validation_rules_survey_type_id_idx').on(table.surveyTypeId),
]);

// =============================================
// Module Collecte de Valeur — Exécution
// =============================================

export const moduleCvCampaigns = pgTable('module_cv_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  referenceYear: integer('reference_year').notNull(),
  prefillCampaignId: uuid('prefill_campaign_id').references((): any => moduleCvCampaigns.id, { onDelete: 'set null' }),
  status: text('status').default('open').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_campaigns_survey_type_id_idx').on(table.surveyTypeId),
]);

export const moduleCvCampaignTargets = pgTable('module_cv_campaign_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => moduleCvCampaigns.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => eoEntities.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('module_cv_campaign_targets_campaign_id_idx').on(table.campaignId),
]);

export const moduleCvResponses = pgTable('module_cv_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => moduleCvCampaigns.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => eoEntities.id, { onDelete: 'cascade' }),
  statusId: uuid('status_id').notNull().references(() => moduleCvStatuses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_responses_campaign_id_idx').on(table.campaignId),
  index('module_cv_responses_campaign_eo_idx').on(table.campaignId, table.eoId),
]);

export const moduleCvResponseValues = pgTable('module_cv_response_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => moduleCvResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastModifiedBy: uuid('last_modified_by').references(() => accounts.id, { onDelete: 'set null' }),
}, (table) => [
  index('module_cv_response_values_response_id_idx').on(table.responseId),
  index('module_cv_response_values_response_field_idx').on(table.responseId, table.fieldDefinitionId),
]);

export const moduleCvFieldComments = pgTable('module_cv_field_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => moduleCvResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => accounts.id, { onDelete: 'set null' }),
}, (table) => [
  index('module_cv_field_comments_response_id_idx').on(table.responseId),
]);

export const moduleCvResponseDocuments = pgTable('module_cv_response_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => moduleCvResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').default(0).notNull(),
  mimeType: text('mime_type'),
  displayOrder: integer('display_order').default(0).notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  uploadedBy: uuid('uploaded_by').references(() => accounts.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('module_cv_response_documents_response_id_idx').on(table.responseId),
]);

export const moduleCvResponseAuditLog = pgTable('module_cv_response_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => moduleCvResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').references(() => moduleCvFieldDefinitions.id, { onDelete: 'set null' }),
  fieldName: text('field_name'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  changedBy: uuid('changed_by').references(() => accounts.id, { onDelete: 'set null' }),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_cv_response_audit_log_response_id_idx').on(table.responseId),
]);

// =============================================
// Module Organisation — Configuration d'affichage
// =============================================

export const moduleOrgDisplayConfigs = pgTable('module_org_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  defaultViewMode: text('default_view_mode').default('list').notNull(),
  filters: jsonb('filters'),
  preFilters: jsonb('pre_filters'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_org_display_configs_client_module_id_idx').on(table.clientModuleId),
]);

export const moduleOrgDisplayConfigRoles = pgTable('module_org_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleOrgDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_org_display_config_roles_config_id_idx').on(table.displayConfigId),
  index('module_org_display_config_roles_role_id_idx').on(table.moduleRoleId),
]);

export const moduleOrgDisplayConfigFields = pgTable('module_org_display_config_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleOrgDisplayConfigs.id, { onDelete: 'cascade' }),
  fieldSlug: text('field_slug'),
  eoFieldDefinitionId: uuid('eo_field_definition_id').references(() => eoFieldDefinitions.id, { onDelete: 'cascade' }),
  canEdit: boolean('can_edit').default(false).notNull(),
  showInTable: boolean('show_in_table').default(false).notNull(),
  showInDrawer: boolean('show_in_drawer').default(false).notNull(),
  showInExport: boolean('show_in_export').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_org_display_config_fields_config_id_idx').on(table.displayConfigId),
]);

// =============================================
// Module Users — Configuration d'affichage
// =============================================

export const moduleUsersDisplayConfigs = pgTable('module_users_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filters: jsonb('filters'),
  preFilters: jsonb('pre_filters'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_users_display_configs_client_module_id_idx').on(table.clientModuleId),
]);

export const moduleUsersDisplayConfigRoles = pgTable('module_users_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleUsersDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_users_display_config_roles_config_id_idx').on(table.displayConfigId),
  index('module_users_display_config_roles_role_id_idx').on(table.moduleRoleId),
]);

export const moduleUsersDisplayConfigFields = pgTable('module_users_display_config_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleUsersDisplayConfigs.id, { onDelete: 'cascade' }),
  fieldSlug: text('field_slug'),
  userFieldDefinitionId: uuid('user_field_definition_id').references(() => userFieldDefinitions.id, { onDelete: 'cascade' }),
  canEdit: boolean('can_edit').default(false).notNull(),
  showInTable: boolean('show_in_table').default(false).notNull(),
  showInDrawer: boolean('show_in_drawer').default(false).notNull(),
  showInExport: boolean('show_in_export').default(false).notNull(),
  isAnonymized: boolean('is_anonymized').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_users_display_config_fields_config_id_idx').on(table.displayConfigId),
]);

// =============================================
// Module Profils — Configuration d'affichage
// =============================================

export const moduleProfilsDisplayConfigs = pgTable('module_profils_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filters: jsonb('filters'),
  preFilters: jsonb('pre_filters'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_profils_display_configs_client_module_id_idx').on(table.clientModuleId),
]);

export const moduleProfilsDisplayConfigRoles = pgTable('module_profils_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleProfilsDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_profils_display_config_roles_config_id_idx').on(table.displayConfigId),
  index('module_profils_display_config_roles_role_id_idx').on(table.moduleRoleId),
]);

export const moduleProfilsDisplayConfigFields = pgTable('module_profils_display_config_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleProfilsDisplayConfigs.id, { onDelete: 'cascade' }),
  fieldSlug: text('field_slug').notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  showInTable: boolean('show_in_table').default(false).notNull(),
  showInDrawer: boolean('show_in_drawer').default(false).notNull(),
  showInExport: boolean('show_in_export').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('module_profils_display_config_fields_config_id_idx').on(table.displayConfigId),
]);
