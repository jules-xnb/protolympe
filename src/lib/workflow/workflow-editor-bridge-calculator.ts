import type { ValidationStep } from '@/types/builder-types';
import { NODE_TYPES } from '@/lib/constants';

// --- Types ---

export interface NodeRolePermission {
  id: string;
  node_id: string;
  role_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_execute_transitions: boolean;
}

interface WorkflowNode {
  id: string;
  node_type: string;
  name: string;
  display_order: number | null;
  position_x: number | null;
  position_y: number | null;
  [key: string]: unknown;
}

interface WorkflowTransition {
  id: string;
  source_node_id: string;
  target_node_id: string;
  action: string;
  [key: string]: unknown;
}

export interface EditorState {
  steps: ValidationStep[];
  responderRoles: string[];
  respondentViewerRoles: string[];
  validatedViewerRoles: string[];
  respondentLinks: { on_approve?: string; on_reject?: string };
  nodePositions: Record<string, { x: number; y: number }>;
  edgePoints: Record<string, Array<{ x: number; y: number }>>;
  startNodeId: string | null;
  endNodeId: string | null;
  startNodeName: string;
  endNodeName: string;
}

export interface TransitionPayload {
  workflow_id: string;
  source_node_id: string;
  target_node_id: string;
  action: 'submit' | 'approve' | 'reject';
  label: string;
  display_order: number;
}

export interface PermissionPayload {
  node_id: string;
  role_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_execute_transitions: boolean;
}

export interface SavePayload {
  removedNodeIds: string[];
  stepNodeUpserts: Array<{
    step: ValidationStep;
    position: { x: number; y: number } | undefined;
    isNew: boolean;
    slug: string;
  }>;
  startNodeUpdate: {
    id: string | undefined;
    name: string;
    position: { x: number; y: number } | undefined;
    isNew: boolean;
  };
  endNodeUpdate: {
    id: string | undefined;
    name: string;
    position: { x: number; y: number } | undefined;
    isNew: boolean;
  };
  transitions: TransitionPayload[];
  permissions: PermissionPayload[];
  allNodeIds: string[];
  edgePoints: Record<string, Array<{ x: number; y: number }>>;
}

// --- Pure Functions ---

/**
 * Maps DB workflow data (nodes, transitions, role_permissions) to the
 * editor state format expected by WorkflowGraphEditor.
 */
