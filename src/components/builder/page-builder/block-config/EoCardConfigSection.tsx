import { useState } from 'react';
import { Settings2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import type { EoCardBlock } from '../types';
import { EO_FIELD_DEFINITIONS } from '../types';
import { EoFieldsVisibilityDialog } from '../EoFieldsVisibilityDialog';
import { EoFiltersConfigDialog } from '../EoFiltersConfigDialog';
import { EoPreFiltersConfigDialog } from '../EoPreFiltersConfigDialog';
import { EoListColumnsConfigDialog } from '../EoListColumnsConfigDialog';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';

const EO_VIEW_OPTIONS: { value: EoCardBlock['config']['default_view']; label: string; icon: string }[] = [
  { value: 'list', label: 'Liste', icon: 'list' },
  { value: 'tree', label: 'Arbre', icon: 'tree' },
  { value: 'canvas', label: 'Canvas', icon: 'canvas' },
];

interface EoCardConfigSectionProps {
  block: EoCardBlock;
  clientId?: string | null;
  onUpdate: (updates: Partial<EoCardBlock['config']>) => void;
}

export function EoCardConfigSection({
  block,
  clientId,
  onUpdate: updateConfig,
}: EoCardConfigSectionProps) {
  const [eoFieldsDialogOpen, setEoFieldsDialogOpen] = useState(false);
  const [eoFiltersDialogOpen, setEoFiltersDialogOpen] = useState(false);
  const [eoPreFiltersDialogOpen, setEoPreFiltersDialogOpen] = useState(false);
  const [eoListColumnsDialogOpen, setEoListColumnsDialogOpen] = useState(false);

  const config = block.config;

  // Fetch custom EO field definitions for the client
  const { data: customEoFields = [], isLoading: isLoadingCustomFields } = useEoFieldDefinitions(clientId || undefined);

  const availableViews = config.available_views || ['list', 'tree', 'canvas'];

  const toggleView = (view: EoCardBlock['config']['default_view']) => {
    const current = new Set(availableViews);
    if (current.has(view!)) {
      // Don't allow removing all views
      if (current.size > 1) {
        current.delete(view!);
        // If removing the default view, set a new default
        if (config.default_view === view) {
          const remaining = Array.from(current);
          updateConfig({
            available_views: remaining as EoCardBlock['config']['available_views'],
            default_view: remaining[0] as EoCardBlock['config']['default_view']
          });
        } else {
          updateConfig({ available_views: Array.from(current) as EoCardBlock['config']['available_views'] });
        }
      }
    } else {
      current.add(view!);
      updateConfig({ available_views: Array.from(current) as EoCardBlock['config']['available_views'] });
    }
  };

  const activeCustomFields = customEoFields.filter(f => f.is_active);

  return (
    <>
      <div className="space-y-4">
        {/* View modes configuration */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Modes de vue</Label>

          <div className="space-y-2">
            {EO_VIEW_OPTIONS.map(option => (
              <div key={option.value} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`view-${option.value}`}
                    checked={availableViews.includes(option.value!)}
                    onCheckedChange={() => toggleView(option.value)}
                  />
                  <Label htmlFor={`view-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
                {availableViews.includes(option.value!) && (
                  <Button
                    variant={config.default_view === option.value ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 text-xs shrink-0 whitespace-nowrap"
                    onClick={() => updateConfig({ default_view: option.value })}
                  >
                    {config.default_view === option.value ? 'Par défaut' : 'Définir'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* List view columns configuration */}
        {availableViews.includes('list') && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase">Colonnes de la liste</Label>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between gap-1"
              onClick={() => setEoListColumnsDialogOpen(true)}
            >
              <span className="flex items-center gap-2 truncate">
                <Settings2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Configurer les colonnes</span>
              </span>
              <Chip variant="default" className="text-xs shrink-0">
                {(config.list_columns || []).length || 'Défaut'}
              </Chip>
            </Button>
            <p className="text-xs text-muted-foreground">
              Personnalisez les colonnes affichées dans la vue liste
            </p>


          </div>
        )}

        <Separator />

        {/* Role-based field visibility */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Visibilité des champs</Label>

          {(() => {
            // Calculate total fields (base + custom)
            const totalFields = EO_FIELD_DEFINITIONS.length + activeCustomFields.length;
            // Count visible fields
            const configuredFields = config.field_visibility || [];
            // A field is "visible" if visible !== false or if it's not in the config
            const visibleCount = configuredFields.length === 0
              ? totalFields
              : configuredFields.filter(fv => fv.visible !== false).length;

            return (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between gap-1"
                onClick={() => setEoFieldsDialogOpen(true)}
              >
                <span className="flex items-center gap-2 truncate">
                  <Settings2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Configurer les champs</span>
                </span>
                <Chip variant="default" className="text-xs shrink-0">
                  {isLoadingCustomFields ? '...' : `${visibleCount}/${totalFields}`}
                </Chip>
              </Button>
            );
          })()}
          <p className="text-xs text-muted-foreground">
            Définissez quels champs sont visibles en fonction du rôle de l'utilisateur
          </p>
        </div>

        <Separator />

        {/* Pre-filters (default filters) */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Filtres par défaut</Label>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between gap-1"
              onClick={() => setEoPreFiltersDialogOpen(true)}
            >
              <span className="flex items-center gap-2 truncate">
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Filtres par défaut</span>
              </span>
              <Chip variant="default" className="text-xs shrink-0">
                {(config.prefilters || []).length}
              </Chip>
            </Button>
          <p className="text-xs text-muted-foreground">
            Filtres appliqués automatiquement (non modifiables par l'utilisateur)
          </p>
        </div>

        <Separator />

        {/* User filters configuration */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Filtres utilisateur</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-eo-filters" className="text-sm font-normal">Activer les filtres</Label>
            <Switch
              id="enable-eo-filters"
              checked={config.enable_filters ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_filters: checked })}
            />
          </div>

          {config.enable_filters && (
            <div className="pl-4 border-l-2 border-primary/20">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between gap-1"
                onClick={() => setEoFiltersDialogOpen(true)}
              >
                <span className="flex items-center gap-2 truncate">
                  <Filter className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Configurer les filtres</span>
                </span>
                <Chip variant="default" className="text-xs shrink-0">
                  {(config.filters || []).length}
                </Chip>
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Permettez aux utilisateurs de filtrer les EO par champs personnalisés
          </p>
        </div>

        <Separator />

        {/* Creation */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Création</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-eo-create" className="text-sm font-normal">Autoriser l'ajout d'une EO</Label>
            <Switch
              id="enable-eo-create"
              checked={config.enable_create ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_create: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs de créer de nouvelles entités organisationnelles
          </p>
        </div>

        <Separator />

        {/* Archivage */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Archivage</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-eo-archive" className="text-sm font-normal">Autoriser l'archivage d'une EO</Label>
            <Switch
              id="enable-eo-archive"
              checked={config.enable_archive ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_archive: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs d'archiver des entités organisationnelles
          </p>
        </div>

        <Separator />

        {/* Accès configuration */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Accès configuration</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-user-column-config" className="text-sm font-normal">Personnaliser les colonnes</Label>
            <Switch
              id="allow-user-column-config"
              checked={config.allow_user_column_config ?? false}
              onCheckedChange={(checked) => updateConfig({ allow_user_column_config: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs de réordonner et masquer les colonnes
          </p>

          <div className="flex items-center justify-between">
            <Label htmlFor="allow-user-field-management" className="text-sm font-normal">Gérer les champs</Label>
            <Switch
              id="allow-user-field-management"
              checked={config.allow_user_field_management ?? false}
              onCheckedChange={(checked) => updateConfig({ allow_user_field_management: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs de créer et archiver des champs personnalisés
          </p>
        </div>

        <Separator />

        {/* Import / Export */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Import / Export</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-import" className="text-sm font-normal">Activer l'import</Label>
            <Switch
              id="enable-import"
              checked={config.enable_import ?? config.enable_import_export ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_import: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs d'importer des entités
          </p>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-export" className="text-sm font-normal">Activer l'export</Label>
            <Switch
              id="enable-export"
              checked={config.enable_export ?? config.enable_import_export ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_export: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs d'exporter les entités
          </p>
        </div>

        <Separator />

        {/* History / Audit */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Historique</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-history" className="text-sm font-normal">Accès à l'historique</Label>
            <Switch
              id="enable-history"
              checked={config.enable_history ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_history: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs de consulter l'historique des modifications des entités
          </p>
        </div>

        <Separator />

        {/* Reparentage */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Reparentage</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-reparent" className="text-sm font-normal">Glisser-déposer dans l'arbre</Label>
            <Switch
              id="enable-reparent"
              checked={config.enable_reparent ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_reparent: checked })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Permet aux utilisateurs de déplacer les entités dans l'arborescence par glisser-déposer
          </p>
        </div>
      </div>

      {/* EO fields visibility dialog */}
      <EoFieldsVisibilityDialog
        open={eoFieldsDialogOpen}
        onOpenChange={setEoFieldsDialogOpen}
        fieldVisibility={config.field_visibility || []}
        customFields={activeCustomFields}
        onSave={(fieldVisibility) => updateConfig({ field_visibility: fieldVisibility })}
      />

      {/* EO filters configuration dialog */}
      <EoFiltersConfigDialog
        open={eoFiltersDialogOpen}
        onOpenChange={setEoFiltersDialogOpen}
        filters={config.filters || []}
        prefilters={config.prefilters || []}
        customFields={activeCustomFields}
        onSave={(filters) => updateConfig({ filters })}
      />

      {/* EO pre-filters configuration dialog */}
      <EoPreFiltersConfigDialog
        open={eoPreFiltersDialogOpen}
        onOpenChange={setEoPreFiltersDialogOpen}
        prefilters={config.prefilters || []}
        customFields={activeCustomFields}
        onSave={(prefilters) => updateConfig({ prefilters })}
      />

      {/* EO list columns configuration dialog */}
      <EoListColumnsConfigDialog
        open={eoListColumnsDialogOpen}
        onOpenChange={setEoListColumnsDialogOpen}
        columns={config.list_columns || []}
        customFields={activeCustomFields}
        onSave={(list_columns) => updateConfig({ list_columns })}
      />
    </>
  );
}
