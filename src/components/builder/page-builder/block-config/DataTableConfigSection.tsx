import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Chip } from '@/components/ui/chip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import type { DataTableBlock, CreateButtonConfig } from '../types';
import { CreateFormConfigDialog } from '../CreateFormConfigDialog';
import { ColumnsConfigDialog } from '../ColumnsConfigDialog';
import { FiltersConfigDialog } from '../FiltersConfigDialog';
import { PreFiltersConfigDialog } from '../PreFiltersConfigDialog';
import { queryKeys } from '@/lib/query-keys';

interface FieldDef {
  id: string;
  name: string;
  field_type: string;
  display_order: number;
  is_required: boolean;
  reference_object_definition_id?: string | null;
}

interface RelatedBO {
  sourceFieldId: string;
  sourceFieldName: string;
  relatedBoId: string;
  relatedBoName: string;
  fields: FieldDef[];
}

interface DataTableConfigSectionProps {
  block: DataTableBlock;
  boDefinitions: { id: string; name: string }[];
  onUpdate: (updates: Partial<DataTableBlock['config']>) => void;
}

export function DataTableConfigSection({
  block,
  boDefinitions,
  onUpdate: updateConfig,
}: DataTableConfigSectionProps) {
  const [createFormDialogOpen, setCreateFormDialogOpen] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [preFiltersDialogOpen, setPreFiltersDialogOpen] = useState(false);

  const config = block.config;
  const boDefinitionId = config.bo_definition_id;

  const { data: fieldDefinitions = [] } = useQuery<FieldDef[]>({
    queryKey: queryKeys.fieldDefinitions.forColumns(boDefinitionId!),
    queryFn: async () => {
      if (!boDefinitionId) return [];
      const data = await api.get<FieldDef[]>(
        `/api/business-objects/definitions/${boDefinitionId}/fields`
      );
      return data ?? [];
    },
    enabled: !!boDefinitionId,
  });

  const referenceFields = useMemo(() =>
    fieldDefinitions.filter(f => f.field_type === 'object_reference' && f.reference_object_definition_id),
    [fieldDefinitions]
  );

  const relatedBoIds = useMemo(() =>
    referenceFields.map(f => f.reference_object_definition_id!).filter(Boolean),
    [referenceFields]
  );

  const { data: relatedFieldsData = [] } = useQuery({
    queryKey: queryKeys.relatedBoFields.byIds(relatedBoIds),
    queryFn: async () => {
      if (relatedBoIds.length === 0) return [];
      const results = await Promise.all(
        relatedBoIds.map(id =>
          api.get<(FieldDef & { object_definition_id: string })[]>(
            `/api/business-objects/definitions/${id}/fields`
          )
        )
      );
      return results.flat();
    },
    enabled: relatedBoIds.length > 0,
  });

  const relatedBOs = useMemo<RelatedBO[]>(() => {
    return referenceFields.map(refField => {
      const relatedBoId = refField.reference_object_definition_id!;
      const relatedBoDef = boDefinitions.find(b => b.id === relatedBoId);
      const fields = relatedFieldsData.filter(f => f.object_definition_id === relatedBoId);
      return {
        sourceFieldId: refField.id,
        sourceFieldName: refField.name,
        relatedBoId,
        relatedBoName: relatedBoDef?.name || 'Objet lié',
        fields,
      };
    });
  }, [referenceFields, relatedFieldsData, boDefinitions]);

  const directFields = useMemo(() =>
    fieldDefinitions.filter(f => f.field_type !== 'object_reference'),
    [fieldDefinitions]
  );

  const handleSaveCreateFormConfig = (updatedConfig: CreateButtonConfig) => {
    updateConfig({ create_button: updatedConfig });
  };

  const allColumns = config.columns || [];

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Objet métier source</Label>
          <Select
            value={config.bo_definition_id || ''}
            onValueChange={(value) => {
              updateConfig({ bo_definition_id: value || undefined, columns: [] });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un objet métier" />
            </SelectTrigger>
            <SelectContent>
              {boDefinitions.map((bo) => (
                <SelectItem key={bo.id} value={bo.id}>
                  {bo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.bo_definition_id && (
          <>
            <Separator />

            {/* Columns Configuration - Button to open dialog */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  Colonnes
                </Label>
                <span className="text-xs text-muted-foreground">
                  {allColumns.length} colonne{allColumns.length !== 1 ? 's' : ''}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between gap-1"
                onClick={() => setColumnsDialogOpen(true)}
              >
                <span className="flex items-center gap-2 truncate">
                  <Settings2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Configurer les colonnes</span>
                </span>
                <Chip variant="default" className="text-xs shrink-0">
                  {allColumns.length}
                </Chip>
              </Button>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Options</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-search" className="text-sm font-normal">Recherche</Label>
            <Switch
              id="enable-search"
              checked={config.enable_search ?? true}
              onCheckedChange={(checked) => updateConfig({ enable_search: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-filters" className="text-sm font-normal">Filtres</Label>
            <Switch
              id="enable-filters"
              checked={config.enable_filters ?? false}
              onCheckedChange={(checked) => updateConfig({ enable_filters: checked })}
            />
          </div>

          {/* Filter Configuration - Button to open dialog */}
          {config.enable_filters && config.bo_definition_id && (
            <div className="pl-4 border-l-2 border-primary/20">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between gap-1"
                onClick={() => setFiltersDialogOpen(true)}
              >
                <span className="flex items-center gap-2 truncate">
                  <Settings2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Configurer les filtres</span>
                </span>
                <Chip variant="default" className="text-xs shrink-0">
                  {(config.filters || []).length}
                </Chip>
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Pre-filters Configuration */}
        {config.bo_definition_id && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Préfiltres</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreFiltersDialogOpen(true)}
              >
                Configurer
                <Filter className="h-4 w-4" />
                {(config.prefilters || []).length > 0 && (
                  <Chip variant="default" className="ml-2 text-xs">
                    {(config.prefilters || []).length}
                  </Chip>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Filtres fixes appliqués automatiquement
            </p>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label>Lignes par page</Label>
          <div className="flex items-center gap-4">
            <Slider
              value={[config.page_size ?? 10]}
              min={5}
              max={50}
              step={5}
              onValueChange={([value]) => updateConfig({ page_size: value })}
              className="flex-1"
            />
            <span className="text-sm font-mono w-8 text-right">{config.page_size ?? 10}</span>
          </div>
        </div>

        <Separator />

        {/* Create Button Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="enable-create" className="text-sm font-normal">Bouton de création</Label>
            <Switch
              id="enable-create"
              checked={config.create_button?.enabled ?? false}
              onCheckedChange={(checked) => updateConfig({
                create_button: {
                  ...config.create_button,
                  enabled: checked,
                  label: config.create_button?.label || 'Nouveau',
                }
              })}
            />
          </div>

          {config.create_button?.enabled && config.bo_definition_id && (
            <div className="pl-4 border-l-2 border-primary/20">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between gap-1"
                onClick={() => setCreateFormDialogOpen(true)}
              >
                <span className="flex items-center gap-2 truncate">
                  <Settings2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Configurer le formulaire</span>
                </span>
                <Chip variant="default" className="text-xs shrink-0">
                  {(config.create_button?.form_fields || []).length}
                </Chip>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create form configuration dialog */}
      <CreateFormConfigDialog
        open={createFormDialogOpen}
        onOpenChange={setCreateFormDialogOpen}
        config={config.create_button || { enabled: true, label: 'Nouveau' }}
        fieldDefinitions={directFields}
        onSave={handleSaveCreateFormConfig}
      />

      {/* Columns configuration dialog */}
      <ColumnsConfigDialog
        open={columnsDialogOpen}
        onOpenChange={setColumnsDialogOpen}
        columns={config.columns || []}
        directFields={directFields}
        relatedBOs={relatedBOs}
        onSave={(columns) => updateConfig({ columns })}
      />

      {/* Filters configuration dialog */}
      <FiltersConfigDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={config.filters || []}
        columns={config.columns || []}
        directFields={directFields}
        relatedBOs={relatedBOs}
        onSave={(filters) => updateConfig({ filters })}
      />

      {/* Pre-filters configuration dialog */}
      <PreFiltersConfigDialog
        open={preFiltersDialogOpen}
        onOpenChange={setPreFiltersDialogOpen}
        prefilters={config.prefilters || []}
        directFields={directFields}
        relatedBOs={relatedBOs}
        onChange={(prefilters) => updateConfig({ prefilters })}
      />
    </>
  );
}
