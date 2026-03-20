import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  integer,
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

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  persona: systemPersonaEnum('persona').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const integratorClientAssignments = pgTable('integrator_client_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  persona: systemPersonaEnum('persona').notNull(),
  assignedBy: uuid('assigned_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userClientMemberships = pgTable('user_client_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  invitedBy: uuid('invited_by').references(() => profiles.id),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Modules & Rôles métier
// =============================================

export const clientModules = pgTable('client_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  moduleSlug: text('module_slug').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleRoles = pgTable('module_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const modulePermissions = pgTable('module_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  permissionSlug: text('permission_slug').notNull(),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  isGranted: boolean('is_granted').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleWorkflows = pgTable('module_workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Entités organisationnelles
// =============================================

export const organizationalEntities = pgTable('organizational_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  parentId: uuid('parent_id'),
  path: text('path').notNull().default(''),
  level: integer('level').notNull().default(0),
  slug: text('slug').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const eoFieldDefinitions = pgTable('eo_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  fieldType: text('field_type').notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  isUnique: boolean('is_unique').default(false).notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  isHidden: boolean('is_hidden').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  commentOnChange: text('comment_on_change').default('none').notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const eoFieldValues = pgTable('eo_field_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => eoFieldDefinitions.id, { onDelete: 'cascade' }),
  value: text('value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastModifiedBy: uuid('last_modified_by'),
});

export const eoGroups = pgTable('eo_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const eoGroupMembers = pgTable('eo_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => eoGroups.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  includeDescendants: boolean('include_descendants').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const eoFieldChangeComments = pgTable('eo_field_change_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => eoFieldDefinitions.id, { onDelete: 'cascade' }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const eoAuditLog = pgTable('eo_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  changedBy: uuid('changed_by'),
  changedFields: jsonb('changed_fields'),
  previousValues: jsonb('previous_values'),
  newValues: jsonb('new_values'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const eoExportHistory = pgTable('eo_export_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  exportedBy: uuid('exported_by'),
  exportedAt: timestamp('exported_at', { withTimezone: true }).defaultNow().notNull(),
  rowCount: integer('row_count'),
  fileName: text('file_name'),
});

// =============================================
// Profils (Templates)
// =============================================

export const profileTemplates = pgTable('profile_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userProfileTemplates = pgTable('user_profile_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => profileTemplates.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profileTemplateEos = pgTable('profile_template_eos', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => profileTemplates.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  includeDescendants: boolean('include_descendants').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profileTemplateEoGroups = pgTable('profile_template_eo_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => profileTemplates.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => eoGroups.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const profileTemplateModuleRoles = pgTable('profile_template_module_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => profileTemplates.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Champs utilisateur
// =============================================

export const userFieldDefinitions = pgTable('user_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  fieldType: text('field_type').notNull().default('text'),
  description: text('description'),
  isRequired: boolean('is_required').default(false).notNull(),
  isUnique: boolean('is_unique').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isUserEditable: boolean('is_user_editable').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  options: jsonb('options').default([]),
  settings: jsonb('settings'),
  defaultValue: jsonb('default_value'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userFieldValues = pgTable('user_field_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => userFieldDefinitions.id, { onDelete: 'cascade' }),
  value: jsonb('value'),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Navigation
// =============================================

export const navigationConfigs = pgTable('navigation_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  label: text('label').notNull(),
  displayLabel: text('display_label'),
  slug: text('slug').notNull(),
  icon: text('icon'),
  type: text('type').default('group').notNull(),
  clientModuleId: uuid('client_module_id').references(() => clientModules.id, { onDelete: 'set null' }),
  url: text('url'),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
});

export const navPermissions = pgTable('nav_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  navigationConfigId: uuid('navigation_config_id').notNull().references(() => navigationConfigs.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id'),
  categoryId: uuid('category_id'),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Listes (référentiels)
// =============================================

export const referentials = pgTable('referentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  tag: text('tag'),
  isActive: boolean('is_active').default(true).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const referentialValues = pgTable('referential_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  referentialId: uuid('referential_id').notNull().references(() => referentials.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  code: text('code'),
  description: text('description'),
  color: text('color'),
  icon: text('icon'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  parentId: uuid('parent_id'),
  level: integer('level').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Design & i18n
// =============================================

export const clientDesignConfigs = pgTable('client_design_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  primaryColor: text('primary_color').default('#3B82F6').notNull(),
  secondaryColor: text('secondary_color').default('#6B7280').notNull(),
  textOnPrimary: text('text_on_primary').default('#FFFFFF').notNull(),
  textOnSecondary: text('text_on_secondary').default('#FFFFFF').notNull(),
  accentColor: text('accent_color'),
  borderRadius: integer('border_radius').default(8).notNull(),
  fontFamily: text('font_family').default('Inter').notNull(),
  logoUrl: text('logo_url'),
  appName: text('app_name'),
  fontSizeBase: integer('font_size_base'),
  fontWeightMain: text('font_weight_main'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const translations = pgTable('translations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull(),
  language: text('language').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

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
});

export const moduleCvFieldDefinitions = pgTable('module_cv_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  fieldType: text('field_type').notNull(),
  description: text('description'),
  referentialId: uuid('referential_id').references(() => referentials.id, { onDelete: 'set null' }),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvStatuses = pgTable('module_cv_statuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  color: text('color'),
  displayOrder: integer('display_order').default(0).notNull(),
  isInitial: boolean('is_initial').default(false).notNull(),
  isFinal: boolean('is_final').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvStatusTransitions = pgTable('module_cv_status_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  fromStatusId: uuid('from_status_id').notNull().references(() => moduleCvStatuses.id, { onDelete: 'cascade' }),
  toStatusId: uuid('to_status_id').notNull().references(() => moduleCvStatuses.id, { onDelete: 'cascade' }),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvStatusTransitionRoles = pgTable('module_cv_status_transition_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  transitionId: uuid('transition_id').notNull().references(() => moduleCvStatusTransitions.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvForms = pgTable('module_cv_forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  statusId: uuid('status_id').notNull().references(() => moduleCvStatuses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvFormFields = pgTable('module_cv_form_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => moduleCvForms.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  isRequired: boolean('is_required').default(false).notNull(),
  visibilityConditions: jsonb('visibility_conditions'),
  conditionalColoring: jsonb('conditional_coloring'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvFormDisplayConfigs = pgTable('module_cv_form_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  formId: uuid('form_id').notNull().references(() => moduleCvForms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvFormDisplayConfigRoles = pgTable('module_cv_form_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvFormDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvFormDisplayConfigFields = pgTable('module_cv_form_display_config_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvFormDisplayConfigs.id, { onDelete: 'cascade' }),
  formFieldId: uuid('form_field_id').notNull().references(() => moduleCvFormFields.id, { onDelete: 'cascade' }),
  canView: boolean('can_view').default(false).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- CV Listing display configs (tableaux campagnes/réponses) ---

export const moduleCvDisplayConfigs = pgTable('module_cv_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filters: jsonb('filters'),
  preFilters: jsonb('pre_filters'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvDisplayConfigRoles = pgTable('module_cv_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvDisplayConfigFields = pgTable('module_cv_display_config_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleCvDisplayConfigs.id, { onDelete: 'cascade' }),
  fieldSlug: text('field_slug'),
  cvFieldDefinitionId: uuid('cv_field_definition_id').references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  showInTable: boolean('show_in_table').default(false).notNull(),
  showInExport: boolean('show_in_export').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvValidationRules = pgTable('module_cv_validation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  ruleType: text('rule_type').notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Module Collecte de Valeur — Exécution
// =============================================

export const moduleCvCampaigns = pgTable('module_cv_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyTypeId: uuid('survey_type_id').notNull().references(() => moduleCvSurveyTypes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  referenceYear: integer('reference_year').notNull(),
  prefillCampaignId: uuid('prefill_campaign_id'),
  status: text('status').default('draft').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvCampaignTargets = pgTable('module_cv_campaign_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => moduleCvCampaigns.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvResponses = pgTable('module_cv_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => moduleCvCampaigns.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  statusId: uuid('status_id').notNull().references(() => moduleCvStatuses.id),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  submittedBy: uuid('submitted_by').references(() => profiles.id, { onDelete: 'set null' }),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  validatedBy: uuid('validated_by').references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleCvResponseValues = pgTable('module_cv_response_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => moduleCvResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastModifiedBy: uuid('last_modified_by'),
});

export const moduleCvFieldComments = pgTable('module_cv_field_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => moduleCvResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => moduleCvFieldDefinitions.id, { onDelete: 'cascade' }),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
});

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
  uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
});

export const moduleCvResponseAuditLog = pgTable('module_cv_response_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => moduleCvResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').references(() => moduleCvFieldDefinitions.id, { onDelete: 'set null' }),
  fieldName: text('field_name'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: uuid('changed_by').references(() => profiles.id, { onDelete: 'set null' }),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
});

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
});

export const moduleOrgDisplayConfigRoles = pgTable('module_org_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleOrgDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
});

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
});

export const moduleUsersDisplayConfigRoles = pgTable('module_users_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleUsersDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
});

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
});

export const moduleProfilsDisplayConfigRoles = pgTable('module_profils_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleProfilsDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

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
});
