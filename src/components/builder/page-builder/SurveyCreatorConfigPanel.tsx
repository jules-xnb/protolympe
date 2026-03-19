import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkflowsByClient, type WorkflowWithDetails } from '@/hooks/useWorkflows';
import type { SurveyCreatorBlock } from './types';
import type { InheritedRole } from './block-config/BlockConfigPanel';

interface SurveyCreatorConfigPanelProps {
  block: SurveyCreatorBlock;
  inheritedRoles: InheritedRole[];
  clientId?: string | null;
  onUpdate: (updates: Partial<SurveyCreatorBlock['config']>) => void;
}

export function SurveyCreatorConfigPanel({
  block,
  clientId,
  onUpdate,
}: SurveyCreatorConfigPanelProps) {
  const config = block.config;
  const selectedIds = config.workflow_ids ?? (config.workflow_id ? [config.workflow_id] : []);

  // Fetch all workflows for the client
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflowsByClient(clientId ?? undefined);

  const handleToggleWorkflow = (workflowId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedIds, workflowId]
      : selectedIds.filter(id => id !== workflowId);
    onUpdate({ workflow_ids: updated, workflow_id: undefined });
  };

  return (
    <div className="space-y-4">
      {/* Workflow selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase">
          Workflows
        </Label>
        {workflowsLoading ? (
          <p className="text-xs text-muted-foreground">Chargement...</p>
        ) : workflows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun workflow disponible</p>
        ) : (
          <div className="space-y-1">
            {workflows.map((wf) => {
              const isSelected = selectedIds.includes(wf.id);
              return (
                <label
                  key={wf.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggleWorkflow(wf.id, checked as boolean)}
                  />
                  <span className="flex items-center gap-2 text-sm">
                    {wf.name}
                    {(wf as WorkflowWithDetails).is_valid ? (
                      <Chip variant="default" className="text-xs px-1.5 py-0">Valide</Chip>
                    ) : (
                      <Chip variant="default" className="text-xs px-1.5 py-0">Non valide</Chip>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {selectedIds.length === 0 && !workflowsLoading && workflows.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sélectionnez un ou plusieurs workflows pour ce bloc questionnaire.
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase">
          Options
        </Label>
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-form-edit" className="text-sm font-normal">
            Autoriser les modifications du formulaire
          </Label>
          <Switch
            id="allow-form-edit"
            checked={config.allow_form_edit ?? false}
            onCheckedChange={(checked) => onUpdate({ allow_form_edit: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-import" className="text-sm font-normal">
            Autoriser l'import des réponses
          </Label>
          <Switch
            id="allow-import"
            checked={config.allow_import ?? false}
            onCheckedChange={(checked) => onUpdate({ allow_import: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="allow-export" className="text-sm font-normal">
            Autoriser l'export des réponses
          </Label>
          <Switch
            id="allow-export"
            checked={config.allow_export ?? false}
            onCheckedChange={(checked) => onUpdate({ allow_export: checked })}
          />
        </div>
      </div>

    </div>
  );
}
