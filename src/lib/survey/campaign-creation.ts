import type { Json } from '@/types/database';
import { NODE_TYPES } from '@/lib/constants';

/**
 * Pure business logic functions extracted from useCreateCampaign.
 * These are stateless data transformations with no Supabase dependencies.
 * They transform workflow node data into survey settings JSON.
 */

// -- Input row types (matching Supabase table Row shapes) --------------------

export interface NodeFieldRow {
  id: string;
  node_id: string;
  field_definition_id: string;
  is_visible: boolean;
  is_editable: boolean;
  is_required_override: boolean | null;
  display_order: number | null;
  settings: Json | null;
  visibility_condition: Json | null;
  created_at: string;
  updated_at: string;
}

export interface NodeRolePermissionRow {
  id: string;
  node_id: string;
  role_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_execute_transitions: boolean;
  allowed_transition_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface NodeSectionRow {
  id: string;
  node_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface WorkflowNodeRow {
  id: string;
  workflow_id: string;
  name: string;
  slug: string;
  node_type: string;
  display_order: number | null;
  description: string | null;
  is_active: boolean;
  config: Json | null;
  max_duration_hours: number | null;
  notify_on_entry: boolean | null;
  notify_on_exit: boolean | null;
  object_definition_ids: string[] | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
  updated_at: string;
}

// -- Output types ------------------------------------------------------------

export interface RespondentField {
  field_id: string;
  field_name: string;
  visibility: string;
  is_required: boolean;
  allow_comment: boolean;
  custom_label?: string;
  section_id?: string;
  visibility_conditions?: Array<{
    source_field_id: string;
    source_field_name?: string;
    operator: string;
    value?: string | number;
  }>;
  visibility_logic?: 'AND' | 'OR';
  variation_threshold?: number;
  variation_direction?: '+' | '+-' | '-';
}

export interface SectionDef {
  id: string;
  name: string;
  order: number;
}

// ValidationStep is defined in @/types/builder-types — re-exported here for convenience
import type { ValidationStep } from '@/types/builder-types';
export type { ValidationStep };

export interface SurveySettings {
  workflow_id: string;
  sections: SectionDef[];
  respondent_fields: RespondentField[];
  validation_steps: ValidationStep[];
  enable_validation_workflow: boolean;
  default_responder_roles: string[];
  bo_definition_id: string | null;
}

// -- Helpers -----------------------------------------------------------------

/**
 * Groups fields, permissions, and sections by their `node_id` into Maps.
 */
export function extractWorkflowStructure(
  allNodeFields: NodeFieldRow[],
  allRolePerms: NodeRolePermissionRow[],
  allNodeSections: NodeSectionRow[],
): {
  fieldsByNode: Map<string, NodeFieldRow[]>;
  permsByNode: Map<string, NodeRolePermissionRow[]>;
  sectionsByNode: Map<string, NodeSectionRow[]>;
} {
  const fieldsByNode = new Map<string, NodeFieldRow[]>();
  allNodeFields.forEach(f => {
    const list = fieldsByNode.get(f.node_id) || [];
    list.push(f);
    fieldsByNode.set(f.node_id, list);
  });

  const permsByNode = new Map<string, NodeRolePermissionRow[]>();
  allRolePerms.forEach(p => {
    const list = permsByNode.get(p.node_id) || [];
    list.push(p);
    permsByNode.set(p.node_id, list);
  });

  const sectionsByNode = new Map<string, NodeSectionRow[]>();
  allNodeSections.forEach(s => {
    const list = sectionsByNode.get(s.node_id) || [];
    list.push(s);
    sectionsByNode.set(s.node_id, list);
  });

  return { fieldsByNode, permsByNode, sectionsByNode };
}

/**
 * Builds the field-visibility mapping for the respondent (start) node.
 */
export function buildRespondentFieldsFromNode(
  formNode: WorkflowNodeRow | undefined,
  fieldsByNode: Map<string, NodeFieldRow[]>,
): RespondentField[] {
  if (!formNode) return [];

  return (fieldsByNode.get(formNode.id) || []).map(f => {
    const settings = (f.settings as Record<string, unknown>) || {};
    return {
      field_id: f.field_definition_id,
      field_name: '', // Will be resolved by the edge function
      visibility: f.is_visible ? (f.is_editable ? 'visible' : 'readonly') : 'hidden',
      is_required: f.is_required_override ?? false,
      allow_comment: Boolean(settings.allow_comment ?? false),
      custom_label: (settings.custom_label as string) || undefined,
      section_id: (settings.section_id as string) || undefined,
      variation_threshold: (settings.variation_threshold as number) || undefined,
      variation_direction: (settings.variation_direction as '+' | '+-' | '-') || undefined,
      visibility_conditions: f.visibility_condition
        ? (f.visibility_condition as Record<string, unknown>).conditions as RespondentField['visibility_conditions'] || []
        : undefined,
      visibility_logic: f.visibility_condition
        ? (f.visibility_condition as Record<string, unknown>).logic as 'AND' | 'OR' || 'AND'
        : undefined,
    };
  });
}

/**
 * Builds the validation step definitions from validation-type workflow nodes.
 */
export function buildValidationStepsFromNodes(
  validationNodes: WorkflowNodeRow[],
  permsByNode: Map<string, NodeRolePermissionRow[]>,
  fieldsByNode: Map<string, NodeFieldRow[]>,
  sectionsByNode: Map<string, NodeSectionRow[]>,
): ValidationStep[] {
  return validationNodes.map((node, idx) => {
    const nodePerms = permsByNode.get(node.id) || [];
    const nodeFields = fieldsByNode.get(node.id) || [];
    const validatorRoles = nodePerms.filter(p => p.can_edit || p.can_execute_transitions).map(p => p.role_id);
    const viewerRoles = nodePerms.filter(p => p.can_view && !p.can_edit && !p.can_execute_transitions).map(p => p.role_id);

    const nodeSections = (sectionsByNode.get(node.id) || []).map(s => ({
      id: s.id,
      name: s.name,
      order: s.display_order,
    }));

    return {
      id: node.id,
      name: node.name,
      order: idx + 1,
      validator_roles: validatorRoles,
      viewer_roles: viewerRoles.length > 0 ? viewerRoles : undefined,
      can_edit: nodePerms.some(p => p.can_edit),
      on_approve: 'next_step' as const,
      on_reject: 'respondent' as const,
      fields: nodeFields.map(f => {
        const s = (f.settings as Record<string, unknown>) || {};
        return {
          field_id: f.field_definition_id,
          field_name: '',
          visibility: (f.is_visible ? (f.is_editable ? 'visible' : 'readonly') : 'hidden') as 'visible' | 'readonly' | 'hidden',
          is_required: f.is_required_override ?? false,
          allow_comment: Boolean(s.allow_comment ?? false),
          custom_label: (s.custom_label as string) || undefined,
          section_id: (s.section_id as string) || undefined,
          variation_threshold: (s.variation_threshold as number) || undefined,
          variation_direction: (s.variation_direction as '+' | '+-' | '-') || undefined,
          visibility_conditions: f.visibility_condition
            ? (f.visibility_condition as Record<string, unknown>).conditions as RespondentField['visibility_conditions'] || []
            : undefined,
          visibility_logic: f.visibility_condition
            ? (f.visibility_condition as Record<string, unknown>).logic as 'AND' | 'OR' || 'AND'
            : undefined,
        };
      }),
      sections: nodeSections,
    };
  });
}

/**
 * Composes all helpers into a complete survey settings object ready for storage.
 * This is the main entry point called from the hook.
 */
export function buildSurveySettingsFromWorkflow(
  workflowId: string,
  boDefinitionId: string | null,
  workflowNodes: WorkflowNodeRow[],
  allNodeFields: NodeFieldRow[],
  allRolePerms: NodeRolePermissionRow[],
  allNodeSections: NodeSectionRow[],
): SurveySettings {
  // Group raw data by node
  const { fieldsByNode, permsByNode, sectionsByNode } = extractWorkflowStructure(
    allNodeFields,
    allRolePerms,
    allNodeSections,
  );

  // Respondent (start) node
  const formNode = workflowNodes.find(n => n.node_type === NODE_TYPES.START);

  const respondentFields = buildRespondentFieldsFromNode(formNode, fieldsByNode);

  // Default responder roles from role permissions on the form node
  const defaultResponderRoles = formNode
    ? (permsByNode.get(formNode.id) || [])
        .filter(p => p.can_edit)
        .map(p => p.role_id)
    : [];

  // Validation nodes sorted by display_order (end node excluded — it's the final "validated" state)
  const validationNodes = workflowNodes
    .filter(n => n.node_type === NODE_TYPES.VALIDATION)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const validationSteps = buildValidationStepsFromNodes(
    validationNodes,
    permsByNode,
    fieldsByNode,
    sectionsByNode,
  );

  // Sections from the respondent step
  const formSections: SectionDef[] = formNode
    ? (sectionsByNode.get(formNode.id) || []).map(s => ({
        id: s.id,
        name: s.name,
        order: s.display_order,
      }))
    : [];

  return {
    workflow_id: workflowId,
    sections: formSections,
    respondent_fields: respondentFields,
    validation_steps: validationSteps,
    enable_validation_workflow: validationSteps.length > 0,
    default_responder_roles: defaultResponderRoles,
    bo_definition_id: boDefinitionId,
  };
}
