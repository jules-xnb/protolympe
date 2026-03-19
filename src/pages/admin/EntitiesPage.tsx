import { useState, useMemo, useCallback } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { ColumnDef } from '@tanstack/react-table';
import {
  useOrganizationalEntities,
  useCreateOrganizationalEntity,
  useUpdateOrganizationalEntity,
  useDeleteOrganizationalEntity,
  OrganizationalEntityWithClient,
} from '@/hooks/useOrganizationalEntities';
import { useEoFieldDefinitions, useAllEoFieldValues, useUpsertEoFieldValue } from '@/hooks/useEoFieldDefinitions';
import { getFieldFormat, applyFieldFormat } from '@/lib/eo/eo-field-format';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { EntityFormDialog, EntityFormSubmitData } from '@/components/admin/entities/EntityFormDialog';
import { DynamicFilters, type FilterColumn, type FilterRule, type FilterLogic } from '@/components/admin/DynamicFilters';
import { applyFilters } from '@/components/admin/dynamic-filters-utils';

import { EoTreeView } from '@/components/admin/entities/EoTreeView';
import { EoCanvasView } from '@/components/admin/entities/EoCanvasView';
import { EntityDetailsDrawer } from '@/components/admin/entities/EntityDetailsDrawer';
import { EoGroupsTab } from '@/components/admin/entities/EoGroupsTab';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EmptyState } from '@/components/ui/empty-state';
import { GitBranch, Settings2, Upload, Download, List, LayoutGrid, ArrowUpDown, History, Search, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { useViewMode } from '@/contexts/ViewModeContext';

type ViewMode = 'list' | 'tree' | 'canvas';

export default function EntitiesPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient, isAdmin } = useViewMode();
  
  // Filtered by selected client
  const { data: entities = [], isLoading } = useOrganizationalEntities(selectedClient?.id);

  const { data: customFields = [] } = useEoFieldDefinitions(selectedClient?.id);
  const { data: allFieldValues = [] } = useAllEoFieldValues(selectedClient?.id);
  const createEntity = useCreateOrganizationalEntity();
  const updateEntity = useUpdateOrganizationalEntity();
  const deleteEntity = useDeleteOrganizationalEntity();
  const upsertFieldValue = useUpsertEoFieldValue();

  // Build a lookup map: eo_id -> { field_definition_id -> value }
  const fieldValuesMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    for (const fv of allFieldValues) {
      if (!map[fv.eo_id]) {
        map[fv.eo_id] = {};
      }
      map[fv.eo_id][fv.field_definition_id] = fv.value;
    }
    return map;
  }, [allFieldValues]);

  const [formOpen, setFormOpen] = useState(false);

  const entityDrawer = useDialogState<string>();
  const selectedEntity = useMemo(() => {
    if (!entityDrawer.item) return null;
    return entities.find(e => e.id === entityDrawer.item) || null;
  }, [entities, entityDrawer.item]);
  const [editingEntity, setEditingEntity] = useState<OrganizationalEntityWithClient | null>(null);
  const [deletingEntity, setDeletingEntity] = useState<OrganizationalEntityWithClient | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic filters
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('and');

  // Build filter columns from default fields + custom fields
  const filterColumns: FilterColumn[] = useMemo(() => {
    const defaultCols: FilterColumn[] = [
      { id: 'name', label: 'Nom', type: 'text' },
      { id: 'code', label: 'ID', type: 'text' },
      { id: 'level', label: 'Niveau', type: 'number' },
      
      { id: 'parent_name', label: 'Parent', type: 'text' },
    ];
    const customCols: FilterColumn[] = customFields
      .filter(f => f.is_active)
      .map(f => ({
        id: `custom_${f.id}`,
        label: f.name,
        type: (f.field_type === 'number' || f.field_type === 'decimal') ? 'number' as const
            : f.field_type === 'checkbox' ? 'boolean' as const
            : 'text' as const,
      }));
    return [...defaultCols, ...customCols];
  }, [customFields]);

  // Value getter for filter engine
  const getEntityFilterValue = useCallback((entity: OrganizationalEntityWithClient, columnId: string): unknown => {
    switch (columnId) {
      case 'name': return entity.name;
      case 'code': return entity.code;
      case 'level': return entity.level;
      case 'is_active': return String(entity.is_active);
      case 'parent_name': return entity.parent?.[0]?.name || '';
      default:
        if (columnId.startsWith('custom_')) {
          const fieldId = columnId.replace('custom_', '');
          const val = fieldValuesMap[entity.id]?.[fieldId];
          if (val === undefined || val === null) return '';
          return typeof val === 'string' ? val.replace(/^"|"$/g, '') : String(val);
        }
        return '';
    }
  }, [fieldValuesMap]);

  const filteredEntities = useMemo(() => {
    return applyFilters(entities, filters, filterColumns, getEntityFilterValue, filterLogic);
  }, [entities, filters, filterColumns, getEntityFilterValue, filterLogic]);

  const hasActiveFilters = filters.some(f => f.value !== '');


  const handleCreate = () => {
    navigate(cp(CLIENT_ROUTES.ENTITIES_NEW));
  };

  const handleRowClick = (entity: OrganizationalEntityWithClient) => {
    entityDrawer.open(entity.id);
  };

  const handleExportCSV = () => {
    if (entities.length === 0) return;

    // Find parent code by parent_id
    const getParentCode = (parentId: string | null): string => {
      if (!parentId) return '';
      const parent = entities.find(e => e.id === parentId);
      return parent?.code || '';
    };

    // Active custom fields sorted by display_order
    const activeCustomFields = customFields
      .filter(f => f.is_active)
      .sort((a, b) => a.display_order - b.display_order);

    // Build field values lookup: eo_id -> field_definition_id -> value
    const valuesMap = new Map<string, Map<string, string>>();
    for (const fv of allFieldValues) {
      if (!valuesMap.has(fv.eo_id)) valuesMap.set(fv.eo_id, new Map());
      const val = fv.value;
      const strVal = val === null || val === undefined ? '' 
        : typeof val === 'string' ? val 
        : String(val);
      valuesMap.get(fv.eo_id)!.set(fv.field_definition_id, strVal);
    }

    // CSV headers: core fields + custom fields
    const headers = [
      'code',
      'nom',
      'code_parent',
      'actif',
      ...activeCustomFields.map(f => f.slug),
    ];

    // Build CSV rows
    const rows = entities.map(entity => {
      const entityValues = valuesMap.get(entity.id);
      return [
        entity.code || '',
        entity.name,
        getParentCode(entity.parent_id),
        
        ...activeCustomFields.map(f => {
          const v = entityValues?.get(f.id) || '';
          // Strip surrounding quotes from JSONB strings
          if (typeof v === 'string' && v.startsWith('"') && v.endsWith('"')) {
            return v.slice(1, -1);
          }
          return v;
        }),
      ];
    });

    // Escape CSV values
    const escapeCSV = (value: string): string => {
      if (value.includes(';') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV content
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(escapeCSV).join(';')),
    ].join('\n');

    // Download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entites_${selectedClient?.slug || 'export'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFormSubmit = async ({ coreData, customFieldValues }: EntityFormSubmitData) => {
    let entityId: string;
    
    if (editingEntity) {
      await updateEntity.mutateAsync({ id: editingEntity.id, ...coreData });
      entityId = editingEntity.id;
    } else {
      // Auto-assign client_id from context
      const newEntity = await createEntity.mutateAsync({
        ...coreData,
        client_id: selectedClient?.id
      });
      entityId = newEntity.id;
    }
    
    // Save custom field values
    for (const [fieldId, value] of Object.entries(customFieldValues)) {
      if (value !== undefined && value !== null && value !== '') {
        await upsertFieldValue.mutateAsync({
          eo_id: entityId,
          field_definition_id: fieldId,
          value,
        });
      }
    }
    
    setFormOpen(false);
    setEditingEntity(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingEntity) {
      await deleteEntity.mutateAsync(deletingEntity.id);
      setDeletingEntity(null);
    }
  };

  // Build dynamic columns from custom fields
  // Minimum column width based on field type
  const getFieldMinSize = (fieldType: string): number => {
    switch (fieldType) {
      case 'number':
      case 'decimal':
      case 'checkbox':
        return 80;
      case 'date':
      case 'datetime':
        return 120;
      case 'email':
      case 'url':
        return 200;
      case 'select':
      case 'multiselect':
        return 140;
      case 'textarea':
        return 200;
      case 'text':
      default:
        return 130;
    }
  };

  const customFieldColumns: ColumnDef<OrganizationalEntityWithClient>[] = customFields
    .filter(f => f.is_active)
    .map(field => ({
      id: `custom_${field.id}`,
      header: field.name,
      minSize: getFieldMinSize(field.field_type),
      accessorFn: (row) => {
        const entityValues = fieldValuesMap[row.id];
        const value = entityValues?.[field.id];
        if (value === undefined || value === null || value === '') return '';
        return typeof value === 'string' ? value.replace(/^"|"$/g, '') : String(value);
      },
      cell: ({ row }) => {
        const entityValues = fieldValuesMap[row.original.id];
        const value = entityValues?.[field.id];
        if (value === undefined || value === null || value === '') {
          return <span className="text-muted-foreground">-</span>;
        }
        const raw = typeof value === 'string' 
          ? value.replace(/^"|"$/g, '') 
          : String(value);
        const fieldFormat = getFieldFormat(field.settings);
        const displayValue = fieldFormat ? applyFieldFormat(raw, fieldFormat) : raw;
        return <span>{displayValue}</span>;
      },
    }));

  // Define table columns: core system columns + custom fields + actions
  const columns: ColumnDef<OrganizationalEntityWithClient>[] = [
    {
      accessorKey: 'code',
      header: 'ID',
      size: 150,
      minSize: 150,
      cell: ({ row }) => (
        <span className="font-mono">{row.original.code || '-'}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Nom',
      size: 350,
      minSize: 350,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: 'parent',
      header: 'Parent',
      size: 300,
      minSize: 300,
      accessorFn: (row) => row.parent?.[0]?.name || '',
      cell: ({ row }) => row.original.parent?.[0]?.name || '-',
    },
    {
      accessorKey: 'level',
      header: 'Niv.',
      size: 60,
      cell: ({ row }) => row.original.level,
    },
    // Insert custom field columns
    ...customFieldColumns,
  ];

  // Build column labels dynamically
  const columnLabels: Record<string, string> = {
    code: 'ID',
    name: 'Nom',
    parent: 'Parent',
    level: 'Niv.',
    
    ...Object.fromEntries(
      customFields.filter(f => f.is_active).map(f => [`custom_${f.id}`, f.name])
    ),
  };

  if (!isAdmin && !selectedClient) {
    return (
      <EmptyState icon={GitBranch} title="Sélectionnez un client pour gérer ses entités organisationnelles" />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Entités Organisationnelles"
        description="Gérez la hiérarchie organisationnelle (sites, départements, équipes...)"
        action={
          selectedClient
            ? {
                label: 'Nouvelle entité',
                onClick: handleCreate,
              }
            : undefined
        }
      >
        <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_ARCHIVED))} disabled={!selectedClient}>
          Archives
          <Archive className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={!selectedClient}>
              Import / Export
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_IMPORT))}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV} disabled={entities.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_HISTORY))} disabled={!selectedClient}>
          Historique
          <History className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_FIELDS))} disabled={!selectedClient}>
          Gérer les champs
          <Settings2 className="h-4 w-4" />
        </Button>
      </PageHeader>

      {!selectedClient ? (
        <EmptyState icon={GitBranch} title="Sélectionnez un client pour voir ses entités" />
      ) : (
        <>
          <Tabs defaultValue="entities">
            <TabsList className="justify-start w-full">
              <TabsTrigger value="entities">Entités</TabsTrigger>
              <TabsTrigger value="groups">Regroupements</TabsTrigger>
            </TabsList>
            <TabsContent value="entities">
              {/* Search + filters + view mode toolbar */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une entité..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>

                <DynamicFilters
                  columns={filterColumns}
                  filters={filters}
                  onFiltersChange={setFilters}
                  logic={filterLogic}
                  onLogicChange={setFilterLogic}
                />

                <div className="flex items-center gap-2 ml-auto">
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(v) => { if (v) setViewModeState(v as ViewMode); }}
                    variant="outline"
                    className="gap-0 rounded-lg overflow-hidden"
                  >
                    <ToggleGroupItem value="tree" className="rounded-none h-10 w-10" title="Arbre">
                      <GitBranch className="h-[18px] w-[18px]" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="list" className="rounded-none h-10 w-10" title="Liste">
                      <List className="h-[18px] w-[18px]" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="canvas" className="rounded-none h-10 w-10" title="Canvas">
                      <LayoutGrid className="h-[18px] w-[18px]" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="text-xs text-muted-foreground">
                  {filteredEntities.length} entité{filteredEntities.length !== 1 ? 's' : ''} sur {entities.length}
                </div>
              )}

              {/* List view */}
              {viewMode === 'list' && (
                <div className="overflow-x-auto">
                  <DataTable
                    columns={columns}
                    data={filteredEntities}
                    searchColumns={["name", "code"]}
                    externalSearch={searchQuery}
                    onExternalSearchChange={setSearchQuery}
                    hideSearch
                    isLoading={isLoading}
                    tableId="entities-table"
                    columnLabels={columnLabels}

                    onRowClick={handleRowClick}
                    hideColumnSelector
                  />
                </div>
              )}

              {/* Tree view */}
              {viewMode === 'tree' && (
                <EoTreeView
                  entities={filteredEntities}
                  onEntityClick={handleRowClick}
                  selectedEntityId={selectedEntity?.id}
                  className="mt-2"
                />
              )}

              {/* Canvas view */}
              {viewMode === 'canvas' && (
                <div className="mt-2">
                  <EoCanvasView
                    entities={filteredEntities}
                    onEntityClick={handleRowClick}
                    selectedEntityId={selectedEntity?.id}
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="groups">
              <EoGroupsTab clientId={selectedClient.id} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <EntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entity={editingEntity}
        clients={selectedClient ? [selectedClient] : []}
        entities={entities}
        onSubmit={handleFormSubmit}
        isSubmitting={createEntity.isPending || updateEntity.isPending}
      />

      <DeleteConfirmDialog
        open={!!deletingEntity}
        onOpenChange={(open) => !open && setDeletingEntity(null)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer l'entité"
        description={`Êtes-vous sûr de vouloir supprimer "${deletingEntity?.name}" ? Cette action supprimera également toutes les entités enfants et les données associées.`}
        isDeleting={deleteEntity.isPending}
      />


      <EntityDetailsDrawer
        open={entityDrawer.isOpen}
        onOpenChange={entityDrawer.onOpenChange}
        entity={selectedEntity}
        allEntities={entities}
        customFieldDefinitions={customFields}
        onNavigateToEntity={(entityId) => {
          entityDrawer.open(entityId);
        }}
      />

    </div>
  );
}
