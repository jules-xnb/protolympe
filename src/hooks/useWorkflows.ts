import { useQuery } from '@tanstack/react-query';
import { useViewMode } from '@/contexts/ViewModeContext';
import { NODE_TYPES } from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

// Re-export mutations for backward compatibility
export {
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  usePublishWorkflow,
} from './useWorkflowMutations';

export interface Workflow {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  description: string | null;
  workflow_type: string | null;
  bo_definition_id: string | null;
  settings: unknown;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface WorkflowWithDetails extends Workflow {
  _count?: {
    nodes: number;
    transitions: number;
  };
  is_valid?: boolean;
}

interface WorkflowNode {
  id: string;
  node_type: string;
  workflow_id: string;
  name: string;
  slug: string;
  display_order: number;
  position_x: number | null;
  position_y: number | null;
  [key: string]: unknown;
}

interface WorkflowTransition {
  id: string;
  source_node_id: string;
  target_node_id: string;
  workflow_id: string;
  display_order: number;
  [key: string]: unknown;
}

/** A workflow is valid if it has start + end + at least 1 validation node,
 *  and every node is properly connected by transitions. */
function computeWorkflowValidity(
  nodes: { id: string; node_type: string }[],
  transitions: { source_node_id: string; target_node_id: string }[],
): boolean {
  const startNode = nodes.find(n => n.node_type === NODE_TYPES.START);
  const endNode = nodes.find(n => n.node_type === NODE_TYPES.END);
  const validationNodes = nodes.filter(n => n.node_type === NODE_TYPES.VALIDATION);

  if (!startNode || !endNode || validationNodes.length === 0) return false;

  // Every non-end node must have at least one outgoing transition
  for (const node of nodes) {
    if (node.node_type === NODE_TYPES.END) continue;
    if (!transitions.some(t => t.source_node_id === node.id)) return false;
  }

  // Every non-start node must have at least one incoming transition
  for (const node of nodes) {
    if (node.node_type === NODE_TYPES.START) continue;
    if (!transitions.some(t => t.target_node_id === node.id)) return false;
  }

  return true;
}

export function useWorkflows() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.workflows.byClient(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];

      // Get workflows with nodes and transitions from API
      const workflows = await api.get<(Workflow & {
        nodes?: WorkflowNode[];
        transitions?: WorkflowTransition[];
      })[]>(
        `/api/workflows?client_id=${selectedClient.id}&include_graph=true`
      );

      if (!workflows || workflows.length === 0) return [];

      return workflows.map(workflow => {
        const nodes = workflow.nodes || [];
        const transitions = workflow.transitions || [];

        return {
          ...workflow,
          nodes: undefined,
          transitions: undefined,
          _count: {
            nodes: nodes.length,
            transitions: transitions.length,
          },
          is_valid: computeWorkflowValidity(nodes, transitions),
        } as WorkflowWithDetails;
      });
    },
    enabled: !!selectedClient?.id,
  });
}

export function useWorkflowsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workflows.byClientExplicit(clientId!),
    queryFn: async () => {
      if (!clientId) return [];

      const workflows = await api.get<(Workflow & {
        nodes?: WorkflowNode[];
        transitions?: WorkflowTransition[];
      })[]>(
        `/api/workflows?client_id=${clientId}&include_graph=true`
      );

      if (!workflows || workflows.length === 0) return [];

      return workflows.map(workflow => {
        const nodes = workflow.nodes || [];
        const transitions = workflow.transitions || [];

        return {
          ...workflow,
          nodes: undefined,
          transitions: undefined,
          is_valid: computeWorkflowValidity(nodes, transitions),
        } as WorkflowWithDetails;
      });
    },
    enabled: !!clientId,
  });
}

export function useWorkflowWithNodes(workflowId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workflows.detail(workflowId!),
    queryFn: async () => {
      if (!workflowId) return null;

      const result = await api.get<{
        workflow: Workflow;
        nodes: WorkflowNode[];
        transitions: WorkflowTransition[];
      }>(`/api/workflows/${workflowId}?include_graph=true`);

      return result;
    },
    enabled: !!workflowId,
  });
}
