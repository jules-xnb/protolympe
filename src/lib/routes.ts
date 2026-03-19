// ---------------------------------------------------------------------------
// Route constants — single source of truth for every navigable path.
// Do NOT use these in route *definitions* (App.tsx) — only for navigation.
// ---------------------------------------------------------------------------

/** Authentication routes (top-level, no layout). */
export const AUTH_ROUTES = {
  LOGIN: '/auth',
  RESET_PASSWORD: '/reset-password',
} as const;

/** Admin / platform-level routes (no clientId prefix). */
export const ADMIN_ROUTES = {
  CLIENTS: '/dashboard/admin/clients',
  INTEGRATORS: '/dashboard/admin/integrators',
} as const;

/**
 * Client-scoped routes — pass the value to `cp()` from `useClientPath`.
 *
 * Static routes are plain strings; dynamic routes are functions that return a
 * string so the caller can interpolate IDs.
 */
export const CLIENT_ROUTES = {
  // Entities
  ENTITIES: '/entities',
  ENTITIES_NEW: '/entities/new',
  ENTITIES_IMPORT: '/entities/import',
  ENTITIES_FIELDS: '/entities/fields',
  ENTITIES_FIELDS_IMPORT: '/entities/fields/import',
  ENTITIES_FIELDS_ARCHIVED: '/entities/fields/archived',
  ENTITIES_ARCHIVED: '/entities/archived',
  ENTITIES_HISTORY: '/entities/history',
  ENTITY_HISTORY: (entityId: string) => `/entities/${entityId}/history`,

  // Users
  USERS: '/users',
  USERS_IMPORT: '/users/import',
  USERS_FIELDS: '/users/fields',
  USERS_FIELDS_IMPORT: '/users/fields/import',
  USERS_FIELDS_ARCHIVED: '/users/fields/archived',

  // Profile Templates
  PROFILES: '/profiles',
  PROFILES_ARCHIVED: '/profiles/archived',

  // Roles
  ROLES: '/roles',
  ROLES_IMPORT: '/roles/import',
  ROLES_ARCHIVED: '/roles/archived',

  // Referentials
  REFERENTIALS: '/referentials',
  REFERENTIALS_IMPORT: '/referentials/import',
  REFERENTIALS_ARCHIVED: '/referentials/archived',

  // Business Objects
  BUSINESS_OBJECTS: '/business-objects',
  BUSINESS_OBJECTS_ARCHIVED: '/business-objects/archived',
  BUSINESS_OBJECTS_IMPORT: '/business-objects/import',
  BUSINESS_OBJECT_DETAIL: (id: string) => `/business-objects/${id}`,
  BUSINESS_OBJECT_STRUCTURE: (id: string) => `/business-objects/${id}/structure`,
  BUSINESS_OBJECT_ARCHIVED_FIELDS: (id: string) => `/business-objects/${id}/structure/archived`,
  BUSINESS_OBJECT_ARCHIVED_INSTANCES: (id: string) => `/business-objects/${id}/instances/archived`,
  BUSINESS_OBJECT_HISTORY: (id: string) => `/business-objects/${id}/history`,
  BUSINESS_OBJECT_IMPORT_INSTANCES: (id: string) => `/business-objects/${id}/import`,

  // Modules
  MODULES: '/modules',

  // Workflows
  WORKFLOWS: '/workflows',
  WORKFLOW_DETAIL: (id: string) => `/workflows/${id}`,

  // Design & Display
  DESIGN: '/design',

  // Translations
  TRANSLATIONS: '/translations',

  // User Final
  USER_HOME: '/user',
  USER_PROFILES: '/user/profiles',
  USER_PROFILES_ARCHIVED: '/user/profiles/archived',
  USER_SIMULATION_CONFIG: '/user/simulation-config',
  USER_MODULE: (moduleId: string) => `/user/modules/${moduleId}`,
  USER_VIEW: (slug: string) => `/user/views/${slug}`,
  USER_VIEW_EO: (slug: string, eoId: string) => `/user/views/${slug}/eo/${eoId}`,
  USER_WORKFLOW_FORMS: (workflowId: string) => `/user/workflow-forms/${workflowId}`,
  USER_BO: (boId: string, itemId: string) => `/user/bo/${boId}/${itemId}`,
  USER_SURVEY_NEW: '/user/surveys/new',
  USER_SURVEY_EDIT: (surveyId: string) => `/user/surveys/${surveyId}/edit`,
  USER_CAMPAIGN: (campaignId: string) => `/user/campaigns/${campaignId}`,
  USER_CAMPAIGN_IMPORT: (campaignId: string) => `/user/campaigns/${campaignId}/import`,
} as const;

/** Shared routes accessible from any mode (inside dashboard layout). */
export const SHARED_ROUTES = {
  SETTINGS: '/dashboard/settings',
  DESIGN_SYSTEM: '/dashboard/design-system',
} as const;
