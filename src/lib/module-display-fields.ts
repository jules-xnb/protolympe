/**
 * Per-module display field definitions.
 * Defines which fields, tabs, and defaults are available
 * for each module's display configuration.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleField {
  id: string;
  name: string;
  /** If true, the field cannot be hidden or reordered */
  locked?: boolean;
  /** If true, the field is not editable in the drawer */
  readOnly?: boolean;
  /** Default visibility in columns */
  defaultVisible?: boolean;
}

export type DisplayTab = 'general' | 'views' | 'columns' | 'drawer' | 'filters' | 'prefilters' | 'anonymization' | 'gestionnaire' | 'repondant';

export interface ModuleDisplayDefinition {
  fields: ModuleField[];
  tabs: DisplayTab[];
  /** Available view modes (only for modules that have view switcher) */
  availableViews?: ('list' | 'tree' | 'canvas')[];
  defaultView?: 'list' | 'tree' | 'canvas';
}

// ---------------------------------------------------------------------------
// Definitions per module
// ---------------------------------------------------------------------------

const ORGANISATION_FIELDS: ModuleField[] = [
  { id: 'name', name: 'Nom', defaultVisible: true },
  { id: 'code', name: 'Code', defaultVisible: true },
  { id: 'description', name: 'Description' },
  { id: 'email', name: 'Email' },
  { id: 'phone', name: 'Téléphone' },
  { id: 'website', name: 'Site web' },
  { id: 'address', name: 'Adresse' },
  { id: 'city', name: 'Ville' },
  { id: 'postal_code', name: 'Code postal' },
  { id: 'country', name: 'Pays' },
  { id: 'manager_name', name: 'Manager' },
  { id: 'cost_center', name: 'Centre de coût' },
  { id: 'employee_count', name: 'Effectif' },
  { id: 'is_active', name: 'Actif', defaultVisible: true },
  { id: 'level', name: 'Niveau', defaultVisible: true, readOnly: true },
  { id: 'parent', name: 'Parent', defaultVisible: true, readOnly: true },
];

const USER_FIELDS: ModuleField[] = [
  { id: 'full_name', name: 'Utilisateur', defaultVisible: true, locked: true },
  { id: 'email', name: 'Email', defaultVisible: true },
  { id: 'status', name: 'Statut', defaultVisible: true },
  { id: 'profiles', name: 'Profils', defaultVisible: true },
  { id: 'member_since', name: 'Membre depuis', defaultVisible: true, readOnly: true },
];

