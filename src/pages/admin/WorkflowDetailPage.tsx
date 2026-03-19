import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useWorkflowWithNodes } from '@/hooks/useWorkflows';
import { useWorkflowEditorBridge } from '@/hooks/useWorkflowEditorBridge';
import { useBusinessObjectDefinition } from '@/hooks/useBusinessObjectDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { WorkflowGraphEditor } from '@/components/builder/page-builder/workflow-editor/WorkflowGraphEditor';
import { WorkflowFormBuilder } from '@/components/admin/workflows/WorkflowFormBuilder';
import { EmptyState } from '@/components/ui/empty-state';
import { ArrowLeft, Loader2, Workflow, CheckCircle2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKFLOW_TYPE_LABELS } from '@/lib/workflow-types';
import { queryKeys } from '@/lib/query-keys';

export default function WorkflowDetailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') === 'forms' ? 'forms' : 'workflow') as 'workflow' | 'forms';
  const setActiveTab = (tab: 'workflow' | 'forms') => setSearchParams({ tab }, { replace: true });
  const { id, clientId } = useParams<{ id: string; clientId: string }>();
  const navigate = useNavigate();
  const { selectedClient } = useViewMode();
  const { data: workflowData, isLoading: workflowLoading } = useWorkflowWithNodes(id);

  const bridge = useWorkflowEditorBridge(id);

  // Fetch BO definition linked to this workflow
  const boDefId = workflowData?.workflow?.bo_definition_id ?? undefined;
  const { data: _boDefinition } = useBusinessObjectDefinition(boDefId ?? undefined);

  // Use clientId from URL (this page is outside DashboardLayout so selectedClient may not be set)
  const effectiveClientId = selectedClient?.id || clientId;

  // Fetch all roles for the client
  const { data: allClientRoles = [] } = useQuery({
    queryKey: queryKeys.workflows.allClientRoles(effectiveClientId!),
    queryFn: async () => {
      if (!effectiveClientId) return [];
      return api.get<Array<{ id: string; name: string; color: string | null; category_id: string | null }>>(
        `/api/roles?client_id=${effectiveClientId}&is_active=true`
      );
    },
    enabled: !!effectiveClientId,
  });


  if (bridge.isLoading || workflowLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workflowData?.workflow) {
    return (
      <EmptyState
        icon={Workflow}
        title="Workflow introuvable"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/${effectiveClientId}/workflows`)}>
            Retour <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />
    );
  }

  const { workflow } = workflowData;

  return (
    <div className="full-bleed flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/${effectiveClientId}/workflows`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground truncate">{workflow.name}</h1>
            <Chip variant="outline" className="text-xs font-normal shrink-0">
              {WORKFLOW_TYPE_LABELS[workflow.workflow_type as keyof typeof WORKFLOW_TYPE_LABELS]?.label || workflow.workflow_type}
            </Chip>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bridge.isSaving ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Sauvegarde...</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              <span className="text-success">Enregistré</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-4 pt-2 border-b shrink-0 flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('workflow')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-t-md rounded-b-none border border-b-0 transition-colors',
            activeTab === 'workflow'
              ? 'bg-background text-foreground font-medium -mb-px'
              : 'text-muted-foreground hover:text-foreground bg-muted/50'
          )}
        >
          Workflow
          <Workflow className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('forms')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-t-md rounded-b-none border border-b-0 transition-colors',
            activeTab === 'forms'
              ? 'bg-background text-foreground font-medium -mb-px'
              : 'text-muted-foreground hover:text-foreground bg-muted/50'
          )}
        >
          Formulaires
          <FileText className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab content: Workflow (kept mounted to preserve ReactFlow state) */}
      <div className="flex-1 min-h-0 relative" style={{ display: activeTab === 'workflow' ? 'block' : 'none' }}>
        <WorkflowGraphEditor
          steps={bridge.steps}
          onStepsChange={bridge.setSteps}
          inheritedRoles={allClientRoles}
          responderRoles={bridge.responderRoles}
          onResponderRolesChange={bridge.setResponderRoles}
          respondentViewerRoles={bridge.respondentViewerRoles}
          onRespondentViewerRolesChange={bridge.setRespondentViewerRoles}
          validatedViewerRoles={bridge.validatedViewerRoles}
          onValidatedViewerRolesChange={bridge.setValidatedViewerRoles}
          respondentLinks={bridge.respondentLinks}
          onRespondentLinksChange={bridge.setRespondentLinks}
          nodePositions={bridge.nodePositions}
          onNodePositionsChange={bridge.setNodePositions}
          edgePoints={bridge.edgePoints}
          onEdgePointsChange={bridge.setEdgePoints}
          boDefinitionId={boDefId}
          startNodeId={bridge.startNodeId}
          startNodeName={bridge.startNodeName}
          endNodeName={bridge.endNodeName}
          onStartNodeNameChange={bridge.setStartNodeName}
          onEndNodeNameChange={bridge.setEndNodeName}
        />
      </div>

      {/* Tab content: Formulaires */}
      <div className="flex-1 min-h-0 min-w-0" style={{ display: activeTab === 'forms' ? 'flex' : 'none' }}>
        {bridge.startNodeId && bridge.endNodeId ? (
          <WorkflowFormBuilder
            steps={bridge.steps}
            startNodeId={bridge.startNodeId}
            endNodeId={bridge.endNodeId}
            startNodeName={bridge.startNodeName}
            endNodeName={bridge.endNodeName}
            onStartNodeNameChange={bridge.setStartNodeName}
            onEndNodeNameChange={bridge.setEndNodeName}
            boDefinitionId={boDefId}
            workflowId={id!}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
