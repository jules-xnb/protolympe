import { useState, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, Users } from 'lucide-react';
import { useUpdateBlockConfig } from '@/hooks/useUpdateBlockConfig';
import { useForkViewForRole } from '@/hooks/useForkViewForRole';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useWorkflowsByClient, type WorkflowWithDetails } from '@/hooks/useWorkflows';
import { ForkViewConfirmDialog } from '@/components/admin/roles/ForkViewConfirmDialog';
import type { SurveyResponsesBlock } from '@/components/builder/page-builder/types';

interface SurveyResponsesInlineOptionsProps {
  viewConfigId: string;
  blockIndex: number;
  config: SurveyResponsesBlock['config'];
  roleId: string;
  roleName: string;
  navConfigId: string;
  viewName: string;
  sharedRoleCount: number;
}

export function SurveyResponsesInlineOptions({
  viewConfigId,
  blockIndex,
  config,
  roleId,
  roleName,
  navConfigId,
  viewName,
  sharedRoleCount,
}: SurveyResponsesInlineOptionsProps) {
  const otherRolesCount = Math.max(0, sharedRoleCount - 1);
  const isLocked = otherRolesCount >= 1;

  const updateMutation = useUpdateBlockConfig();
  const forkMutation = useForkViewForRole();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id;
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflowsByClient(clientId ?? undefined);

  const [forkDialogOpen, setForkDialogOpen] = useState(false);

  const selectedIds = config.workflow_ids ?? (config.workflow_id ? [config.workflow_id] : []);

  const pendingUpdate = useRef<Record<string, unknown>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const updateConfig = useCallback((configUpdate: Record<string, unknown>) => {
    pendingUpdate.current = { ...pendingUpdate.current, ...configUpdate };
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const merged = { ...pendingUpdate.current };
      pendingUpdate.current = {};
      updateMutation.mutate({ viewConfigId, blockIndex, configUpdate: merged });
    }, 300);
  }, [viewConfigId, blockIndex, updateMutation]);

  const handleToggleWorkflow = (workflowId: string, checked: boolean) => {
    const updated = checked
      ? [...selectedIds, workflowId]
      : selectedIds.filter(id => id !== workflowId);
    updateConfig({ workflow_ids: updated, workflow_id: undefined });
  };

  const handleFork = () => {
    forkMutation.mutate(
      { viewConfigId, navConfigId, roleId, roleName },
      { onSuccess: () => setForkDialogOpen(false) },
    );
  };

  return (
    <div className="bg-muted/30 rounded-b-lg p-4">
      {isLocked && (
        <Alert variant="warning" className="mb-4">
          <Users className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>
              Partagée avec <strong>{otherRolesCount}</strong> {otherRolesCount > 1 ? 'rôles' : 'rôle'} — options en lecture seule
            </span>
            <Button size="sm" variant="outline" onClick={() => setForkDialogOpen(true)}>
              Personnaliser pour ce rôle <Lock className="h-3.5 w-3.5" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Workflows */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Workflows
          </Label>
          {workflowsLoading ? (
            <p className="text-xs text-muted-foreground">Chargement...</p>
          ) : workflows.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun workflow disponible</p>
          ) : (
            <div className="space-y-1">
              {workflows.map((wf) => (
                <label
                  key={wf.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedIds.includes(wf.id)}
                    onCheckedChange={(checked) => handleToggleWorkflow(wf.id, checked as boolean)}
                    disabled={isLocked}
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
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Options */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Options
          </Label>
          <div className="space-y-2">
            <SwitchRow
              id={`inline-enable-import-${blockIndex}`}
              label="Import"
              checked={config.enable_import ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_import: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-export-${blockIndex}`}
              label="Export"
              checked={config.enable_export ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_export: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-history-${blockIndex}`}
              label="Historique (campagnes terminées)"
              checked={config.enable_history ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_history: checked })}
              disabled={isLocked}
            />
          </div>
        </div>
      </div>

      <ForkViewConfirmDialog
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
        onConfirm={handleFork}
        roleName={roleName}
        viewName={viewName}
        sharedRoleCount={sharedRoleCount}
        isPending={forkMutation.isPending}
      />
    </div>
  );
}

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
