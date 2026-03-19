import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type Connection,
  applyNodeChanges,
} from '@xyflow/react';
import { generateId } from '@/lib/utils';
import type { ValidationStep } from '../types';
import type { WorkflowGraphEditorProps } from './WorkflowGraphEditor';
import {
  buildWorkflowNodes,
  buildWorkflowEdges,
} from '@/lib/workflow/workflow-graph-calculator';

// --- Hook ---

export function useWorkflowGraph({
  steps,
  onStepsChange,
  responderRoles = [],
  respondentLinks = {},
  onRespondentLinksChange,
  nodePositions = {},
  onNodePositionsChange,
  edgePoints = {},
  onEdgePointsChange,
  startNodeName = 'Répondant',
  endNodeName = 'Validé',
}: WorkflowGraphEditorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{
    connection: Connection;
    position: { x: number; y: number };
  } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const selectedStep =
    selectedNodeId && selectedNodeId !== 'respondent'
      ? steps.find((s) => s.id === selectedNodeId)
      : null;
  const isRespondentSelected = selectedNodeId === 'respondent';
  const isValidatedSelected = selectedNodeId === 'validated';

  // Handler for edge control point changes
  const handleEdgeControlPointsChange = useCallback(
    (edgeId: string, points: Array<{ x: number; y: number }>) => {
      const newEdgePoints = { ...edgePoints };
      if (points.length === 0) {
        delete newEdgePoints[edgeId];
      } else {
        newEdgePoints[edgeId] = points;
      }
      onEdgePointsChange?.(newEdgePoints);
    },
    [edgePoints, onEdgePointsChange],
  );

  // Callback for node deletion (used by buildWorkflowNodes)
  const handleNodeDelete = useCallback(
    (stepId: string) => {
      const step = steps.find((s) => s.id === stepId);
      if (!step) return;
      const filtered = steps.filter((s) => s.id !== stepId);
      const cleaned = filtered.map((s, idx) => ({
        ...s,
        order: idx + 1,
        on_approve:
          s.on_approve === stepId ? undefined : s.on_approve,
        on_reject: s.on_reject === stepId ? undefined : s.on_reject,
      }));
      onStepsChange(cleaned);
      if (
        respondentLinks.on_approve === stepId ||
        respondentLinks.on_reject === stepId
      ) {
        onRespondentLinksChange?.({
          on_approve:
            respondentLinks.on_approve === stepId
              ? undefined
              : respondentLinks.on_approve,
          on_reject:
            respondentLinks.on_reject === stepId
              ? undefined
              : respondentLinks.on_reject,
        });
      }
      if (selectedNodeId === stepId) setSelectedNodeId(null);
    },
    [steps, onStepsChange, respondentLinks, onRespondentLinksChange, selectedNodeId],
  );

  // Build nodes
  const buildNodes = useCallback(
    (): Node[] =>
      buildWorkflowNodes({
        steps,
        selectedNodeId,
        responderRoles,
        respondentLinks,
        nodePositions,
        startNodeName,
        endNodeName,
        onDeleteStep: handleNodeDelete,
      }),
    [
      steps,
      selectedNodeId,
      responderRoles,
      respondentLinks,
      nodePositions,
      startNodeName,
      endNodeName,
      handleNodeDelete,
    ],
  );

  // Build edges derived from step properties + respondent links
  const buildEdges = useCallback(
    (): Edge[] =>
      buildWorkflowEdges({
        steps,
        selectedEdgeId,
        respondentLinks,
        edgePoints,
        onControlPointsChange: handleEdgeControlPointsChange,
      }),
    [
      steps,
      selectedEdgeId,
      respondentLinks,
      edgePoints,
      handleEdgeControlPointsChange,
    ],
  );

  const [internalNodes, setInternalNodes] = useState<Node[]>(() =>
    buildNodes(),
  );
  const edges = useMemo(() => buildEdges(), [buildEdges]);

  // Sync nodes when steps/props change — use prop positions when available
  useEffect(() => {
    setInternalNodes((prev) => {
      const newNodes = buildNodes();
      return newNodes.map((newNode) => {
        const existing = prev.find((n) => n.id === newNode.id);
        if (existing) {
          // If nodePositions prop has an explicit position, use it (from saved data)
          // Otherwise preserve the internal position (from dragging)
          const hasExplicitPosition = !!nodePositions[newNode.id];
          return {
            ...newNode,
            position: hasExplicitPosition
              ? newNode.position
              : existing.position,
          };
        }
        return newNode;
      });
    });
  }, [buildNodes, nodePositions]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setInternalNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        const hasDragEnd = changes.some(
          (c) => c.type === 'position' && !c.dragging,
        );
        if (hasDragEnd && onNodePositionsChange) {
          const positions: Record<string, { x: number; y: number }> = {};
          updated.forEach((n) => {
            positions[n.id] = { x: n.position.x, y: n.position.y };
          });
          onNodePositionsChange(positions);
        }
        return updated;
      });
    },
    [onNodePositionsChange],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (
      node.type === 'step' ||
      node.type === 'respondent' ||
      node.type === 'validated'
    ) {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    } else {
      setSelectedNodeId(null);
    }
    setSelectedEdgeId(null);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === 'validated') return;
      if (connection.source === connection.target) return;

      if (connection.source === 'respondent') {
        onRespondentLinksChange?.({
          ...respondentLinks,
          on_approve: connection.target,
        });
        return;
      }

      // Connecting to "Validé" node is always an approval
      if (connection.target === 'validated') {
        onStepsChange(
          steps.map((step) => {
            if (step.id !== connection.source) return step;
            return { ...step, on_approve: connection.target! };
          }),
        );
        return;
      }

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const pos = bounds
        ? {
            x: bounds.left + bounds.width / 2,
            y: bounds.top + bounds.height / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

      setPendingConnection({ connection, position: pos });
    },
    [respondentLinks, onRespondentLinksChange, onStepsChange, steps],
  );

  const handleConnectionTypeSelect = useCallback(
    (type: 'approve' | 'reject') => {
      if (!pendingConnection) return;
      const { connection } = pendingConnection;
      const sourceId = connection.source!;
      const targetId = connection.target!;

      if (sourceId === 'respondent') {
        onRespondentLinksChange?.({
          ...respondentLinks,
          [type === 'approve' ? 'on_approve' : 'on_reject']: targetId,
        });
      } else {
        onStepsChange(
          steps.map((step) => {
            if (step.id !== sourceId) return step;
            if (type === 'approve') {
              return { ...step, on_approve: targetId };
            } else {
              return { ...step, on_reject: targetId };
            }
          }),
        );
      }

      setPendingConnection(null);
    },
    [
      pendingConnection,
      steps,
      onStepsChange,
      respondentLinks,
      onRespondentLinksChange,
    ],
  );

  const handleAddStep = useCallback(() => {
    const newStep: ValidationStep = {
      id: generateId(),
      name: `Étape ${steps.length + 1}`,
      order: steps.length + 1,
      validator_roles: [],
      can_edit: false,
      on_approve: '',
      on_reject: undefined,
    };
    onStepsChange([...steps, newStep]);
    setSelectedNodeId(newStep.id);
  }, [steps, onStepsChange]);

  const handleUpdateStep = useCallback(
    (updates: Partial<ValidationStep>) => {
      if (!selectedStep) return;
      onStepsChange(
        steps.map((step) =>
          step.id === selectedStep.id ? { ...step, ...updates } : step,
        ),
      );
    },
    [selectedStep, steps, onStepsChange],
  );

  const handleDeleteStep = useCallback(() => {
    if (!selectedStep) return;
    const filtered = steps.filter((step) => step.id !== selectedStep.id);
    const cleaned = filtered.map((step, index) => ({
      ...step,
      order: index + 1,
      on_approve:
        step.on_approve === selectedStep.id ? undefined : step.on_approve,
      on_reject:
        step.on_reject === selectedStep.id ? undefined : step.on_reject,
    }));
    onStepsChange(cleaned);
    if (
      respondentLinks.on_approve === selectedStep.id ||
      respondentLinks.on_reject === selectedStep.id
    ) {
      onRespondentLinksChange?.({
        on_approve:
          respondentLinks.on_approve === selectedStep.id
            ? undefined
            : respondentLinks.on_approve,
        on_reject:
          respondentLinks.on_reject === selectedStep.id
            ? undefined
            : respondentLinks.on_reject,
      });
    }
    // Clean edge points for edges referencing the deleted step
    if (onEdgePointsChange) {
      const newEdgePoints = { ...edgePoints };
      delete newEdgePoints[`e-approve-${selectedStep.id}`];
      delete newEdgePoints[`e-reject-${selectedStep.id}`];
      // Also clean edges pointing TO this step
      Object.keys(newEdgePoints).forEach((_key) => {
        // We keep all other edge points, cleanup is best-effort
      });
      onEdgePointsChange(newEdgePoints);
    }
    setSelectedNodeId(null);
  }, [
    selectedStep,
    steps,
    onStepsChange,
    respondentLinks,
    onRespondentLinksChange,
    edgePoints,
    onEdgePointsChange,
  ]);

  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    const approveMatch = selectedEdgeId.match(/^e-approve-(.+)$/);
    const rejectMatch = selectedEdgeId.match(/^e-reject-(.+)$/);

    if (approveMatch) {
      const sourceId = approveMatch[1];
      if (sourceId === 'respondent') {
        onRespondentLinksChange?.({
          ...respondentLinks,
          on_approve: undefined,
        });
      } else {
        onStepsChange(
          steps.map((s) =>
            s.id === sourceId ? { ...s, on_approve: '' } : s,
          ),
        );
      }
    } else if (rejectMatch) {
      const sourceId = rejectMatch[1];
      if (sourceId === 'respondent') {
        onRespondentLinksChange?.({
          ...respondentLinks,
          on_reject: undefined,
        });
      } else {
        onStepsChange(
          steps.map((s) =>
            s.id === sourceId ? { ...s, on_reject: undefined } : s,
          ),
        );
      }
    }

    // Clean edge points for the deleted edge
    if (onEdgePointsChange && edgePoints[selectedEdgeId]) {
      const newEdgePoints = { ...edgePoints };
      delete newEdgePoints[selectedEdgeId];
      onEdgePointsChange(newEdgePoints);
    }

    setSelectedEdgeId(null);
  }, [
    selectedEdgeId,
    steps,
    onStepsChange,
    respondentLinks,
    onRespondentLinksChange,
    edgePoints,
    onEdgePointsChange,
  ]);

  // Delete selected edge on keypress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedEdgeId
      ) {
        deleteSelectedEdge();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId, deleteSelectedEdge]);

  // Deselect if selected step was removed
  useEffect(() => {
    if (
      selectedNodeId &&
      selectedNodeId !== 'respondent' &&
      selectedNodeId !== 'validated' &&
      !steps.find((s) => s.id === selectedNodeId)
    ) {
      setSelectedNodeId(null);
    }
  }, [steps, selectedNodeId]);

  const showPanel =
    selectedStep || isRespondentSelected || isValidatedSelected;

  return {
    // State
    selectedNodeId,
    selectedEdgeId,
    selectedStep: selectedStep ?? null,
    isRespondentSelected,
    isValidatedSelected,
    pendingConnection,
    showPanel,
    reactFlowWrapper,

    // ReactFlow data
    internalNodes,
    edges,

    // Handlers
    onNodesChange,
    onNodeClick,
    onConnect,
    onEdgeClick: (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
      setSelectedNodeId(null);
    },
    onPaneClick: () => {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    handleConnectionTypeSelect,
    handleCancelConnection: () => setPendingConnection(null),
    handleAddStep,
    handleUpdateStep,
    handleDeleteStep,
    deleteSelectedEdge,
    handleClosePanel: () => {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
  };
}