export function mapDbToEditorState(
  nodes: WorkflowNode[],
  transitions: WorkflowTransition[],
  rolePermissions: NodeRolePermission[],
  workflowSettings: Record<string, unknown> | null,
): EditorState {
  const startNode = nodes.find(n => n.node_type === NODE_TYPES.START);
  const endNode = nodes.find(n => n.node_type === NODE_TYPES.END);
  const stepNodes = nodes
    .filter(n => n.node_type === NODE_TYPES.VALIDATION)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  // Build step ID mapping: DB node ID -> editor ID
  const dbIdToEditorId = new Map<string, string>();
  if (startNode) dbIdToEditorId.set(startNode.id, 'respondent');
  if (endNode) dbIdToEditorId.set(endNode.id, 'validated');
  stepNodes.forEach(n => dbIdToEditorId.set(n.id, n.id));

  // Convert transitions to respondent links
  const respondentApproveTransition = startNode
    ? transitions.find(t => t.source_node_id === startNode.id && (t.action === 'submit' || t.action === 'approve'))
    : null;
  const respondentRejectTransition = startNode
    ? transitions.find(t => t.source_node_id === startNode.id && t.action === 'reject')
    : null;

  const respondentLinks: { on_approve?: string; on_reject?: string } = {
    on_approve: respondentApproveTransition
      ? (dbIdToEditorId.get(respondentApproveTransition.target_node_id) || respondentApproveTransition.target_node_id)
      : undefined,
    on_reject: respondentRejectTransition
      ? (dbIdToEditorId.get(respondentRejectTransition.target_node_id) || respondentRejectTransition.target_node_id)
      : undefined,
  };

  // Convert step nodes to ValidationStep[]
  const steps: ValidationStep[] = stepNodes.map((node, i) => {
    const approveTransition = transitions.find(t => t.source_node_id === node.id && t.action === 'approve');
    const rejectTransition = transitions.find(t => t.source_node_id === node.id && t.action === 'reject');

    const nodePerms = rolePermissions.filter(p => p.node_id === node.id);
    const validatorPerms = nodePerms.filter(p => p.can_execute_transitions);
    const viewerPerms = nodePerms.filter(p => !p.can_execute_transitions && p.can_view);

    return {
      id: node.id,
      name: node.name,
      order: i + 1,
      validator_roles: validatorPerms.map(p => p.role_id),
      viewer_roles: viewerPerms.map(p => p.role_id),
      can_edit: validatorPerms.some(p => p.can_edit),
      on_approve: approveTransition
        ? (dbIdToEditorId.get(approveTransition.target_node_id) || approveTransition.target_node_id)
        : '',
      on_reject: rejectTransition
        ? (dbIdToEditorId.get(rejectTransition.target_node_id) || rejectTransition.target_node_id)
        : undefined,
    };
  });

  // Responder roles from start node permissions
  let responderRoles: string[] = [];
  let respondentViewerRoles: string[] = [];
  if (startNode) {
    const startPerms = rolePermissions.filter(p => p.node_id === startNode.id);
    responderRoles = startPerms.filter(p => p.can_execute_transitions).map(p => p.role_id);
    respondentViewerRoles = startPerms.filter(p => !p.can_execute_transitions && p.can_view).map(p => p.role_id);
  }

  // Validated viewer roles from end node permissions
  let validatedViewerRoles: string[] = [];
  if (endNode) {
    const endPerms = rolePermissions.filter(p => p.node_id === endNode.id);
    validatedViewerRoles = endPerms.filter(p => p.can_view).map(p => p.role_id);
  }

  // Node positions
  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach(n => {
    const editorId = dbIdToEditorId.get(n.id) || n.id;
    if (n.position_x != null && n.position_y != null) {
      nodePositions[editorId] = { x: Number(n.position_x), y: Number(n.position_y) };
    }
  });

  // Edge points from workflow settings
  let edgePoints: Record<string, Array<{ x: number; y: number }>> = {};
  if (workflowSettings?.edge_points) {
    edgePoints = workflowSettings.edge_points as Record<string, Array<{ x: number; y: number }>>;
  }

  return {
    steps,
    responderRoles,
    respondentViewerRoles,
    validatedViewerRoles,
    respondentLinks,
    nodePositions,
    edgePoints,
    startNodeId: startNode?.id || null,
    endNodeId: endNode?.id || null,
    startNodeName: startNode?.name || 'Repondant',
    endNodeName: endNode?.name || 'Valide',
  };
}

/**
 * Builds the structured payloads for saving workflow data back to the DB.
 * Does NOT execute any DB operations -- returns data for the caller to persist.
 */
