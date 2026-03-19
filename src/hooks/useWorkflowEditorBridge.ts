import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkflowWithNodes } from './useWorkflows';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ValidationStep } from '@/components/builder/page-builder/types';
import { NODE_TYPES } from '@/lib/constants';
import {
  mapDbToEditorState,
  buildSavePayload,
  type NodeRolePermission,
} from '@/lib/workflow/workflow-editor-bridge-calculator';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface WorkflowEditorState {
  steps: ValidationStep[];
  responderRoles: string[];
  respondentLinks: { on_approve?: string; on_reject?: string };
  nodePositions: Record<string, { x: number; y: number }>;
  edgePoints: Record<string, Array<{ x: number; y: number }>>;
  isLoading: boolean;
  isSaving: boolean;
  // Node ID mappings for DB persistence
  startNodeId: string | null;
  endNodeId: string | null;
}

/**
 * Maps DB workflow data (nodes, transitions, role_permissions) to the
 * ValidationStep[] format expected by WorkflowGraphEditor, and saves changes back.
 */
export function useWorkflowEditorBridge(workflowId: string | undefined) {
  const { data, isLoading } = useWorkflowWithNodes(workflowId);
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<NodeRolePermission[]>([]);

  // Editor state
  const [steps, setSteps] = useState<ValidationStep[]>([]);
  const [responderRoles, setResponderRoles] = useState<string[]>([]);
  const [respondentViewerRoles, setRespondentViewerRoles] = useState<string[]>([]);
  const [validatedViewerRoles, setValidatedViewerRoles] = useState<string[]>([]);
  const [respondentLinks, setRespondentLinks] = useState<{ on_approve?: string; on_reject?: string }>({});
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [edgePoints, setEdgePoints] = useState<Record<string, Array<{ x: number; y: number }>>>({});
  const [startNodeId, setStartNodeId] = useState<string | null>(null);
  const [endNodeId, setEndNodeId] = useState<string | null>(null);
  const [startNodeName, setStartNodeName] = useState('Répondant');
  const [endNodeName, setEndNodeName] = useState('Validé');
  const initializedRef = useRef(false);
  const [bridgeReady, setBridgeReady] = useState(false);

  // Load role permissions — only mark as loaded once we have actual node data
  const [permsLoaded, setPermsLoaded] = useState(false);
  const dataLoaded = !!data;
  const nodeIdsKey = data?.nodes?.map(n => n.id).sort().join(',') || '';
  useEffect(() => {
    if (!nodeIdsKey) {
      // Only mark perms as loaded if data has actually arrived (no nodes to fetch perms for)
      if (dataLoaded) setPermsLoaded(true);
      return;
    }
    setPermsLoaded(false);
    const nodeIds = nodeIdsKey.split(',');
    api.post<NodeRolePermission[]>('/api/workflows/node-role-permissions/bulk', { node_ids: nodeIds })
      .then((perms) => {
        if (perms) setRolePermissions(perms);
        setPermsLoaded(true);
      })
      .catch(() => {
        setPermsLoaded(true);
      });
  }, [nodeIdsKey, dataLoaded]);

  // Convert DB data to editor format (only once on load)
  useEffect(() => {
    if (!data || !permsLoaded || initializedRef.current) return;
    const { nodes, transitions } = data;

    const settings = data.workflow?.settings as Record<string, unknown> | null;
    const editorState = mapDbToEditorState(nodes, transitions, rolePermissions, settings);

    setStartNodeId(editorState.startNodeId);
    setEndNodeId(editorState.endNodeId);
    setStartNodeName(editorState.startNodeName);
    setEndNodeName(editorState.endNodeName);
    setRespondentLinks(editorState.respondentLinks);
    setSteps(editorState.steps);
    setResponderRoles(editorState.responderRoles);
    setRespondentViewerRoles(editorState.respondentViewerRoles);
    setValidatedViewerRoles(editorState.validatedViewerRoles);
    setNodePositions(editorState.nodePositions);
    setEdgePoints(editorState.edgePoints);

    initializedRef.current = true;
    setBridgeReady(true);
  }, [data, rolePermissions, permsLoaded]);

  // Reset initialized flag when workflow changes
  useEffect(() => {
    initializedRef.current = false;
    setBridgeReady(false);
  }, [workflowId]);

  // Save all changes to DB
  const saveToDb = useCallback(async () => {
    if (!workflowId || !data?.workflow) return;
    setIsSaving(true);

    try {
      const existingNodes = data.nodes || [];
      const existingTransitions = data.transitions || [];

      const payload = buildSavePayload({
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
      });

      // 1. Delete removed step nodes
      if (payload.removedNodeIds.length > 0) {
        await api.post('/api/workflows/nodes/bulk-delete', { node_ids: payload.removedNodeIds });
      }

      // 2. Upsert step nodes
      for (const upsert of payload.stepNodeUpserts) {
        if (upsert.isNew) {
          await api.post('/api/workflows/nodes', {
            id: upsert.step.id,
            workflow_id: workflowId,
            name: upsert.step.name,
            slug: upsert.slug,
            node_type: NODE_TYPES.VALIDATION,
            display_order: upsert.step.order,
            position_x: upsert.position?.x ?? 275,
            position_y: upsert.position?.y ?? (100 + (upsert.step.order - 1) * 120),
          });
        } else {
          await api.patch(`/api/workflows/nodes/${upsert.step.id}`, {
            name: upsert.step.name,
            display_order: upsert.step.order,
            position_x: upsert.position?.x ?? null,
            position_y: upsert.position?.y ?? null,
          });
        }
      }

      // 3. Create start/end nodes if missing, or update existing
      let actualStartId = payload.startNodeUpdate.id;
      let actualEndId = payload.endNodeUpdate.id;

      if (payload.startNodeUpdate.isNew) {
        const startPos = payload.startNodeUpdate.position || { x: 50, y: 200 };
        const newNode = await api.post<{ id: string }>('/api/workflows/nodes', {
          workflow_id: workflowId,
          name: payload.startNodeUpdate.name,
          slug: 'respondent',
          node_type: NODE_TYPES.START,
          position_x: startPos.x,
          position_y: startPos.y,
        });
        if (newNode) {
          actualStartId = newNode.id;
          setStartNodeId(newNode.id);
        }
      } else if (actualStartId) {
        const pos = payload.startNodeUpdate.position;
        await api.patch(`/api/workflows/nodes/${actualStartId}`, {
          name: payload.startNodeUpdate.name,
          ...(pos ? { position_x: pos.x, position_y: pos.y } : {}),
        });
      }

      if (payload.endNodeUpdate.isNew) {
        const endPos = payload.endNodeUpdate.position || { x: 500, y: 200 };
        const newNode = await api.post<{ id: string }>('/api/workflows/nodes', {
          workflow_id: workflowId,
          name: payload.endNodeUpdate.name,
          slug: 'validated',
          node_type: NODE_TYPES.END,
          position_x: endPos.x,
          position_y: endPos.y,
        });
        if (newNode) {
          actualEndId = newNode.id;
          setEndNodeId(newNode.id);
        }
      } else if (actualEndId) {
        const pos = payload.endNodeUpdate.position;
        await api.patch(`/api/workflows/nodes/${actualEndId}`, {
          name: payload.endNodeUpdate.name,
          ...(pos ? { position_x: pos.x, position_y: pos.y } : {}),
        });
      }

      // 4. Rebuild all transitions
      if (existingTransitions.length > 0) {
        await api.delete(`/api/workflows/${workflowId}/transitions`);
      }

      // Re-map transitions with actual start/end IDs (in case they were just created)
      const transitionsToInsert = payload.transitions.map(t => ({
        ...t,
        source_node_id: t.source_node_id || (actualStartId || ''),
        target_node_id: t.target_node_id || (actualEndId || ''),
      }));

      if (transitionsToInsert.length > 0) {
        await api.post('/api/workflows/transitions/bulk', { transitions: transitionsToInsert });
      }

      // 5. Save role permissions
      const allNodeIds = [
        ...(actualStartId ? [actualStartId] : []),
        ...steps.map(s => s.id),
        ...(actualEndId ? [actualEndId] : []),
      ];

      if (allNodeIds.length > 0) {
        await api.post('/api/workflows/node-role-permissions/bulk-delete', { node_ids: allNodeIds });
      }

      // Re-map permissions with actual start/end IDs
      const permsToInsert = payload.permissions.map(p => {
        let nodeId = p.node_id;
        if (nodeId === payload.startNodeUpdate.id && actualStartId) nodeId = actualStartId;
        if (nodeId === payload.endNodeUpdate.id && actualEndId) nodeId = actualEndId;
        return { ...p, node_id: nodeId };
      });

      if (permsToInsert.length > 0) {
        await api.post('/api/workflows/node-role-permissions', permsToInsert);
      }

      // 6. Save edge points in workflow settings
      await api.patch(`/api/workflows/${workflowId}`, {
        settings: { ...(data.workflow?.settings as Record<string, unknown> || {}), edge_points: payload.edgePoints },
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflowId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all() });
    } catch (error: unknown) {
      console.error('Error saving workflow:', error);
      toast.error('Erreur lors de la sauvegarde du workflow');
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, data, steps, responderRoles, respondentViewerRoles, validatedViewerRoles, respondentLinks, nodePositions, edgePoints, startNodeId, endNodeId, startNodeName, endNodeName, queryClient]);

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(saveToDb);
  useEffect(() => { saveRef.current = saveToDb; }, [saveToDb]);

  const triggerSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveRef.current();
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    steps,
    setSteps: (s: ValidationStep[]) => { setSteps(s); triggerSave(); },
    responderRoles,
    setResponderRoles: (r: string[]) => { setResponderRoles(r); triggerSave(); },
    respondentViewerRoles,
    setRespondentViewerRoles: (r: string[]) => { setRespondentViewerRoles(r); triggerSave(); },
    validatedViewerRoles,
    setValidatedViewerRoles: (r: string[]) => { setValidatedViewerRoles(r); triggerSave(); },
    respondentLinks,
    setRespondentLinks: (l: { on_approve?: string; on_reject?: string }) => { setRespondentLinks(l); triggerSave(); },
    nodePositions,
    setNodePositions: (p: Record<string, { x: number; y: number }>) => { setNodePositions(p); triggerSave(); },
    edgePoints,
    setEdgePoints: (ep: Record<string, Array<{ x: number; y: number }>>) => { setEdgePoints(ep); triggerSave(); },
    isLoading: isLoading || !bridgeReady,
    isSaving,
    startNodeId,
    endNodeId,
    startNodeName,
    setStartNodeName: (n: string) => { setStartNodeName(n); triggerSave(); },
    endNodeName,
    setEndNodeName: (n: string) => { setEndNodeName(n); triggerSave(); },
    saveToDb,
  };
}
