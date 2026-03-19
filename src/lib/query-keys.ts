// Centralized query keys for react-query cache management.
// Every queryKey used in the app should be referenced from here.

export const queryKeys = {
  // ── Business Objects ───────────────────────────────────────────────────
  businessObjects: {
    crudKey: 'business_objects' as const,
    all: () => ['business_objects'] as const,
    byDefinition: (defId: string, page?: number, pageSize?: number, fieldDefsKey?: string) =>
      ['business_objects', defId, page, pageSize, fieldDefsKey] as const,
    archived: (defId?: string) => defId ? ['business_objects_archived', defId] as const : ['business_objects_archived'] as const,
    withFields: (defId: string, page: number, pageSize: number, prefilters: unknown) =>
      ['business_objects_with_fields', defId, page, pageSize, prefilters] as const,
    detail: (id: string) => ['business_object', id] as const,
    fieldValues: (boId: string) => ['object_field_values', boId] as const,
    list: (boDefId?: string) => boDefId ? ['business_objects_list', boDefId] as const : ['business_objects_list'] as const,
    count: (boDefId?: string, searchQuery?: string) =>
      boDefId
        ? ['business_objects_count', boDefId, searchQuery] as const
        : ['business_objects_count'] as const,
    countUnfiltered: (boDefId: string) => ['business_objects_count_unfiltered', boDefId] as const,
    listPaginated: (boDefId: string, page: number, pageSize: number, sortField?: string, sortDir?: string, searchQuery?: string) =>
      ['business_objects', boDefId, page, pageSize, sortField, sortDir, searchQuery] as const,
    campaignNames: (itemIds: string[]) => ['bo_campaign_names', itemIds] as const,
  },

  // ── Business Object Definitions ────────────────────────────────────────
  businessObjectDefinitions: {
    crudKey: 'business_object_definitions' as const,
    all: (clientId?: string) => ['business_object_definitions', clientId] as const,
    detail: (id: string) => ['business_object_definition', id] as const,
    list: (clientId?: string) => clientId ? ['bo_definitions_list', clientId] as const : ['bo_definitions_list'] as const,
    map: () => ['bo_definitions_map'] as const,
  },

  // ── Field Definitions ──────────────────────────────────────────────────
  fieldDefinitions: {
    crudKey: 'field_definitions' as const,
    byObject: (objectDefId: string) => ['field_definitions', objectDefId] as const,
    archived: (objectDefId: string) => ['field_definitions', 'archived', objectDefId] as const,
    multiple: (boDefIds: string[]) => ['field_definitions_multiple', boDefIds] as const,
    forPermissions: (boDefId: string) => ['field_definitions_for_permissions', boDefId] as const,
    forColumns: (boDefId: string) => ['field_definitions_for_columns', boDefId] as const,
  },

  // ── BO Field Definitions ───────────────────────────────────────────────
  boFieldDefinitions: {
    byDefinition: (boDefId: string) => ['bo_field_definitions', boDefId] as const,
  },

  // ── BO Field Audit Log ─────────────────────────────────────────────────
  boFieldAuditLog: {
    byObject: (boId: string) => ['bo-field-audit-log', boId] as const,
    all: (defId: string, page: number, pageSize: number) => ['bo-field-audit-log-all', defId, page, pageSize] as const,
  },

  // ── BO Documents ───────────────────────────────────────────────────────
  boDocuments: {
    byObjectAndField: (boId: string, fieldDefId: string) => ['bo_documents', boId, fieldDefId] as const,
  },

  // ── BO Preview ─────────────────────────────────────────────────────────
  boPreview: {
    byDefinition: (boDefId: string, isCompact: boolean) => ['bo_preview', boDefId, isCompact] as const,
  },

  // ── Organizational Entities ────────────────────────────────────────────
  organizationalEntities: {
    all: () => ['organizational_entities', 'all'] as const,
    root: () => ['organizational_entities'] as const,
    byClient: (clientId: string) => ['organizational_entities', clientId] as const,
    detail: (id: string) => ['organizational_entities', id] as const,
    forDrawer: (eoId: string) => ['eo_for_drawer', eoId] as const,
    userEntities: (eoIds: string[]) => ['user_organizational_entities', eoIds] as const,
    userDescendants: (paths: string[], showChildren: boolean) => ['user_eo_descendants', paths, showChildren] as const,
    userEos: () => ['user_eos'] as const,
    progressiveRoots: (rootIds: string[]) => ['eo_progressive_roots', rootIds] as const,
    filteredByFields: (customRules: unknown, fixedPreFilters: unknown, baseEoIds: unknown) =>
      ['eo_filtered_by_fields', customRules, fixedPreFilters, baseEoIds] as const,
    /** @deprecated hyphenated variant used in eoAuditLog invalidation */
    hyphenated: () => ['organizational-entities'] as const,
  },

  // ── EO Field Definitions ───────────────────────────────────────────────
  eoFieldDefinitions: {
    crudKey: 'eo_field_definitions' as const,
    byClient: (clientId: string) => ['eo_field_definitions', clientId] as const,
    archived: (clientId: string) => ['eo_field_definitions_archived', clientId] as const,
    values: (eoId?: string) => eoId ? ['eo_field_values', eoId] as const : ['eo_field_values'] as const,
    valuesAll: (clientId?: string) => clientId ? ['eo_field_values_all', clientId] as const : ['eo_field_values_all'] as const,
    systemNameField: (clientId: string) => ['eo_system_name_field', clientId] as const,
    systemIsActiveField: (clientId: string) => ['eo_system_is_active_field', clientId] as const,
  },

  // ── EO Field Change Comments ───────────────────────────────────────────
  eoFieldChangeComments: {
    byEoAndField: (eoId: string, fieldDefId?: string) => ['eo_field_change_comments', eoId, fieldDefId] as const,
  },

  // ── EO Groups ──────────────────────────────────────────────────────────
  eoGroups: {
    byClient: (clientId: string) => ['eo_groups', clientId] as const,
  },

  // ── EO Group Members ──────────────────────────────────────────────────
  eoGroupMembers: {
    all: (groupIds: string[]) => ['eo_group_members', 'all', groupIds] as const,
    byGroup: (groupId: string) => ['eo_group_members', groupId] as const,
  },

  // ── EO Pagination ──────────────────────────────────────────────────────
  eoPagination: {
    sortFieldValues: (sortField: unknown, eoIds: string[]) => ['eo_sort_field_values', sortField, eoIds] as const,
    customFieldValues: (fieldIds: string[], eoIds: string[]) => ['eo_custom_field_values_for_list', fieldIds, eoIds] as const,
  },

  // ── EO Audit Log ───────────────────────────────────────────────────────
  eoAuditLog: {
    byEntity: (entityId: string) => ['eo-audit-log', entityId] as const,
    exportHistory: (clientId: string) => ['eo-export-history', clientId] as const,
    all: (clientId: string) => ['eo-audit-log-all', clientId] as const,
    /** underscore variant used in EoImportDialog invalidation */
    underscored: () => ['eo_audit_log'] as const,
  },

  // ── Listes ─────────────────────────────────────────────────────────────
  listes: {
    crudKey: 'listes' as const,
    withValues: (refId: string) => ['liste', refId] as const,
  },

  // ── Liste Values ───────────────────────────────────────────────────────
  listeValues: {
    byReferential: (refId: string) => ['liste_values', refId] as const,
    forBo: (refIds: string[]) => ['liste_values_for_bo', refIds] as const,
    batch: (refIds: string[]) => ['liste_values', 'batch', refIds] as const,
  },

  // ── Reference Objects ──────────────────────────────────────────────────
  referenceObjects: {
    byDefinition: (defId: string) => ['reference_objects', defId] as const,
  },

  // ── Clients ────────────────────────────────────────────────────────────
  clients: {
    all: () => ['clients'] as const,
    detail: (id: string) => ['clients', id] as const,
  },

  // ── Client Users ───────────────────────────────────────────────────────
  clientUsers: {
    byClient: (clientId?: string) => ['client-users', clientId] as const,
    roles: (clientId?: string) => ['client-roles', clientId] as const,
    eosForAssignment: (clientId?: string) => ['client-eos-for-assignment', clientId] as const,
  },

  // ── Client Design Config ──────────────────────────────────────────────
  clientDesignConfig: {
    root: () => ['client_design_configs'] as const,
    byClient: (clientId: string) => ['client_design_configs', clientId] as const,
  },

  // ── Admin Data ─────────────────────────────────────────────────────────
  adminData: {
    isAdmin: () => ['is-admin-delta'] as const,
    integrators: () => ['integrators'] as const,
    integratorAssignments: () => ['integrator-assignments'] as const,
    usersWithoutRole: () => ['users-without-role'] as const,
  },

  // ── Navigation Configs ─────────────────────────────────────────────────
  navigationConfigs: {
    all: () => ['navigation_configs'] as const,
    byClient: (clientId?: string) => ['navigation_configs', clientId] as const,
    byClientExplicit: (clientId: string) => ['navigation_configs', 'client', clientId] as const,
    byId: (id: string) => ['navigation_configs', 'by_id', id] as const,
    user: (clientId?: string, permContext?: unknown) => ['user_navigation_configs', clientId, permContext] as const,
  },

  // ── Nav Permissions ────────────────────────────────────────────────────
  navPermissions: {
    byConfig: (navConfigId: string) => ['nav_permissions', navConfigId] as const,
    all: (clientId?: string) => clientId ? ['all_nav_permissions', clientId] as const : ['all_nav_permissions'] as const,
    roleNames: (clientId?: string) => ['nav_permissions_role_names', clientId] as const,
  },

  // ── View Configs ───────────────────────────────────────────────────────
  viewConfigs: {
    all: () => ['view_configs'] as const,
    byClient: (clientId?: string) => ['view_configs', clientId] as const,
    detail: (id: string) => ['view_configs', 'detail', id] as const,
    widgets: (viewConfigId: string) => ['view_config_widgets', viewConfigId] as const,
    bySlug: (slug: string, clientId?: string) => ['view_config_by_slug', slug, clientId] as const,
    byId: (viewId: string) => ['view_config', viewId] as const,
    viewWidgets: (viewConfigId?: string) => ['view_widgets', viewConfigId] as const,
  },

  // ── View Permissions ───────────────────────────────────────────────────
  viewPermissions: {
    byConfig: (viewConfigId: string) => ['view_permissions', viewConfigId] as const,
    computed: (viewConfigId: string, userId: string) => ['computed_view_permissions', viewConfigId, userId] as const,
    all: () => ['view_permissions'] as const,
    inheritedRoles: (viewId: string, clientId: string) => ['view_inherited_roles', viewId, clientId] as const,
  },

  // ── User Permissions ───────────────────────────────────────────────────
  userPermissions: {
    context: (mode: unknown, profile: unknown, clientId?: string) =>
      ['user_permissions_context', mode, profile, clientId] as const,
    navItemVisibility: (navConfigId: string, context: unknown) =>
      ['nav_item_visibility', navConfigId, context] as const,
    filteredNavConfigs: (itemIds: string[], context: unknown, mode: unknown) =>
      ['filtered_nav_configs', itemIds, context, mode] as const,
  },

  // ── User EO Assignments ────────────────────────────────────────────────
  userEoAssignments: {
    byUser: (userId: string) => ['user-eo-assignments', userId] as const,
    byClient: (clientId?: string) => ['client-user-eo-assignments', clientId] as const,
  },

  // ── User Field Definitions ─────────────────────────────────────────────
  userFieldDefinitions: {
    crudKey: 'user_field_definitions' as const,
    byClient: (clientId: string) => ['user_field_definitions', clientId] as const,
    archived: (clientId: string) => ['user_field_definitions_archived', clientId] as const,
    values: (userId: string) => ['user_field_values', userId] as const,
    valuesBulk: (clientId?: string, userIds?: string[]) => ['user_field_values_bulk', clientId, userIds] as const,
  },

  // ── Profile Templates ──────────────────────────────────────────────────
  profileTemplates: {
    crudKey: 'profile_templates' as const,
    byClient: (clientId: string) => ['profile_templates', clientId] as const,
    detail: (templateId: string) => ['profile_template', templateId] as const,
    users: (templateId: string) => ['profile_template_users', templateId] as const,
    userTemplates: (userId?: string, clientId?: string) => ['user_profile_templates', userId, clientId] as const,
    userDetails: (templateId: string, userIds: string[]) => ['profile_template_user_details', templateId, userIds] as const,
  },

  // ── Workflows ──────────────────────────────────────────────────────────
  workflows: {
    all: () => ['workflows'] as const,
    byClient: (clientId?: string) => ['workflows', clientId] as const,
    byClientExplicit: (clientId: string) => ['workflows', 'client', clientId] as const,
    detail: (workflowId: string) => ['workflow', workflowId] as const,
    allClientRoles: (clientId: string) => ['all_client_roles', clientId] as const,
  },

  // ── Node Fields / Sections ─────────────────────────────────────────────
  nodeFields: {
    byNode: (nodeId: string) => ['node_fields', nodeId] as const,
  },
  nodeSections: {
    byNode: (nodeId: string) => ['node_sections', nodeId] as const,
  },

  // ── Surveys ────────────────────────────────────────────────────────────
  surveys: {
    byClient: (clientId?: string) => ['surveys', clientId] as const,
    detail: (id: string) => ['survey', id] as const,
    responsePermissions: (surveyId: string) => ['survey_response_permissions', surveyId] as const,
    validationRules: (surveyId: string) => ['survey_validation_rules', surveyId] as const,
    fields: (boDefId: string) => ['survey_fields', boDefId] as const,
    fieldsValidation: (boDefId: string) => ['survey_fields_validation', boDefId] as const,
    settingsForForm: (campaignId: string) => ['survey_settings_for_form', campaignId] as const,
    creatorWorkflows: (workflowIds: string[]) => ['survey_creator_workflows', workflowIds] as const,
  },

  // ── Survey Campaigns ───────────────────────────────────────────────────
  surveyCampaigns: {
    bySurvey: (surveyId: string) => ['survey_campaigns', surveyId] as const,
    detail: (id: string) => ['survey_campaign', id] as const,
    targets: (campaignId: string) => ['campaign_targets', campaignId] as const,
    previousOptions: (surveyId: string, excludeCampaignId?: string) =>
      ['previous_campaigns_options', surveyId, excludeCampaignId] as const,
    previousForSelect: (viewConfigId: string) => ['previous_campaigns_for_select', viewConfigId] as const,
    viewCampaigns: (viewConfigId: string) => ['view_campaigns', viewConfigId] as const,
    allCampaigns: () => ['all_campaigns'] as const,
    businessObjects: (campaignId: string) => ['campaign_business_objects', campaignId] as const,
  },

  // ── Survey Responses ───────────────────────────────────────────────────
  surveyResponses: {
    byCampaign: (campaignId: string) => ['campaign_responses', campaignId] as const,
    detail: (id: string) => ['survey_response', id] as const,
    fieldComments: (responseId: string) => ['response_field_comments', responseId] as const,
    myPending: (workflowIds: string[], eoIds: string[], roleIds: string[], includeClosed: boolean) =>
      ['my_pending_responses', workflowIds, eoIds, roleIds, includeClosed] as const,
    pendingValidation: () => ['responses_pending_validation'] as const,
    values: (boId: string) => ['response_values', boId] as const,
    valuesValidation: (boId: string) => ['response_values_validation', boId] as const,
    previousCampaignValues: (campaignId?: string, eoId?: string) =>
      ['previous_campaign_values', campaignId, eoId] as const,
    fieldDefinitions: (boDefId: string) => ['response_field_definitions', boDefId] as const,
    fieldValues: (boId: string) => ['response_field_values', boId] as const,
  },

  // ── Filtered Campaign Responses ────────────────────────────────────────
  filteredCampaignResponses: {
    byCampaign: (campaignId: string, eoIds: string[], roleIds: string[], showAll?: boolean) =>
      ['filtered_campaign_responses', campaignId, eoIds, roleIds, showAll] as const,
  },

  // ── Campaign Field Columns ─────────────────────────────────────────────
  campaignFieldColumns: {
    byCampaign: (campaignId: string, boCount: number, roleIds?: string[], showAll?: boolean) =>
      ['campaign_field_columns', campaignId, boCount, roleIds, showAll] as const,
  },

  // ── Campaign EO Filter ─────────────────────────────────────────────────
  campaignEoFilter: {
    filter: (customRules: unknown, baseEoIds: unknown) => ['campaign_eo_filter', customRules, baseEoIds] as const,
  },

  // ── Missing Roles ──────────────────────────────────────────────────────
  missingRoles: {
    byWorkflow: (workflowId: string, clientId: string) => ['missing_roles', workflowId, clientId] as const,
  },

  // ── Widgets ────────────────────────────────────────────────────────────
  widgets: {
    statsCard: (boDefId: string, metric: string) => ['stats_card', boDefId, metric] as const,
    chart: (boDefId: string, groupBy: string) => ['chart_widget', boDefId, groupBy] as const,
    recentItems: (boDefIds: string[], limit: number) => ['recent_items', boDefIds, limit] as const,
    table: (boDefId: string, limit: number) => ['table_widget', boDefId, limit] as const,
    calendar: (boDefId: string, month: unknown) => ['calendar_events', boDefId, month] as const,
    stats: (widgetId: string, boDefId: string, metric: string) => ['widget-stats', widgetId, boDefId, metric] as const,
    recent: (widgetId: string, boDefId: string, limit: number) => ['widget-recent', widgetId, boDefId, limit] as const,
  },

  // ── Related BO Fields ──────────────────────────────────────────────────
  relatedBoFields: {
    byIds: (ids: string[]) => ['related_bo_fields', ids] as const,
  },

  // ── Users for simulation / select ──────────────────────────────────────
  usersForSimulation: {
    byClient: (clientId: string) => ['users_for_simulation', clientId] as const,
    roles: (userId: string) => ['user_roles_simulation', userId] as const,
  },
  usersForSelect: {
    all: () => ['users_for_select'] as const,
  },
  eosForSelect: {
    all: () => ['eos_for_select'] as const,
  },

  // ── Modules ────────────────────────────────────────────────────────────
  modules: {
    catalog: () => ['modules', 'catalog'] as const,
    byClient: (clientId?: string) => ['modules', clientId] as const,
    detail: (id: string) => ['modules', 'detail', id] as const,
  },

  // ── Module Roles ───────────────────────────────────────────────────────
  moduleRoles: {
    byModule: (moduleId: string) => ['module_roles', moduleId] as const,
  },

  // ── Module Display Configs ─────────────────────────────────────────
  moduleDisplayConfigs: {
    byModule: (moduleId: string) => ['module_display_configs', moduleId] as const,
    detail: (id: string) => ['module_display_configs', 'detail', id] as const,
  },

  // ── Module Permissions ─────────────────────────────────────────────────
  modulePermissions: {
    byModule: (moduleId: string) => ['module_permissions', moduleId] as const,
  },

  // ── Module Workflows ───────────────────────────────────────────────────
  moduleWorkflows: {
    byModule: (moduleId: string) => ['module_workflows', moduleId] as const,
  },

  // ── Module BO Links ────────────────────────────────────────────────────
  moduleBoLinks: {
    byModule: (moduleId: string) => ['module_bo_links', moduleId] as const,
  },

  // ── Translations ────────────────────────────────────────────────────────
  translations: {
    byClientAndLang: (clientId?: string, language?: string) => ['translations', clientId, language] as const,
    byClient: (clientId?: string) => ['translations', clientId] as const,
    crudKey: 'translations' as const,
  },
} as const;