export function buildSavePayload(params: {
  workflowId: string;
  steps: ValidationStep[];
  responderRoles: string[];
  respondentViewerRoles: string[];
  validatedViewerRoles: string[];
  respondentLinks: { on_approve?: string; on_reject?: string };
  nodePositions: Record<string, { x: number; y: number }>;
  edgePoints: Record<string, Array<{ x: number; y: number }>>;
  startNodeId: string | null;
  endNodeId: string | null;
  startNodeName: string;
  endNodeName: string;
  existingNodes: WorkflowNode[];
}): SavePayload {
  const {
    workflowId,
    steps,
    responderRoles,
    respondentViewerRoles,
    validatedViewerRoles,
    respondentLinks,
    nodePositions,
    edgePoints,
    startNodeId,
    endNodeId,
    startNodeName,
    endNodeName,
    existingNodes,
  } = params;

  // Determine start/end node IDs
  const currentStartId = startNodeId || existingNodes.find(n => n.node_type === NODE_TYPES.START)?.id;
  const currentEndId = endNodeId || existingNodes.find(n => n.node_type === NODE_TYPES.END)?.id;

  // Build editor->DB ID mapping
  const editorToDbId = (editorId: string): string => {
    if (editorId === 'respondent') return currentStartId || '';
    if (editorId === 'validated') return currentEndId || '';
    return editorId;
  };

  // 1. Determine removed step nodes
  const stepNodeIds = new Set(steps.map(s => s.id));
  const existingStepNodes = existingNodes.filter(n => n.node_type === NODE_TYPES.VALIDATION);
  const removedNodeIds = existingStepNodes
    .filter(n => !stepNodeIds.has(n.id))
    .map(n => n.id);

  // 2. Step node upserts
  const stepNodeUpserts = steps.map(step => {
    const pos = nodePositions[step.id];
    const existingNode = existingNodes.find(n => n.id === step.id);
    return {
      step,
      position: pos,
      isNew: !existingNode,
      slug: step.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    };
  });

  // 3. Start/end node updates
  const startNodeUpdate = {
    id: currentStartId,
    name: startNodeName,
    position: nodePositions['respondent'],
    isNew: !currentStartId,
  };

  const endNodeUpdate = {
    id: currentEndId,
    name: endNodeName,
    position: nodePositions['validated'],
    isNew: !currentEndId,
  };

  // 4. Build transitions
  const transitions: TransitionPayload[] = [];
  let order = 0;

  // Respondent transitions
  if (respondentLinks.on_approve && currentStartId) {
    transitions.push({
      workflow_id: workflowId,
      source_node_id: currentStartId,
      target_node_id: editorToDbId(respondentLinks.on_approve),
      action: 'submit',
      label: 'Soumettre',
      display_order: order++,
    });
  }
  if (respondentLinks.on_reject && currentStartId) {
    transitions.push({
      workflow_id: workflowId,
      source_node_id: currentStartId,
      target_node_id: editorToDbId(respondentLinks.on_reject),
      action: 'reject',
      label: 'Rejeter',
      display_order: order++,
    });
  }

  // Step transitions
  for (const step of steps) {
    if (step.on_approve) {
      transitions.push({
        workflow_id: workflowId,
        source_node_id: step.id,
        target_node_id: editorToDbId(step.on_approve),
        action: 'approve',
        label: 'Approuver',
        display_order: order++,
      });
    }
    if (step.on_reject) {
      transitions.push({
        workflow_id: workflowId,
        source_node_id: step.id,
        target_node_id: editorToDbId(step.on_reject),
        action: 'reject',
        label: 'Rejeter',
        display_order: order++,
      });
    }
  }

  // 5. Build permissions
  const permissions: PermissionPayload[] = [];

  // Responder roles
  if (currentStartId) {
    for (const roleId of responderRoles) {
      permissions.push({
        node_id: currentStartId,
        role_id: roleId,
        can_view: true,
        can_edit: true,
        can_execute_transitions: true,
      });
    }
    // Respondent viewer roles
    for (const roleId of respondentViewerRoles) {
      permissions.push({
        node_id: currentStartId,
        role_id: roleId,
        can_view: true,
        can_edit: false,
        can_execute_transitions: false,
      });
    }
  }

  // Validated viewer roles
  if (currentEndId) {
    for (const roleId of validatedViewerRoles) {
      permissions.push({
        node_id: currentEndId,
        role_id: roleId,
        can_view: true,
        can_edit: false,
        can_execute_transitions: false,
      });
    }
  }

  // Step validator roles
  for (const step of steps) {
    for (const roleId of (step.validator_roles || [])) {
      permissions.push({
        node_id: step.id,
        role_id: roleId,
        can_view: true,
        can_edit: step.can_edit,
        can_execute_transitions: true,
      });
    }
    // Step viewer roles (read-only)
    for (const roleId of (step.viewer_roles || [])) {
      permissions.push({
        node_id: step.id,
        role_id: roleId,
        can_view: true,
        can_edit: false,
        can_execute_transitions: false,
      });
    }
  }

  // All node IDs for permission cleanup
  const allNodeIds = [
    ...(currentStartId ? [currentStartId] : []),
    ...steps.map(s => s.id),
    ...(currentEndId ? [currentEndId] : []),
  ];

  return {
    removedNodeIds,
    stepNodeUpserts,
    startNodeUpdate,
    endNodeUpdate,
    transitions,
    permissions,
    allNodeIds,
    edgePoints,
  };
}
