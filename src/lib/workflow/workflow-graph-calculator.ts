import {
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import type { ValidationStep } from '@/types/builder-types';

// --- Types ---

export interface BuildNodesParams {
  steps: ValidationStep[];
  selectedNodeId: string | null;
  responderRoles: string[];
  respondentLinks: { on_approve?: string; on_reject?: string };
  nodePositions: Record<string, { x: number; y: number }>;
  startNodeName: string;
  endNodeName: string;
  /** Callback for node delete — injected by the hook since it uses setState */
  onDeleteStep: (stepId: string) => void;
}

export interface BuildEdgesParams {
  steps: ValidationStep[];
  selectedEdgeId: string | null;
  respondentLinks: { on_approve?: string; on_reject?: string };
  edgePoints: Record<string, Array<{ x: number; y: number }>>;
  onControlPointsChange: (edgeId: string, points: Array<{ x: number; y: number }>) => void;
}

// --- Helpers ---

export function stepHasApprove(step: ValidationStep): boolean {
  return !!step.on_approve && step.on_approve !== '';
}

export function stepHasReject(step: ValidationStep): boolean {
  return !!step.on_reject && step.on_reject !== '';
}

// --- Builders ---

export function buildWorkflowNodes({
  steps,
  selectedNodeId,
  responderRoles,
  respondentLinks,
  nodePositions,
  startNodeName,
  endNodeName,
  onDeleteStep,
}: BuildNodesParams): Node[] {
  const nodes: Node[] = [
    {
      id: 'respondent',
      type: 'respondent',
      position: nodePositions['respondent'] || { x: 50, y: 200 },
      draggable: true,
      data: {
        name: startNodeName,
        isSelected: selectedNodeId === 'respondent',
        hasRoles: responderRoles.length > 0,
        hasApprove: !!respondentLinks.on_approve,
        hasReject: !!respondentLinks.on_reject,
      },
    },
  ];

  steps.forEach((step, i) => {
    nodes.push({
      id: step.id,
      type: 'step',
      position: nodePositions[step.id] || { x: 275, y: 100 + i * 120 },
      draggable: true,
      data: {
        label: step.name || `Etape ${i + 1}`,
        hasRoles: (step.validator_roles?.length || 0) > 0,
        isSelected: step.id === selectedNodeId,
        isComplete: stepHasApprove(step) && stepHasReject(step),
        hasApprove: stepHasApprove(step),
        hasReject: stepHasReject(step),
        onDelete: () => onDeleteStep(step.id),
      },
    });
  });

  const hasIncomingApproval =
    steps.some((s) => {
      const target =
        s.on_approve === 'next_step' || s.on_approve === 'validated'
          ? 'validated'
          : s.on_approve;
      return target === 'validated';
    }) || respondentLinks.on_approve === 'validated';

  nodes.push({
    id: 'validated',
    type: 'validated',
    position: nodePositions['validated'] || { x: 500, y: 200 },
    draggable: true,
    data: { name: endNodeName, hasIncomingApproval },
  });

  return nodes;
}

export function buildWorkflowEdges({
  steps,
  selectedEdgeId,
  respondentLinks,
  edgePoints,
  onControlPointsChange,
}: BuildEdgesParams): Edge[] {
  const edges: Edge[] = [];

  const makeEdge = (
    id: string,
    source: string,
    target: string,
    isApprove: boolean,
  ): Edge => ({
    id,
    source,
    sourceHandle: 'source',
    target,
    targetHandle: 'target',
    type: 'editable',
    animated: isApprove,
    interactionWidth: 20,
    style: isApprove
      ? {
          stroke: 'hsl(var(--success))',
          strokeWidth: 2,
          cursor: 'pointer',
        }
      : {
          stroke: 'hsl(var(--destructive))',
          strokeWidth: 1.5,
          strokeDasharray: '6 3',
          cursor: 'pointer',
        },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isApprove
        ? 'hsl(var(--success))'
        : 'hsl(var(--destructive))',
    },
    label: undefined,
    selected: selectedEdgeId === id,
    data: {
      controlPoints: edgePoints[id] || [],
      onControlPointsChange: (
        points: Array<{ x: number; y: number }>,
      ) => onControlPointsChange(id, points),
    },
  });

  // Respondent edges
  if (respondentLinks.on_approve) {
    edges.push(
      makeEdge(
        'e-approve-respondent',
        'respondent',
        respondentLinks.on_approve,
        true,
      ),
    );
  }
  if (respondentLinks.on_reject) {
    edges.push(
      makeEdge(
        'e-reject-respondent',
        'respondent',
        respondentLinks.on_reject,
        false,
      ),
    );
  }

  steps.forEach((step) => {
    if (step.on_approve) {
      const target =
        step.on_approve === 'next_step' ||
        step.on_approve === 'validated'
          ? 'validated'
          : step.on_approve;
      edges.push(makeEdge(`e-approve-${step.id}`, step.id, target, true));
    }

    if (step.on_reject) {
      let rejectTarget: string | null = null;
      if (step.on_reject === 'respondent') {
        rejectTarget = 'respondent';
      } else if (step.on_reject === 'previous_step') {
        const idx = steps.findIndex((s) => s.id === step.id);
        if (idx > 0) rejectTarget = steps[idx - 1].id;
      } else {
        rejectTarget = step.on_reject;
      }

      if (rejectTarget) {
        edges.push(
          makeEdge(
            `e-reject-${step.id}`,
            step.id,
            rejectTarget,
            false,
          ),
        );
      }
    }
  });

  return edges;
}
