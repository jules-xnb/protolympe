import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { SurveyResponsesBlock } from './types';
import { useWorkflowsByClient, type WorkflowWithDetails } from '@/hooks/useWorkflows';

interface SurveyResponsesConfigPanelProps {
  block: SurveyResponsesBlock;
  clientId?: string | null;
  onUpdate: (updates: Partial<SurveyResponsesBlock['config']>) => void;
}

export function SurveyResponsesConfigPanel({
  block,
  clientId,
  onUpdate,
}: SurveyResponsesConfigPanelProps) {
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
            Sélectionnez un ou plusieurs workflows dont ce bloc affichera les réponses.
          </p>
        )}
      </div>

      <Separator />

      {/* History toggle */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase">
          Historique
        </Label>
        <label className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
          <div>
            <span className="text-sm">Activer l'historique</span>
            <p className="text-xs text-muted-foreground">
              Affiche deux onglets : campagnes en cours et campagnes terminées
            </p>
          </div>
          <Switch
            checked={config.enable_history ?? false}
            onCheckedChange={(checked) => onUpdate({ enable_history: checked })}
          />
        </label>
      </div>

      <Separator />

      {/* Import / Export */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase">
          Import / Export
        </Label>
        <label className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
          <div>
            <span className="text-sm">Activer l'import</span>
            <p className="text-xs text-muted-foreground">
              Permet aux utilisateurs d'importer des réponses
            </p>
          </div>
          <Switch
            checked={config.enable_import ?? false}
            onCheckedChange={(checked) => onUpdate({ enable_import: checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer">
          <div>
            <span className="text-sm">Activer l'export</span>
            <p className="text-xs text-muted-foreground">
              Permet aux utilisateurs d'exporter les réponses
            </p>
          </div>
          <Switch
            checked={config.enable_export ?? false}
            onCheckedChange={(checked) => onUpdate({ enable_export: checked })}
          />
        </label>
      </div>
    </div>
  );
}
