import { useState, useMemo, useRef, useCallback } from 'react';
import { Settings2, Filter, Lock, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateBlockConfig } from '@/hooks/useUpdateBlockConfig';
import { useForkViewForRole } from '@/hooks/useForkViewForRole';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { EoListColumnsConfigDialog } from '@/components/builder/page-builder/EoListColumnsConfigDialog';
import { EoFieldsVisibilityDialog } from '@/components/builder/page-builder/EoFieldsVisibilityDialog';
import { EoFiltersConfigDialog } from '@/components/builder/page-builder/EoFiltersConfigDialog';
import { EoPreFiltersConfigDialog } from '@/components/builder/page-builder/EoPreFiltersConfigDialog';
import { ForkViewConfirmDialog } from '@/components/admin/roles/ForkViewConfirmDialog';
import { EO_FIELD_DEFINITIONS } from '@/components/builder/page-builder/types';
import type { EoCardBlock, EoViewMode } from '@/components/builder/page-builder/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EoCardInlineOptionsProps {
  viewConfigId: string;
  blockIndex: number;
  config: EoCardBlock['config'];
  roleId: string;
  roleName: string;
  navConfigId: string;
  viewName: string;
  sharedRoleCount: number;
}

// ---------------------------------------------------------------------------
// View options constant (matches BlockConfigPanel)
// ---------------------------------------------------------------------------

