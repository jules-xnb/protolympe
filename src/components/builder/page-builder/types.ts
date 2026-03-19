// Page Builder Types

// Re-export shared types from canonical location for backward compatibility
export {
  type BlockType,
  type StructureBlockType,
  type BusinessBlockType,
  STRUCTURE_BLOCK_TYPES,
  BUSINESS_BLOCK_TYPES,
  type PreFilterOperator,
  type FieldVisibilityCondition,
  type EoFieldKey,
  type SectionConfig,
  type StepFieldConfig,
  type ValidationStep,
  type UserAnonymizableField,
  type UserFieldAnonymization,
  type UsersBlockConfig,
  type ProfilesBlockConfig,
  type ProfileColumnKey,
  type ProfileColumnConfig,
} from '@/types/builder-types';

// Import shared types needed for local interfaces
import type {
  BlockType,
  PreFilterOperator,
  FieldVisibilityCondition,
  EoFieldKey,
  SectionConfig,
  StepFieldConfig,
  ValidationStep,
  UsersBlockConfig,
  ProfilesBlockConfig,
} from '@/types/builder-types';

export interface BlockPosition {
  colStart: number;  // 1-12
  colSpan: number;   // 1-12
  rowSpan: number;   // Number of row units (minimum 1, default 1)
  rowIndex: number;  // Position in the layout flow
  rowStart?: number; // Explicit grid row start (1-based)
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  position: BlockPosition;
  title?: string;
  isActive: boolean;
  parentId?: string; // ID of parent section/sub_section (for business blocks inside structure blocks)
}

export interface DataTableColumnConfig {
  field_id: string;
  field_name: string;
  width?: string;
  sortable?: boolean;
  // For related object fields
  source_field_id?: string;      // The object_reference field ID in the main BO
  source_field_name?: string;    // The object_reference field name (for display)
  related_bo_id?: string;        // The related BO definition ID
  related_bo_name?: string;      // The related BO name (for display)
}

export interface FilterConfig {
  field_id: string;
  field_name: string;
  field_type: string;
  // For related object fields
  source_field_id?: string;
  source_field_name?: string;
}

// Pre-filter configuration (fixed filters that users cannot modify)
export interface PreFilterConfig {
  field_id: string;
  field_name: string;
  field_type: string;
  operator: PreFilterOperator;
  value?: string | number | boolean;
  // For related object fields
  source_field_id?: string;
  source_field_name?: string;
}

// Creation form field configuration
export interface CreateFormFieldConfig {
  field_id: string;
  field_name: string;
  field_type: string;
  is_required?: boolean;
  is_readonly?: boolean;        // Field is visible but not editable (grayed out)
  is_hidden?: boolean;          // Field is completely hidden from user
  default_value?: string;
  // For user_reference: use the current logged-in user
  use_current_user?: boolean;
  // For eo_reference: use the current user's EO
  use_current_user_eo?: boolean;
  // Conditions that determine when this field is visible
  visibility_conditions?: FieldVisibilityCondition[];
}

// Create button configuration
export interface CreateButtonConfig {
  enabled: boolean;
  label?: string;                      // Button label (default: "Nouveau")
  form_fields?: CreateFormFieldConfig[]; // Fields to show in creation form
}

export interface DataTableBlockConfig {
  bo_definition_id?: string;
  columns?: DataTableColumnConfig[];
  filters?: FilterConfig[];           // Available user filters
  prefilters?: PreFilterConfig[];     // Fixed pre-filters (users cannot modify)
  create_button?: CreateButtonConfig; // Creation button config
  page_size?: number;
  enable_search?: boolean;
  enable_filters?: boolean;
}

export interface DataTableBlock extends BaseBlock {
  type: 'data_table';
  config: DataTableBlockConfig;
}

// EO Card Block - displays the current user's organizational entity
export type EoViewMode = 'list' | 'tree' | 'canvas';

export interface EoFieldVisibilityConfig {
  field: EoFieldKey;
  label: string;
  visible?: boolean;       // Whether the field is visible (true = visible, false = hidden)
  editable?: boolean;      // Whether the field is editable by end users (default true)
  is_custom?: boolean;     // Whether this is a custom field (not a base field)
}

