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

// --- Enums ---

export const systemPersonaEnum = pgEnum('system_persona', [
  'admin_delta',
  'integrator_delta',
  'integrator_external',
]);

// --- Tables ---

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userSystemRoles = pgTable('user_system_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  persona: systemPersonaEnum('persona').notNull(),
  createdBy: uuid('created_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
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

// --- Module System Tables ---

export const clientModules = pgTable('client_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  moduleSlug: text('module_slug').notNull(),
  config: jsonb('config').default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleRoles = pgTable('module_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
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

export const businessObjectDefinitions = pgTable('business_object_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  icon: text('icon').default('file'),
  color: text('color').default('#3B82F6'),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
});

export const moduleBoLinks = pgTable('module_bo_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  boDefinitionId: uuid('bo_definition_id').notNull().references(() => businessObjectDefinitions.id, { onDelete: 'cascade' }),
  config: jsonb('config'),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleDisplayConfigs = pgTable('module_display_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientModuleId: uuid('client_module_id').notNull().references(() => clientModules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  config: jsonb('config').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const moduleDisplayConfigRoles = pgTable('module_display_config_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  displayConfigId: uuid('display_config_id').notNull().references(() => moduleDisplayConfigs.id, { onDelete: 'cascade' }),
  moduleRoleId: uuid('module_role_id').notNull().references(() => moduleRoles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const navigationConfigs = pgTable('navigation_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  label: text('label').notNull(),
  displayLabel: text('display_label'),
  slug: text('slug').notNull(),
  icon: text('icon'),
  type: text('type').default('group').notNull(),
  viewConfigId: uuid('view_config_id'), // FK added via ALTER TABLE (forward ref to view_configs)
  clientModuleId: uuid('client_module_id').references(() => clientModules.id, { onDelete: 'set null' }),
  url: text('url'),
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
});

// =============================================
// Organizational Entities
// =============================================

export const organizationalEntities = pgTable('organizational_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  description: text('description'),
  parentId: uuid('parent_id'), // self-referencing, no .references()
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
// Roles
// =============================================

export const roleCategories = pgTable('role_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  isRequired: boolean('is_required').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  color: text('color'),
  isActive: boolean('is_active').default(true).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  categoryId: uuid('category_id').references(() => roleCategories.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userRoleAssignments = pgTable('user_role_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  assignedBy: uuid('assigned_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Business Objects
// =============================================

// Note: businessObjectDefinitions already exists above, but the task spec includes
// client_id, is_archived which we need to verify are present. They are — already defined.

export const businessObjects = pgTable('business_objects', {
  id: uuid('id').primaryKey().defaultRandom(),
  definitionId: uuid('definition_id').notNull().references(() => businessObjectDefinitions.id, { onDelete: 'cascade' }),
  reference: text('reference').notNull(),
  status: text('status'),
  workflowId: uuid('workflow_id'), // FK added later after workflows table
  currentNodeId: uuid('current_node_id'), // FK added later after workflow_nodes table
  campaignId: uuid('campaign_id'), // FK added via ALTER TABLE (forward ref to survey_campaigns)
  eoId: uuid('eo_id').references(() => organizationalEntities.id),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => profiles.id),
  isArchived: boolean('is_archived').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fieldDefinitions = pgTable('field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  boDefinitionId: uuid('bo_definition_id').notNull().references(() => businessObjectDefinitions.id, { onDelete: 'cascade' }),
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
  parentFieldId: uuid('parent_field_id'), // self-referencing, FK via ALTER TABLE
  calculationFormula: text('calculation_formula'),
  isReadonly: boolean('is_readonly').default(false).notNull(),
  placeholder: text('placeholder'),
  referentialId: uuid('referential_id'), // FK added via ALTER TABLE (forward ref to referentials)
  validationRules: jsonb('validation_rules'),
  visibilityConditions: jsonb('visibility_conditions'),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const objectFieldValues = pgTable('object_field_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessObjectId: uuid('business_object_id').notNull().references(() => businessObjects.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => fieldDefinitions.id, { onDelete: 'cascade' }),
  value: text('value'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastModifiedBy: uuid('last_modified_by'),
});

export const boDocuments = pgTable('bo_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessObjectId: uuid('business_object_id').notNull().references(() => businessObjects.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => fieldDefinitions.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').default(0).notNull(),
  mimeType: text('mime_type'),
  displayOrder: integer('display_order').default(0).notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  uploadedBy: uuid('uploaded_by'),
});

export const boFieldValueAuditLog = pgTable('bo_field_value_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessObjectId: uuid('business_object_id').notNull().references(() => businessObjects.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').references(() => fieldDefinitions.id),
  fieldName: text('field_name'),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedBy: uuid('changed_by'),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const objectReferenceSequences = pgTable('object_reference_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  definitionId: uuid('definition_id').notNull().references(() => businessObjectDefinitions.id, { onDelete: 'cascade' }),
  prefix: text('prefix').notNull(),
  currentValue: integer('current_value').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Workflows
// =============================================

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  boDefinitionId: uuid('bo_definition_id').references(() => businessObjectDefinitions.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workflowNodes = pgTable('workflow_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nodeType: text('node_type').notNull(),
  positionX: integer('position_x').default(0).notNull(),
  positionY: integer('position_y').default(0).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workflowTransitions = pgTable('workflow_transitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  fromNodeId: uuid('from_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  toNodeId: uuid('to_node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  label: text('label'),
  condition: jsonb('condition'),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nodeSections = pgTable('node_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeId: uuid('node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const nodeFields = pgTable('node_fields', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeId: uuid('node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => fieldDefinitions.id, { onDelete: 'cascade' }),
  isEditable: boolean('is_editable').default(true).notNull(),
  isRequired: boolean('is_required').default(false).notNull(),
  isVisible: boolean('is_visible').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  sectionId: uuid('section_id').references(() => nodeSections.id, { onDelete: 'set null' }),
  isRequiredOverride: boolean('is_required_override'),
  settings: jsonb('settings'),
  visibilityCondition: jsonb('visibility_condition'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const nodeFieldRoleOverrides = pgTable('node_field_role_overrides', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeFieldId: uuid('node_field_id').notNull().references(() => nodeFields.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  isEditable: boolean('is_editable'),
  isVisible: boolean('is_visible'),
  isRequired: boolean('is_required'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const nodeRolePermissions = pgTable('node_role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  nodeId: uuid('node_id').notNull().references(() => workflowNodes.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  canView: boolean('can_view').default(false).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  canExecuteTransition: boolean('can_execute_transition').default(false).notNull(),
});

// =============================================
// Surveys & Campaigns
// =============================================

export const surveys = pgTable('surveys', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  boDefinitionId: uuid('bo_definition_id').references(() => businessObjectDefinitions.id, { onDelete: 'set null' }),
  settings: jsonb('settings'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const surveyCampaigns = pgTable('survey_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyId: uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('draft').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const surveyCampaignTargets = pgTable('survey_campaign_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => surveyCampaigns.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const surveyResponses = pgTable('survey_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => surveyCampaigns.id, { onDelete: 'cascade' }),
  businessObjectId: uuid('business_object_id').references(() => businessObjects.id, { onDelete: 'set null' }),
  respondentEoId: uuid('respondent_eo_id').notNull().references(() => organizationalEntities.id),
  status: text('status').default('pending'),
  currentStepId: uuid('current_step_id'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const surveyFieldComments = pgTable('survey_field_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  responseId: uuid('response_id').notNull().references(() => surveyResponses.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => fieldDefinitions.id, { onDelete: 'cascade' }),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const surveyValidationRules = pgTable('survey_validation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyId: uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').references(() => fieldDefinitions.id, { onDelete: 'cascade' }),
  ruleType: text('rule_type'),
  config: jsonb('config'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const surveyResponsePermissions = pgTable('survey_response_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyId: uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  canView: boolean('can_view').default(false).notNull(),
  canEdit: boolean('can_edit').default(false).notNull(),
  canValidate: boolean('can_validate').default(false).notNull(),
});

// =============================================
// Profiles (Templates)
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

export const profileTemplateRoles = pgTable('profile_template_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => profileTemplates.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// View & Navigation
// =============================================

export const viewConfigs = pgTable('view_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  boDefinitionId: uuid('bo_definition_id').references(() => businessObjectDefinitions.id, { onDelete: 'set null' }),
  config: jsonb('config'),
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by'),
});

export const viewConfigWidgets = pgTable('view_config_widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  viewConfigId: uuid('view_config_id').notNull().references(() => viewConfigs.id, { onDelete: 'cascade' }),
  widgetType: text('widget_type').notNull(),
  title: text('title'),
  config: jsonb('config'),
  positionX: integer('position_x').default(0).notNull(),
  positionY: integer('position_y').default(0).notNull(),
  width: integer('width').default(1).notNull(),
  height: integer('height').default(1).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const viewPermissions = pgTable('view_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  viewConfigId: uuid('view_config_id').notNull().references(() => viewConfigs.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => roleCategories.id, { onDelete: 'cascade' }),
  canView: boolean('can_view').default(false),
  fieldOverrides: jsonb('field_overrides'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const navPermissions = pgTable('nav_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  navigationConfigId: uuid('navigation_config_id').notNull().references(() => navigationConfigs.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => roleCategories.id, { onDelete: 'cascade' }),
  isVisible: boolean('is_visible').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// Reference Data
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
  parentId: uuid('parent_id'), // self-referencing
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
// Tiers
// =============================================

export const tiers = pgTable('tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  level: integer('level').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================
// User Fields & EO Assignments
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

export const userEoAssignments = pgTable('user_eo_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  eoId: uuid('eo_id').notNull().references(() => organizationalEntities.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  assignedBy: uuid('assigned_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
