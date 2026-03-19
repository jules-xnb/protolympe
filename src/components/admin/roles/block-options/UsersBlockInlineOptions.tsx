import { useRef, useCallback, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Lock, Users } from 'lucide-react';
import { useUpdateBlockConfig } from '@/hooks/useUpdateBlockConfig';
import { useForkViewForRole } from '@/hooks/useForkViewForRole';
import { ForkViewConfirmDialog } from '@/components/admin/roles/ForkViewConfirmDialog';
import type { UsersBlockConfig } from '@/types/builder-types';

interface UsersBlockInlineOptionsProps {
  viewConfigId: string;
  blockIndex: number;
  config: UsersBlockConfig;
  roleId: string;
  roleName: string;
  navConfigId: string;
  viewName: string;
  sharedRoleCount: number;
}

export function UsersBlockInlineOptions({
  viewConfigId,
  blockIndex,
  config,
  roleId,
  roleName,
  navConfigId,
  viewName,
  sharedRoleCount,
}: UsersBlockInlineOptionsProps) {
  const otherRolesCount = Math.max(0, sharedRoleCount - 1);
  const isLocked = otherRolesCount >= 1;

  const updateMutation = useUpdateBlockConfig();
  const forkMutation = useForkViewForRole();
  const [forkDialogOpen, setForkDialogOpen] = useState(false);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: CRUD */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Actions
          </Label>
          <div className="space-y-2">
            <SwitchRow
              id={`users-create-${blockIndex}`}
              label="Création d'utilisateurs"
              checked={config.enable_create ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_create: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`users-edit-${blockIndex}`}
              label="Édition des utilisateurs"
              checked={config.enable_edit ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_edit: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`users-edit-profile-${blockIndex}`}
              label="Modification des profils"
              checked={config.enable_edit_profile ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_edit_profile: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`users-activate-${blockIndex}`}
              label="Activation / Désactivation"
              checked={config.enable_activate_deactivate ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_activate_deactivate: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`users-archive-${blockIndex}`}
              label="Archivage"
              checked={config.enable_archive ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_archive: checked })}
              disabled={isLocked}
            />
          </div>
        </div>

        {/* Column 2: Import / Export */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Import / Export
          </Label>
          <div className="space-y-2">
            <SwitchRow
              id={`users-import-${blockIndex}`}
              label="Import CSV"
              checked={config.enable_import ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_import: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`users-export-${blockIndex}`}
              label="Export CSV"
              checked={config.enable_export ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_export: checked })}
              disabled={isLocked}
            />
          </div>
        </div>

        {/* Column 3: Fonctionnalités */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Fonctionnalités
          </Label>
          <div className="space-y-2">
            <SwitchRow
              id={`users-filters-${blockIndex}`}
              label="Filtres"
              checked={config.enable_filters ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_filters: checked })}
              disabled={isLocked}
            />
            <SwitchRow
              id={`users-history-${blockIndex}`}
              label="Historique"
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