// Filter configuration for EO custom fields
export interface EoFilterConfig {
  field_id: string;          // Custom field definition ID or native column name
  field_name: string;        // Field display name
  field_type: string;        // Field type (select, text, etc.)
  is_native?: boolean;       // True if this is a native DB column (not a custom field)
  is_locked?: boolean;       // True if derived from a user-editable prefilter (cannot be removed)
}

// Column configuration for EO list view
export interface EoListColumnConfig {
  field_id: string;          // Field key (e.g., 'name', 'code', 'city' or custom field ID)
  field_name: string;        // Field display name
  is_custom?: boolean;       // Whether this is a custom field
  visible?: boolean;         // Whether the column is visible (default: true, false = hidden)
}

// Pre-filter configuration for EO (default filters users cannot modify)
export interface EoPreFilterConfig {
  field_id: string;          // Custom field definition ID or native column name
  field_name: string;        // Field display name
  field_type: string;        // Field type
  operator: PreFilterOperator;
  value?: string | number | boolean;
  is_user_editable?: boolean; // If true, user can modify/remove this filter (default: false)
  is_native?: boolean;       // True if this is a native DB column (not a custom field)
}

export interface EoCardBlockConfig {
  // View modes
  available_views?: EoViewMode[];  // Which views are available (default: all)
  default_view?: EoViewMode;       // Default view mode (default: 'list')
  // Layout options
  full_page?: boolean;           // Use full page height for the block
  // Display options (legacy - still used for global toggles)
  show_hierarchy?: boolean;      // Show parent hierarchy
  show_contact_info?: boolean;   // Show email, phone, etc.
  show_address?: boolean;        // Show address fields
  show_metadata?: boolean;       // Show custom metadata
  show_manager?: boolean;        // Show manager name
  compact_mode?: boolean;        // Compact display mode
  // For list/tree/canvas: show children or just current EO
  show_children?: boolean;       // Show child EOs in hierarchy views
  // List view column configuration
  list_columns?: EoListColumnConfig[];  // Columns to show in list view
  // List view pagination
  list_page_size?: 10 | 25 | 50; // Number of items per page (default: 25)
  // Search bar
  enable_search?: boolean;       // Enable search bar in list and tree views
  // Role-based field visibility configuration
  field_visibility?: EoFieldVisibilityConfig[];
  // Filtering
  enable_filters?: boolean;      // Enable user filters
  filters?: EoFilterConfig[];    // Available user filters (custom fields)
  // Pre-filtering (default filters that users cannot modify)
  prefilters?: EoPreFilterConfig[];
  // Import/Export
  enable_import_export?: boolean;  // Legacy: enable both import and export (kept for backward compat)
  enable_import?: boolean;         // Enable import action for EOs
  enable_export?: boolean;         // Enable export action for EOs
  // Creation
  enable_create?: boolean;         // Allow users to create new EOs
  // Archiving
  enable_archive?: boolean;        // Allow users to archive EOs
  // History / Audit
  enable_history?: boolean;        // Allow users to access EO audit history
  // Reparentage (drag & drop in tree view)
  enable_reparent?: boolean;       // Allow users to reparent entities via DnD
  // User configuration access
  allow_user_column_config?: boolean;   // Allow users to reorder/toggle columns
  allow_user_field_management?: boolean; // Allow users to create/archive custom fields
}

export interface EoCardBlock extends BaseBlock {
  type: 'eo_card';
  config: EoCardBlockConfig;
}

// Campaign type pre-configured by the integrator
export interface CampaignTypeConfig {
  id: string;                    // UUID unique
  name: string;                  // e.g., "Risk Assessment"
  description?: string;
  is_active: boolean;            // Whether this type is available to users
  bo_definition_id?: string;     // The source business object (single)

  // NEW: Reference to a standalone workflow (replaces inline workflow config)
  workflow_id?: string;

  // Sections for the respondent step
  sections?: SectionConfig[];

  // Fields configuration for the respondent (initial step)
  respondent_fields: StepFieldConfig[];

