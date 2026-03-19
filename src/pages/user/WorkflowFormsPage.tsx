import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkflowEditorBridge } from '@/hooks/useWorkflowEditorBridge';
import { useWorkflowWithNodes } from '@/hooks/useWorkflows';
import { WorkflowFormBuilder } from '@/components/admin/workflows/WorkflowFormBuilder';
import { useT } from '@/hooks/useT';

export default function WorkflowFormsPage() {
  const { t } = useT();
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const bridge = useWorkflowEditorBridge(workflowId);
  const { data: workflowData } = useWorkflowWithNodes(workflowId);
  const boDefinitionId = workflowData?.workflow?.bo_definition_id ?? undefined;

  if (bridge.isLoading || !bridge.startNodeId || !bridge.endNodeId) {
    return (
      <div className="full-bleed flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold">{t('views.configure_forms')}</h1>
        </div>
        <div className="flex-1 p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="full-bleed flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold">Configurer les formulaires</h1>
      </div>
      <div className="flex-1 min-h-0">
        <WorkflowFormBuilder
          steps={bridge.steps}
          startNodeId={bridge.startNodeId}
          endNodeId={bridge.endNodeId}
          startNodeName={bridge.startNodeName}
          endNodeName={bridge.endNodeName}
          onStartNodeNameChange={bridge.setStartNodeName}
          onEndNodeNameChange={bridge.setEndNodeName}
          boDefinitionId={boDefinitionId}
          workflowId={workflowId!}
        />
      </div>
    </div>
  );
}
