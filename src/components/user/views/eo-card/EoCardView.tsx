import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Building2, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUpdateOrganizationalEntity } from '@/hooks/useOrganizationalEntities';
import { EntityDetailsDrawer } from '@/components/admin/entities/EntityDetailsDrawer';
import { EoCreateDialog } from '../EoCreateDialog';
import { EoUserConfigSheet } from '../EoUserConfigSheet';
import type { EoCardBlock, EoViewMode } from '@/components/builder/page-builder/types';
import { exportEoCSV } from './exportEoCSV';
import { EoCardHeader } from './EoCardHeader';
import { EoCardFields, type OrganizationalEntity } from './EoCardFields';
import { EoCardTreeView, EoCardCanvasView } from './EoCardRelations';
import { useEoBaseData } from './useEoBaseData';
import { useEoFiltering } from './useEoFiltering';
import { useEoPagination } from './useEoPagination';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

interface EoCardViewProps {
  block: EoCardBlock;
  viewConfigId?: string;
  initialEoId?: string;
}

export function EoCardView({ block, viewConfigId, initialEoId }: EoCardViewProps) {
  const { t } = useT();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { viewSlug } = useParams<{ viewSlug: string }>();

  const queryClient = useQueryClient();
  const config = block.config;
  const updateEntity = useUpdateOrganizationalEntity();
  const enableReparent = config.enable_reparent ?? false;
  const enableArchive = config.enable_archive ?? false;
  const availableViews = config.available_views || ['list', 'tree', 'canvas'];
  const defaultView = config.default_view || 'list';
  const [currentView, setCurrentView] = useState<EoViewMode>(defaultView);
  const [selectedEoId, setSelectedEoId] = useState<string | null>(initialEoId || null);
  const [drawerOpen, setDrawerOpen] = useState(!!initialEoId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configSheetOpen, setConfigSheetOpen] = useState(false);

  // --- Base data (EOs, descendants, permissions) ---
  const {
    userEoIds,
    userEoPaths,
    clientId,
    selectedClient,
    userEos,
    allBaseEntities,
    isBaseDataLoading,
  } = useEoBaseData(config);

  // --- Filtering ---
  const {
    filteredEntities,
    filters,
    setFilters,
    filterLogic,
    setFilterLogic,
    filterColumns,
    hasActiveFilters,
    hasFixedPreFilters,
    searchQuery,
    setSearchQuery,
    searchInputValue,
    setSearchInputValue,
    searchDebounceRef,
    searchEnabled,
    fieldDefinitions,
    configuredPreFilters,
  } = useEoFiltering({
    allBaseEntities,
    config,
    clientId,
    isBaseDataLoading,
  });

  // --- Pagination & Sorting ---
  const {
    allVisibleEntities,
    currentPage,
    setCurrentPage,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedEntities,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    listColumns,
    allListColumns,
    getEntityFieldValue,
  } = useEoPagination({
    filteredEntities,
    allBaseEntities,
    config,
    currentView,
    fieldDefinitions,
    isBaseDataLoading,
    filters,
    configuredPreFilters,
  });

  // --- Entity selection & navigation ---

  // Find entity in local cache first (search all base entities, not just visible)
  const cachedSelectedEntity = useMemo(() => {
    if (!selectedEoId) return null;
    return allBaseEntities.find(e => e.id === selectedEoId) ||
           allVisibleEntities.find(e => e.id === selectedEoId) ||
           userEos.find(e => e.id === selectedEoId) || null;
  }, [selectedEoId, allBaseEntities, allVisibleEntities, userEos]);

  // Fetch entity from DB if not in local cache
  const { data: fetchedSelectedEntity } = useQuery({
    queryKey: queryKeys.organizationalEntities.forDrawer(selectedEoId!),
    queryFn: async () => {
      if (!selectedEoId) return null;
      return api.get<OrganizationalEntity>(`/api/organizational-entities/${selectedEoId}`);
    },
    enabled: !!selectedEoId && !cachedSelectedEntity,
    staleTime: 60000,
  });

  const selectedEntity = cachedSelectedEntity || fetchedSelectedEntity || null;

  const handleEntityClick = useCallback((entity: OrganizationalEntity) => {
    setSelectedEoId(entity.id);
    setDrawerOpen(true);
    if (viewSlug) {
      navigate(cp(CLIENT_ROUTES.USER_VIEW_EO(viewSlug, entity.id)));
    }
  }, [viewSlug, navigate, cp]);

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setDrawerOpen(open);
    if (!open && viewSlug) {
      navigate(cp(CLIENT_ROUTES.USER_VIEW(viewSlug)), { replace: true });
    }
  }, [viewSlug, navigate, cp]);

  const handleNavigateToEntity = useCallback((entityId: string) => {
    setSelectedEoId(entityId);
    if (viewSlug) {
      navigate(cp(CLIENT_ROUTES.USER_VIEW_EO(viewSlug, entityId)), { replace: true });
    }
  }, [viewSlug, navigate, cp]);

  const showConfigButton = !!(config.allow_user_column_config || config.allow_user_field_management);

  // Handle reparenting via DnD
  const handleReparent = useCallback(async (entityId: string, newParentId: string | null) => {
    try {
      await updateEntity.mutateAsync({ id: entityId, parent_id: newParentId });
      queryClient.invalidateQueries({ queryKey: queryKeys.organizationalEntities.root() });
    } catch (error) {
      console.error('Failed to reparent entity:', error);
    }
  }, [updateEntity, queryClient]);

  // Export CSV handler
  const handleExportCSV = useCallback(
    () => exportEoCSV(allVisibleEntities, fieldDefinitions, selectedClient?.slug),
    [allVisibleEntities, fieldDefinitions, selectedClient?.slug],
  );

  // --- Loading / empty states ---

  if (isBaseDataLoading) {
    return (
      <div className="h-full">
        <div className="pb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (userEos.length === 0) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('eo.no_organizational_entity')}</p>
            <p className="text-xs mt-1">{t('eo.no_eo_access')}</p>
          </div>
        </div>
      </div>
    );
  }

  const canImport = config.enable_import ?? config.enable_import_export ?? false;
  const canExport = config.enable_export ?? config.enable_import_export ?? false;

  return (
    <div className="relative h-full">
      <div className="h-full flex flex-col">
        {/* View selector header */}
        <EoCardHeader
          title={block.title || t('labels.organization')}
          userEoCount={userEos.length}
          availableViews={availableViews}
          currentView={currentView}
          onViewChange={setCurrentView}
          showConfigButton={showConfigButton}
          onConfigClick={() => setConfigSheetOpen(true)}
          enableImport={canImport}
          enableExport={canExport}
          onImportClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_IMPORT))}
          onExportClick={handleExportCSV}
          exportDisabled={allVisibleEntities.length === 0}
          enableHistory={config.enable_history ?? false}
          onHistoryClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_HISTORY))}
          filterColumns={filterColumns}
          filters={filters}
          onFiltersChange={setFilters}
          filterLogic={filterLogic}
          onFilterLogicChange={setFilterLogic}
          enableCreate={config.enable_create ?? false}
          onCreateClick={() => setCreateDialogOpen(true)}
        >
          {searchEnabled && (
            <div className="relative max-w-sm w-full">
              <Input
                placeholder={t('eo.search_name_or_id')}
                value={searchInputValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchInputValue(value);
                  if (searchDebounceRef.current) {
                    clearTimeout(searchDebounceRef.current);
                  }
                  searchDebounceRef.current = setTimeout(() => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }, 300);
                }}
                className="h-10 pl-8"
              />
              <Building2 className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
              {searchInputValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-2 h-6 w-6 p-0"
                  onClick={() => {
                    setSearchInputValue('');
                    setSearchQuery('');
                    if (searchDebounceRef.current) {
                      clearTimeout(searchDebounceRef.current);
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </EoCardHeader>

        {/* Render current view */}
        <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg mt-2">
          {currentView === 'list' && (
            <EoCardFields
              searchEnabled={false}
              searchInputValue={searchInputValue}
              onSearchInputChange={setSearchInputValue}
              onSearchQueryChange={(value) => {
                setSearchQuery(value);
                setCurrentPage(1);
              }}
              onSearchClear={() => {
                setSearchInputValue('');
                setSearchQuery('');
              }}
              listColumns={listColumns}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={(field, direction) => {
                setSortField(field);
                setSortDirection(direction);
              }}
              paginatedEntities={paginatedEntities}
              userEoIds={userEoIds}
              onEntityClick={handleEntityClick}
              getEntityFieldValue={getEntityFieldValue}
              totalItems={totalItems}
              totalPages={totalPages}
              currentPage={currentPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
              hasActiveFilters={hasActiveFilters}
              searchQuery={searchQuery}
              allBaseEntitiesCount={allBaseEntities.length}
            />
          )}
          {currentView === 'tree' && (
            <EoCardTreeView
              selectedEoId={selectedEoId}
              onEntityClick={handleEntityClick}
              allVisibleEntities={allVisibleEntities}
              allBaseEntities={allBaseEntities}
              hasActiveFilters={hasActiveFilters}
              hasFixedPreFilters={hasFixedPreFilters}
              searchQuery={searchQuery}
            />
          )}
          {currentView === 'canvas' && (
            <EoCardCanvasView
              allVisibleEntities={allVisibleEntities}
              allBaseEntities={allBaseEntities}
              selectedEoId={selectedEoId}
              onEntityClick={handleEntityClick}
              hasActiveFilters={hasActiveFilters}
              searchQuery={searchQuery}
            />
          )}
        </div>
      </div>

      {/* Details drawer */}
      <EntityDetailsDrawer
        entity={selectedEntity}
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        customFieldDefinitions={fieldDefinitions}
        allEntities={allBaseEntities}
        onNavigateToEntity={handleNavigateToEntity}
        enableReparent={enableReparent}
        enableArchive={enableArchive}
      />

      {/* Create dialog */}
      {config.enable_create && clientId && (
        <EoCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          clientId={clientId}
          parentEntities={allBaseEntities.map(e => ({ id: e.id, name: e.name, path: e.path }))}
          defaultParentId={userEoIds.length === 1 ? userEoIds[0] : null}
        />
      )}

      {/* User config sheet */}
      {showConfigButton && viewConfigId && clientId && (
        <EoUserConfigSheet
          open={configSheetOpen}
          onOpenChange={setConfigSheetOpen}
          viewConfigId={viewConfigId}
          blockId={block.id}
          clientId={clientId}
          listColumns={allListColumns}
          allowColumnConfig={config.allow_user_column_config ?? false}
          allowFieldManagement={config.allow_user_field_management ?? false}
        />
      )}
    </div>
  );
}