const EO_VIEW_OPTIONS: { value: EoViewMode; label: string }[] = [
  { value: 'list', label: 'Liste' },
  { value: 'tree', label: 'Arbre' },
  { value: 'canvas', label: 'Canvas' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EoCardInlineOptions({
  viewConfigId,
  blockIndex,
  config,
  roleId,
  roleName,
  navConfigId,
  viewName,
  sharedRoleCount,
}: EoCardInlineOptionsProps) {
  // ---- Locked mode (shared view) ------------------------------------------
  // Exclude the current role from the "shared with" count
  const otherRolesCount = Math.max(0, sharedRoleCount - 1);
  const isLocked = otherRolesCount >= 1;

  // ---- Mutations & data ---------------------------------------------------
  const updateMutation = useUpdateBlockConfig();
  const forkMutation = useForkViewForRole();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id;
  const { data: customEoFields = [], isLoading: isLoadingCustomFields } =
    useEoFieldDefinitions(clientId);

  const activeCustomFields = useMemo(
    () => customEoFields.filter((f) => f.is_active),
    [customEoFields],
  );

  // ---- Dialog state -------------------------------------------------------
  const [eoListColumnsDialogOpen, setEoListColumnsDialogOpen] = useState(false);
  const [eoFieldsDialogOpen, setEoFieldsDialogOpen] = useState(false);
  const [eoFiltersDialogOpen, setEoFiltersDialogOpen] = useState(false);
  const [eoPreFiltersDialogOpen, setEoPreFiltersDialogOpen] = useState(false);
  const [forkDialogOpen, setForkDialogOpen] = useState(false);

  // ---- Helpers ------------------------------------------------------------
  const availableViews = config.available_views || ['list', 'tree', 'canvas'];
  const defaultView = config.default_view || 'list';

  /** Persist a partial config update (debounced to avoid race conditions on rapid toggles). */
  const pendingUpdate = useRef<Record<string, unknown>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const updateConfig = useCallback((configUpdate: Record<string, unknown>) => {
    // Merge with any pending update
    pendingUpdate.current = { ...pendingUpdate.current, ...configUpdate };
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const merged = { ...pendingUpdate.current };
      pendingUpdate.current = {};
      updateMutation.mutate({ viewConfigId, blockIndex, configUpdate: merged });
    }, 300);
  }, [viewConfigId, blockIndex, updateMutation]);

  /** Toggle a view mode on/off, respecting constraints. */
  const toggleView = (view: EoViewMode) => {
    const current = new Set(availableViews);
    if (current.has(view)) {
      // Don't allow removing all views
      if (current.size > 1) {
        current.delete(view);
        // If removing the default view, set new default to first remaining
        if (defaultView === view) {
          const remaining = Array.from(current);
          updateConfig({
            available_views: remaining,
            default_view: remaining[0],
          });
        } else {
          updateConfig({ available_views: Array.from(current) });
        }
      }
    } else {
      current.add(view);
      updateConfig({ available_views: Array.from(current) });
    }
  };

  // ---- Computed counts for badges -----------------------------------------
  const columnsCount = (config.list_columns || []).length;
  const prefiltersCount = (config.prefilters || []).length;
  const filtersCount = (config.filters || []).length;

  const fieldVisibilityLabel = useMemo(() => {
    const totalFields = EO_FIELD_DEFINITIONS.length + activeCustomFields.length;
    const configuredFields = config.field_visibility || [];
    const visibleCount =
      configuredFields.length === 0
        ? totalFields
        : configuredFields.filter((fv) => fv.visible !== false).length;
    return isLoadingCustomFields ? '...' : `${visibleCount}/${totalFields}`;
  }, [activeCustomFields, config.field_visibility, isLoadingCustomFields]);

  // ---- Fork handler -------------------------------------------------------
  const handleFork = () => {
    forkMutation.mutate(
      { viewConfigId, navConfigId, roleId, roleName },
      { onSuccess: () => setForkDialogOpen(false) },
    );
  };

  // ========================================================================
  // Render
  // ========================================================================
  return (
    <div className="bg-muted/30 rounded-b-lg p-4">
      {/* Locked banner for shared views */}
      {isLocked && (
        <Alert variant="warning" className="mb-4">
          <Users className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>
              Partagée avec <strong>{otherRolesCount}</strong> {otherRolesCount > 1 ? 'rôles' : 'rôle'} — options en lecture seule
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setForkDialogOpen(true)}
            >
              Personnaliser pour ce rôle
              <Lock className="h-3.5 w-3.5" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ----------------------------------------------------------------
            Column 1 : Modes de vue
        ---------------------------------------------------------------- */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Modes de vue
          </Label>

          {/* View checkboxes */}
          <div className="space-y-2">
            {EO_VIEW_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`inline-view-${blockIndex}-${option.value}`}
                  checked={availableViews.includes(option.value)}
                  onCheckedChange={() => toggleView(option.value)}
                  disabled={isLocked}
                />
                <Label
                  htmlFor={`inline-view-${blockIndex}-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
                {defaultView === option.value && (
                  <Chip variant="default" className="text-xs">
                    Défaut
                  </Chip>
                )}
              </div>
            ))}
          </div>

          {/* Default view selector */}
          <div className="pt-1">
            <Label className="text-xs text-muted-foreground mb-1 block">
              Vue par défaut
            </Label>
            <Select
              value={defaultView}
              onValueChange={(value: string) =>
                updateConfig({ default_view: value as EoViewMode })
              }
              disabled={isLocked}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EO_VIEW_OPTIONS.filter((o) =>
                  availableViews.includes(o.value),
                ).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Column 2 : Fonctionnalités
        ---------------------------------------------------------------- */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Fonctionnalités
          </Label>

          <div className="space-y-2">
            <SwitchRow
              id={`inline-enable-create-${blockIndex}`}
              label="Création"
              checked={config.enable_create ?? false}
              onCheckedChange={(checked) =>
                updateConfig({ enable_create: checked })
              }
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-import-${blockIndex}`}
              label="Import"
              checked={
                config.enable_import ?? config.enable_import_export ?? false
              }
              onCheckedChange={(checked) =>
                updateConfig({ enable_import: checked })
              }
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-export-${blockIndex}`}
              label="Export"
              checked={
                config.enable_export ?? config.enable_import_export ?? false
              }
              onCheckedChange={(checked) =>
                updateConfig({ enable_export: checked })
              }
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-history-${blockIndex}`}
              label="Historique"
              checked={config.enable_history ?? false}
              onCheckedChange={(checked) =>
                updateConfig({ enable_history: checked })
              }
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-search-${blockIndex}`}
              label="Recherche"
              checked={config.enable_search ?? true}
              onCheckedChange={(checked) =>
                updateConfig({ enable_search: checked })
              }
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-filters-${blockIndex}`}
              label="Filtres"
              checked={config.enable_filters ?? false}
              onCheckedChange={(checked) =>
                updateConfig({ enable_filters: checked })
              }
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-enable-reparent-${blockIndex}`}
              label="Reparentage"
              checked={config.enable_reparent ?? false}
              onCheckedChange={(checked) =>
                updateConfig({ enable_reparent: checked })
              }
              disabled={isLocked}
            />
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Column 3 : Personnalisation + Configuration avancée
        ---------------------------------------------------------------- */}
        <div className="space-y-3">
          {/* -- Personnalisation utilisateur -- */}
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Personnalisation
          </Label>

          <div className="space-y-2">
            <SwitchRow
              id={`inline-allow-user-column-config-${blockIndex}`}
              label="Config colonnes"
              checked={config.allow_user_column_config ?? false}
              onCheckedChange={(checked) =>
                updateConfig({ allow_user_column_config: checked })
              }
              disabled={isLocked}
            />
            <SwitchRow
              id={`inline-allow-user-field-management-${blockIndex}`}
              label="Gestion champs"
              checked={config.allow_user_field_management ?? false}
              onCheckedChange={(checked) =>
                updateConfig({ allow_user_field_management: checked })
              }
              disabled={isLocked}
            />
          </div>

          <Separator />

          {/* -- Configuration avancée -- */}
          <Label className="text-xs font-medium text-muted-foreground uppercase">
            Configuration avancée
          </Label>

          <div className="grid grid-cols-2 gap-2">
            {/* Colonnes */}
            <Button
              variant="outline"
              size="sm"
              className="justify-between gap-1"
              onClick={() => setEoListColumnsDialogOpen(true)}
              disabled={isLocked}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Colonnes</span>
              </span>
              <Chip variant="default" className="text-xs shrink-0">
                {columnsCount || 'Défaut'}
              </Chip>
            </Button>

            {/* Visibilité champs */}
            <Button
              variant="outline"
              size="sm"
              className="justify-between gap-1"
              onClick={() => setEoFieldsDialogOpen(true)}
              disabled={isLocked}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Visibilité champs</span>
              </span>
              <Chip variant="default" className="text-xs shrink-0">
                {fieldVisibilityLabel}
              </Chip>
            </Button>

            {/* Filtres */}
            <Button
              variant="outline"
              size="sm"
              className="justify-between gap-1"
              onClick={() => setEoFiltersDialogOpen(true)}
              disabled={isLocked}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Filtres</span>
              </span>
              <Chip variant="default" className="text-xs shrink-0">
                {filtersCount}
              </Chip>
            </Button>

            {/* Pré-filtres */}
            <Button
              variant="outline"
              size="sm"
              className="justify-between gap-1"
              onClick={() => setEoPreFiltersDialogOpen(true)}
              disabled={isLocked}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Pré-filtres</span>
              </span>
              <Chip variant="default" className="text-xs shrink-0">
                {prefiltersCount}
              </Chip>
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          Dialogs (rendered at the bottom, wired to config updates)
      ------------------------------------------------------------------ */}
      <EoListColumnsConfigDialog
        open={eoListColumnsDialogOpen}
        onOpenChange={setEoListColumnsDialogOpen}
        columns={config.list_columns || []}
        customFields={activeCustomFields}
        onSave={(list_columns) => updateConfig({ list_columns })}
      />

      <EoFieldsVisibilityDialog
        open={eoFieldsDialogOpen}
        onOpenChange={setEoFieldsDialogOpen}
        fieldVisibility={config.field_visibility || []}
        customFields={activeCustomFields}
        onSave={(field_visibility) => updateConfig({ field_visibility })}
      />

      <EoFiltersConfigDialog
        open={eoFiltersDialogOpen}
        onOpenChange={setEoFiltersDialogOpen}
        filters={config.filters || []}
        prefilters={config.prefilters || []}
        customFields={activeCustomFields}
        onSave={(filters) => updateConfig({ filters })}
      />

      <EoPreFiltersConfigDialog
        open={eoPreFiltersDialogOpen}
        onOpenChange={setEoPreFiltersDialogOpen}
        prefilters={config.prefilters || []}
        customFields={activeCustomFields}
        onSave={(prefilters) => updateConfig({ prefilters })}
      />

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

// ---------------------------------------------------------------------------
// Small helper component for consistent switch rows
// ---------------------------------------------------------------------------

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
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}