  // Legacy: Validation workflow configuration (deprecated - use workflow_id instead)
  enable_validation_workflow: boolean;
  validation_steps: ValidationStep[];

  // Options
  default_responder_roles?: string[];

  // Legacy: Respondent node links in the workflow graph (deprecated - use workflow_id)
  respondent_links?: { on_approve?: string; on_reject?: string };

  // Legacy: Persisted node positions for the workflow graph (deprecated - use workflow_id)
  node_positions?: Record<string, { x: number; y: number }>;

  // Legacy: Persisted edge control points (deprecated - use workflow_id)
  edge_points?: Record<string, Array<{ x: number; y: number }>>;

  // Publication status
  is_published?: boolean;
}

// Survey Creator Block - allows users to create and manage campaigns
export interface SurveyCreatorBlockConfig {
  full_page?: boolean;
  workflow_id?: string;       // Deprecated: use workflow_ids
  workflow_ids?: string[];
  // Display options
  show_all_surveys?: boolean;
  show_my_surveys?: boolean;
  columns_visible?: string[];
  group_by_status?: boolean;
  // Permissions
  allow_form_edit?: boolean;
  allow_import?: boolean;
  allow_export?: boolean;
  // Workflow & data options
  enable_validation_workflow?: boolean;
}

export interface SurveyCreatorBlock extends BaseBlock {
  type: 'survey_creator';
  config: SurveyCreatorBlockConfig;
}

// Survey Responses Block - displays surveys to respond to
export interface SurveyResponsesBlockConfig {
  // Layout options
  full_page?: boolean;           // Use full page height for the block

  // Link to workflow(s)
  workflow_id?: string;            // Legacy single workflow ID
  workflow_ids?: string[];         // Multiple workflow IDs

  // Filtering
  show_pending?: boolean;        // Show pending surveys
  show_submitted?: boolean;      // Show submitted surveys
  show_validated?: boolean;      // Show validated surveys
  show_rejected?: boolean;       // Show rejected surveys

  // Display options
  group_by_campaign?: boolean;   // Group by campaign
  show_deadline?: boolean;       // Show deadline
  show_progress?: boolean;       // Show progress bar

  // Actions
  allow_draft?: boolean;         // Allow saving drafts

  // Validator view
  show_validation_queue?: boolean; // Show validation queue for validators

  // History
  enable_history?: boolean;        // Show tabs: "En cours" / "Terminées" for completed campaigns

  // Import / Export
  enable_import?: boolean;         // Allow importing responses
  enable_export?: boolean;         // Allow exporting responses
}

export interface SurveyResponsesBlock extends BaseBlock {
  type: 'survey_responses';
  config: SurveyResponsesBlockConfig;
}

// Users Block
export interface UsersBlock extends BaseBlock {
  type: 'users';
  config: UsersBlockConfig;
}

// Profiles Block
export interface ProfilesBlock extends BaseBlock {
  type: 'profiles';
  config: ProfilesBlockConfig;
}

// Core EO fields (system fields that cannot be removed)
export const EO_FIELD_DEFINITIONS: { field: EoFieldKey; label: string; group: string }[] = [
  { field: 'name', label: 'Nom', group: 'Système' },
  { field: 'code', label: 'ID', group: 'Système' },
  { field: 'is_active', label: 'Statut actif', group: 'Système' },
];

// Core EO fields (system fields that always exist in the database schema)
export const EO_LIST_COLUMN_OPTIONS: { field: string; label: string }[] = [
  { field: 'name', label: 'Nom' },
  { field: 'level', label: 'Niveau' },
  { field: 'parent', label: 'Parent' },
  { field: 'is_active', label: 'Statut actif' },
];

// Structure blocks
export interface SectionBlockConfig {
  title?: string;
}

export interface SectionBlock extends BaseBlock {
  type: 'section';
  config: SectionBlockConfig;
}

export interface SubSectionBlockConfig {
  title?: string;
}

export interface SubSectionBlock extends BaseBlock {
  type: 'sub_section';
  config: SubSectionBlockConfig;
}

export interface SeparatorBlockConfig {
  style?: 'line' | 'space';
}