const PROFILS_FIELDS: ModuleField[] = [
  { id: 'name', name: 'Nom', defaultVisible: true, locked: true },
  { id: 'roles', name: 'Rôles', defaultVisible: true, readOnly: true },
  { id: 'eos', name: 'Entités organisationnelles', defaultVisible: true, readOnly: true },
  { id: 'groups', name: 'Regroupements', defaultVisible: true, readOnly: true },
  { id: 'user_count', name: "Nombre d'utilisateurs", defaultVisible: true, readOnly: true },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const MODULE_DISPLAY_DEFINITIONS: Record<string, ModuleDisplayDefinition> = {
  organisation: {
    fields: ORGANISATION_FIELDS,
    tabs: ['general', 'views', 'columns', 'drawer', 'filters', 'prefilters'],
    availableViews: ['list', 'tree', 'canvas'],
    defaultView: 'list',
  },
  user: {
    fields: USER_FIELDS,
    tabs: ['general', 'columns', 'drawer', 'filters', 'anonymization'],
  },
  profils: {
    fields: PROFILS_FIELDS,
    tabs: ['general', 'columns', 'drawer'],
  },
  collecte_valeur: {
    fields: [],
    tabs: ['general', 'gestionnaire', 'repondant'],
  },
};

export function getModuleDisplayDefinition(moduleSlug: string): ModuleDisplayDefinition | undefined {
  return MODULE_DISPLAY_DEFINITIONS[moduleSlug];
}

// ---------------------------------------------------------------------------
// Helpers — build default config from definition
// ---------------------------------------------------------------------------

export interface ListColumn {
  field_id: string;
  field_name: string;
  visible: boolean;
}

export interface DrawerField {
  field_id: string;
  field_name: string;
  visible: boolean;
  editable: boolean;
}

export interface FilterField {
  field_id: string;
  field_name: string;
}

export interface Prefilter {
  field_id: string;
  field_name: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  value?: string;
  is_user_editable: boolean;
}

export type UserAnonymizableField = 'first_name' | 'last_name' | 'email' | 'profile';

export interface UserFieldAnonymization {
  field: UserAnonymizableField;
}

export interface GestionnaireConfig {
  show_all_surveys: boolean;
  show_my_surveys: boolean;
  group_by_status: boolean;
  columns_visible?: string[];
  enable_validation_workflow: boolean;
  full_page: boolean;
}

export interface RepondantConfig {
  show_pending: boolean;
  show_submitted: boolean;
  show_validated: boolean;
  show_rejected: boolean;
  group_by_campaign: boolean;
  show_deadline: boolean;
  show_progress: boolean;
  allow_draft: boolean;
  show_validation_queue: boolean;
  enable_history: boolean;
  full_page: boolean;
}

export interface DrawerSection {
  id: string;
  name: string;
  fields: DrawerField[];
}

export interface DisplayConfigData {
  available_views?: ('list' | 'tree' | 'canvas')[];
  default_view?: 'list' | 'tree' | 'canvas';
  list_columns?: ListColumn[];
  filters?: FilterField[];
  prefilters?: Prefilter[];
  /** @deprecated Use drawer_system_fields, drawer_sections, drawer_unassigned_fields */
  drawer_fields?: DrawerField[];
  drawer_system_fields?: DrawerField[];
  drawer_sections?: DrawerSection[];
  drawer_unassigned_fields?: DrawerField[];
  anonymization?: UserFieldAnonymization[];
  gestionnaire?: GestionnaireConfig;
  repondant?: RepondantConfig;
}

const DEFAULT_GESTIONNAIRE: GestionnaireConfig = {
  show_all_surveys: true,
  show_my_surveys: true,
  group_by_status: false,
  enable_validation_workflow: false,
  full_page: false,
};

const DEFAULT_REPONDANT: RepondantConfig = {
  show_pending: true,
  show_submitted: false,
  show_validated: false,
  show_rejected: true,
  group_by_campaign: false,
  show_deadline: true,
  show_progress: true,
  allow_draft: true,
  show_validation_queue: false,
  enable_history: false,
  full_page: false,
};

export function buildDefaultConfig(moduleSlug: string): DisplayConfigData {
  const def = MODULE_DISPLAY_DEFINITIONS[moduleSlug];
  if (!def) return {};

  if (moduleSlug === 'collecte_valeur') {
    return {
      gestionnaire: { ...DEFAULT_GESTIONNAIRE },
      repondant: { ...DEFAULT_REPONDANT },
    };
  }

  const config: DisplayConfigData = {};

  if (def.availableViews) {
    config.available_views = [...def.availableViews];
    config.default_view = def.defaultView ?? def.availableViews[0];
  }

  if (def.fields.length > 0) {
    config.list_columns = def.fields.map((f) => ({
      field_id: f.id,
      field_name: f.name,
      visible: f.defaultVisible ?? false,
    }));

    // New drawer structure
    const SYSTEM_FIELD_IDS = ['name', 'parent', 'level', 'is_active'];
    const SYSTEM_FIELD_ORDER = ['name', 'parent', 'level', 'is_active'];
    const systemFields = SYSTEM_FIELD_ORDER
      .map(id => def.fields.find(f => f.id === id))
      .filter((f): f is ModuleField => f !== undefined);
    const otherFields = def.fields.filter((f) => !SYSTEM_FIELD_IDS.includes(f.id));

    config.drawer_system_fields = systemFields.map((f) => ({
      field_id: f.id,
      field_name: f.name,
      visible: true,
      editable: f.id !== 'name' && !f.readOnly,
    }));

    config.drawer_sections = [];

    config.drawer_unassigned_fields = otherFields.map((f) => ({
      field_id: f.id,
      field_name: f.name,
      visible: true,
      editable: !f.readOnly,
    }));
  }

  config.filters = [];
  config.prefilters = [];

  if (moduleSlug === 'user') {
    config.anonymization = [];
  }

  return config;
}

export function mergeWithDefaults(raw: Record<string, unknown>, moduleSlug: string): DisplayConfigData {
  const defaults = buildDefaultConfig(moduleSlug);

  // Backward compat: migrate old drawer_fields to new structure
  let drawerSystemFields = raw.drawer_system_fields as DrawerField[] | undefined;
  let drawerSections = raw.drawer_sections as DrawerSection[] | undefined;
  let drawerUnassignedFields = raw.drawer_unassigned_fields as DrawerField[] | undefined;

  if (!drawerSystemFields && !drawerSections && !drawerUnassignedFields && raw.drawer_fields) {
    const oldFields = raw.drawer_fields as DrawerField[];
    const SYSTEM_FIELD_IDS = ['name', 'parent', 'level', 'is_active'];
    drawerSystemFields = oldFields.filter((f) => SYSTEM_FIELD_IDS.includes(f.field_id));
    drawerSections = [];
    drawerUnassignedFields = oldFields.filter((f) => !SYSTEM_FIELD_IDS.includes(f.field_id));
  }

  return {
    available_views: (raw.available_views as DisplayConfigData['available_views']) ?? defaults.available_views,
    default_view: (raw.default_view as DisplayConfigData['default_view']) ?? defaults.default_view,
    list_columns: (raw.list_columns as ListColumn[]) ?? defaults.list_columns,
    filters: (raw.filters as FilterField[]) ?? defaults.filters,
    prefilters: (raw.prefilters as Prefilter[]) ?? defaults.prefilters,
    drawer_system_fields: drawerSystemFields ?? defaults.drawer_system_fields,
    drawer_sections: drawerSections ?? defaults.drawer_sections,
    drawer_unassigned_fields: drawerUnassignedFields ?? defaults.drawer_unassigned_fields,
    anonymization: (raw.anonymization as UserFieldAnonymization[]) ?? defaults.anonymization,
    gestionnaire: (raw.gestionnaire as GestionnaireConfig) ?? defaults.gestionnaire,
    repondant: (raw.repondant as RepondantConfig) ?? defaults.repondant,
  };
}
