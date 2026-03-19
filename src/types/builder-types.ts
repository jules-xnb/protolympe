// Shared builder types used by both src/lib/ and src/components/
// Extracted from src/components/builder/page-builder/types.ts to fix architecture inversion.

export type StructureBlockType = 'section' | 'sub_section' | 'separator';
export type BusinessBlockType = 'data_table' | 'eo_card' | 'survey_creator' | 'survey_responses' | 'users' | 'profiles';
export type BlockType = StructureBlockType | BusinessBlockType;

export const STRUCTURE_BLOCK_TYPES: StructureBlockType[] = ['section', 'sub_section', 'separator'];
export const BUSINESS_BLOCK_TYPES: BusinessBlockType[] = ['data_table', 'eo_card', 'survey_creator', 'survey_responses', 'users', 'profiles'];

export type ProfileColumnKey = 'name' | 'roles' | 'eos' | 'groups' | 'user_count';

export interface ProfileColumnConfig {
  field_id: string;   // ProfileColumnKey
  field_name: string;
}

export interface ProfilesBlockConfig {
  enable_create?: boolean;
  enable_edit?: boolean;
  enable_duplicate?: boolean;
  enable_delete?: boolean;
  enable_import?: boolean;
  enable_export?: boolean;
  columns?: ProfileColumnConfig[];  // ordered list; absence = hidden
}

// Users Block config
export type UserAnonymizableField = 'first_name' | 'last_name' | 'email' | 'profile';

export interface UserFieldAnonymization {
  field: UserAnonymizableField;
  hidden_for_profiles: string[]; // IDs of profile templates that see ***
}

export interface UsersBlockConfig {
  enable_filters?: boolean;
  enable_create?: boolean;
  enable_edit?: boolean;
  enable_edit_profile?: boolean;
  enable_activate_deactivate?: boolean;
  enable_archive?: boolean;
  enable_import?: boolean;
  enable_export?: boolean;
  enable_history?: boolean;
  anonymization?: UserFieldAnonymization[];
}

// Pre-filter operators
export type PreFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty';

// Visibility condition for form fields
export interface FieldVisibilityCondition {
  source_field_id: string;      // Which field's value to check
  source_field_name?: string;   // For display purposes
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_or_equal' | 'less_or_equal' | 'contains' | 'is_empty' | 'is_not_empty';
  value?: string | number;      // The value to compare against
}

// Available EO fields that can be configured for visibility
export type EoFieldKey =
  | 'name'
  | 'code'
  | 'description'
  | 'manager'
  | 'email'
  | 'phone'
  | 'website'
  | 'address'
  | 'cost_center'
  | 'employee_count'
  | string; // Allow custom field IDs

// Section configuration for grouping fields
export interface SectionConfig {
  id: string;       // UUID unique
  name: string;     // Titre de la section
  order: number;    // Ordre d'affichage
}

// Field configuration for a workflow step
export interface StepFieldConfig {
  field_id: string;              // ID du field_definition
  field_name: string;            // Nom pour affichage
  visibility: 'visible' | 'readonly' | 'hidden';
  is_required?: boolean;
  allow_comment?: boolean;       // Allow comments on this field
  custom_label?: string;         // Sous-titre affiché sous le nom du champ dans la vue formulaire pleine page
  section_id?: string;           // ID de la section à laquelle le champ appartient
  visibility_conditions?: FieldVisibilityCondition[];
  visibility_logic?: 'AND' | 'OR';
  variation_threshold?: number;
  variation_direction?: '+' | '+-' | '-';
}

// Validation step configuration for multi-stage workflows
export interface ValidationStep {
  id: string;                    // UUID unique
  name: string;                  // Step name (e.g., "Manager Validation")
  order: number;                 // Execution order (1, 2, 3...)
  validator_roles: string[];     // IDs of roles authorized to validate
  viewer_roles?: string[];       // IDs of roles that can view objects at this step (read-only)
  can_edit: boolean;             // Can the validator modify responses?
  on_approve?: 'next_step' | 'validated' | string;  // Action after approval or step ID
  on_reject?: 'respondent' | 'previous_step' | string;  // Return target (step ID possible), optional
  fields?: StepFieldConfig[];    // Field configuration for this step
  sections?: SectionConfig[];    // Sections for this validation step
}