export interface SeparatorBlock extends BaseBlock {
  type: 'separator';
  config: SeparatorBlockConfig;
}

export type StructurePageBlock = SectionBlock | SubSectionBlock | SeparatorBlock;
export type BusinessPageBlock = DataTableBlock | EoCardBlock | SurveyCreatorBlock | SurveyResponsesBlock | UsersBlock | ProfilesBlock;
export type PageBlock = StructurePageBlock | BusinessPageBlock;

export interface PageBuilderConfig {
  blocks: PageBlock[];
  settings: {
    gap?: number;
    padding?: number;
  };
}

// Block definitions for the palette
export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  defaultConfig: Partial<PageBlock['config']>;
  defaultPosition: Partial<BlockPosition>;
  category: 'structure' | 'business';
}

export const STRUCTURE_BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: 'section',
    label: 'Section',
    description: 'Section principale de page',
    icon: 'LayoutPanelTop',
    defaultConfig: { title: 'Nouvelle section' },
    defaultPosition: { colSpan: 12 },
    category: 'structure',
  },
  {
    type: 'sub_section',
    label: 'Sous-section',
    description: 'Sous-section dans une section',
    icon: 'LayoutList',
    defaultConfig: { title: 'Sous-section' },
    defaultPosition: { colSpan: 12 },
    category: 'structure',
  },
  {
    type: 'separator',
    label: 'Séparateur',
    description: 'Séparateur visuel entre blocs',
    icon: 'Minus',
    defaultConfig: { style: 'line' },
    defaultPosition: { colSpan: 12 },
    category: 'structure',
  },
];

export const BUSINESS_BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: 'data_table',
    label: 'Tableau de données',
    description: 'Affiche les instances d\'un objet métier',
    icon: 'Table',
    defaultConfig: {
      page_size: 10,
      enable_search: true,
    },
    defaultPosition: { colSpan: 12 },
    category: 'business',
  },
  {
    type: 'eo_card',
    label: 'Organisation',
    description: 'Affiche l\'entité organisationnelle',
    icon: 'Building2',
    defaultConfig: {
      available_views: ['list', 'tree', 'canvas'],
      default_view: 'list',
      show_hierarchy: true,
      show_contact_info: true,
      show_address: false,
      show_manager: true,
      compact_mode: false,
      show_children: true,
    },
    defaultPosition: { colSpan: 12 },
    category: 'business',
  },
  {
    type: 'survey_creator',
    label: 'Questionnaires',
    description: 'Créer et gérer des questionnaires',
    icon: 'ClipboardList',
    defaultConfig: {
      show_all_surveys: true,
      show_my_surveys: true,
      group_by_status: false,
      allow_form_edit: false,
    },
    defaultPosition: { colSpan: 12 },
    category: 'business',
  },
  {
    type: 'survey_responses',
    label: 'Réponses questionnaires',
    description: 'Affiche les questionnaires à compléter',
    icon: 'FileCheck',
    defaultConfig: {
      show_pending: true,
      show_submitted: false,
      show_validated: false,
      show_rejected: true,
      show_deadline: true,
      show_progress: true,
      allow_draft: true,
      show_validation_queue: false,
    },
    defaultPosition: { colSpan: 12 },
    category: 'business',
  },
  {
    type: 'users',
    label: 'Utilisateurs',
    description: 'Gestion des utilisateurs du client',
    icon: 'Users',
    defaultConfig: {
      enable_create: true,
      enable_edit: true,
      enable_edit_profile: true,
      enable_activate_deactivate: true,
      enable_export: false,
      anonymization: [],
    },
    defaultPosition: { colSpan: 12 },
    category: 'business',
  },
  {
    type: 'profiles',
    label: 'Profils',
    description: 'Gestion des profils utilisateurs',
    icon: 'UserCog',
    defaultConfig: {
      enable_create: true,
      enable_edit: true,
      enable_delete: false,
    },
    defaultPosition: { colSpan: 12 },
    category: 'business',
  },
];

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  ...STRUCTURE_BLOCK_DEFINITIONS,
  ...BUSINESS_BLOCK_DEFINITIONS,
];
