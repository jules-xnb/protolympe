import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Loader2, AlertCircle, Search, Plus } from 'lucide-react';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { useBoFieldDefinitions, type BoFieldDefinition } from '@/hooks/useBoFieldDefinitions';
import { useBusinessObjectsWithFields, type BusinessObjectWithFields } from '@/hooks/useBusinessObjectsWithFields';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicFilters, type FilterRule, type FilterLogic, type FilterColumn } from '@/components/admin/DynamicFilters';
import { applyFilters } from '@/components/admin/dynamic-filters-utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { CreateBusinessObjectDialog } from './CreateBusinessObjectDialog';
import { EoCardView } from './eo-card/EoCardView';
import { SurveyCreatorView } from './SurveyCreatorView';
import { SurveyResponsesView } from './SurveyResponsesView';
import { UsersBlockView } from './UsersBlockView';
import { ProfilesBlockView } from './ProfilesBlockView';
import type { PageBlock, PageBuilderConfig, DataTableBlock, EoCardBlock, SurveyCreatorBlock, SurveyResponsesBlock, UsersBlock, ProfilesBlock, DataTableColumnConfig } from '@/components/builder/page-builder/types';
import { queryKeys } from '@/lib/query-keys';
import { useViewConfigById } from '@/hooks/useViewConfigs';
import { useBoDefinitionsList } from '@/hooks/useBusinessObjectDefinitions';
import { useT } from '@/hooks/useT';

interface DynamicPageViewProps {
  viewId: string;
  eoId?: string;
}


// Data Table Component
function DataTableView({ block, boDefinitions, userRoleIds: _userRoleIds }: {
  block: DataTableBlock;
  boDefinitions: { id: string; name: string }[];
  userRoleIds: string[];
}) {
  const { t } = useT();
  const navigate = useNavigate();
  const cp = useClientPath();
  const queryClient = useQueryClient();
  const boId = block.config.bo_definition_id;
  const boName = boDefinitions.find(b => b.id === boId)?.name;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('and');
  const pageSize = block.config.page_size || 10;

  // Get all columns (no role filtering anymore)
  const visibleColumns = useMemo(() => {
    return block.config.columns || [];
  }, [block.config.columns]);

  

  // Fetch field definitions
  const { data: fieldDefinitions = [] } = useBoFieldDefinitions(boId);

  // Build filter columns from configured columns + field definitions
  const filterColumns = useMemo<FilterColumn[]>(() => {
    if (visibleColumns.length === 0) {
      return [
        { id: 'reference_number', label: t('labels.reference'), type: 'text' },
        { id: 'title', label: t('labels.title'), type: 'text' },
        { id: 'status', label: t('labels.status'), type: 'text' },
      ];
    }
    return visibleColumns.map(col => {
      const fieldDef = fieldDefinitions.find(f => f.id === col.field_id);
      let type: FilterColumn['type'] = 'text';
      let options: FilterColumn['options'] | undefined;
      if (fieldDef) {
        const ft = fieldDef.field_type;
        if (['number', 'decimal'].includes(ft)) type = 'number';
        else if (ft === 'checkbox') type = 'boolean';
        else if (['date', 'datetime'].includes(ft)) type = 'date';
        else if (['select', 'multiselect'].includes(ft)) {
          type = 'select';
          const settings = fieldDef as BoFieldDefinition & { settings?: { options?: Array<{ value?: string; label?: string }> } };
          const rawOpts = settings.settings?.options || [];
          if (Array.isArray(rawOpts) && rawOpts.length > 0) {
            options = rawOpts.map((o) => ({ value: String(o.value ?? o), label: String(o.label ?? o) }));
          }
        }
      }
      return {
        id: col.field_id,
        label: col.source_field_name ? `${col.source_field_name}.${col.field_name}` : col.field_name,
        type,
        ...(options ? { options } : {}),
      };
    });
  }, [visibleColumns, fieldDefinitions]);

  // Fetch business objects with field values
  const { data: boData, isLoading } = useBusinessObjectsWithFields({
    definitionId: boId,
    page: currentPage,
    pageSize,
    prefilters: block.config.prefilters,
  });
  const items = useMemo(() => boData?.items || [], [boData?.items]);
  const totalCount = boData?.totalCount || 0;

  // Apply client-side filters
  const filteredItems = useMemo(() => {
    const getValueFn = (item: BusinessObjectWithFields, columnId: string) => {
      if (['reference_number', 'title', 'status', 'created_at'].includes(columnId)) {
        return getField(item, columnId);
      }
      return item._fieldValues?.get(columnId) ?? null;
    };
    return applyFilters(items, filters, filterColumns, getValueFn, filterLogic);
  }, [items, filters, filterColumns, filterLogic]);

  const canAccessDetail = true;

  // Handle row click
  const handleRowClick = (item: BusinessObjectWithFields) => {
    if (canAccessDetail) {
      navigate(cp(CLIENT_ROUTES.USER_BO(boId!, item.id)));
    }
  };

  // Get field value for display
  const getFieldValue = (item: BusinessObjectWithFields, column: DataTableColumnConfig) => {
    if (column.source_field_id) return '-';

    if (['reference_number', 'title', 'status'].includes(column.field_id)) {
      return getField(item, column.field_id) || '-';
    }

    const value = item._fieldValues?.get(column.field_id);
    if (value === null || value === undefined) return '-';

    const fieldDef = fieldDefinitions.find(f => f.id === column.field_id);
    if (fieldDef?.field_type === 'checkbox') return value ? t('boolean.yes') : t('boolean.no');
    if (fieldDef?.field_type === 'date') return new Date(value).toLocaleDateString('fr-FR');
    if (fieldDef?.field_type === 'datetime') return new Date(value).toLocaleString('fr-FR');

    return String(value);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasCreateButton = block.config.create_button?.enabled;

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-6 pb-6 pt-3">
        {/* Row 1: Title + action buttons */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            {block.title || boName || t('labels.data_table')}
          </h3>
          {hasCreateButton && (
            <Button size="sm" className="h-8" onClick={() => setIsCreateDialogOpen(true)}>
              {block.config.create_button?.label || t('buttons.new')}
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Row 2: Search + Filters */}
        {(block.config.enable_search || block.config.enable_filters) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 mr-2">
              {block.config.enable_search && (
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('placeholders.search')}
                    className="pl-8 h-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {block.config.enable_filters && filterColumns.length > 0 && (
                <DynamicFilters
                  columns={filterColumns}
                  filters={filters}
                  onFiltersChange={(f) => { setFilters(f); setCurrentPage(0); }}
                  logic={filterLogic}
                  onLogicChange={setFilterLogic}
                  showBadges={false}
                />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.length > 0 ? (
                  visibleColumns.map(col => (
                    <TableHead key={col.field_id + (col.source_field_id || '')}>
                      {col.source_field_name ? `${col.source_field_name}.${col.field_name}` : col.field_name}
                    </TableHead>
                  ))
                ) : (
                  <>
                    <TableHead>{t('labels.reference')}</TableHead>
                    <TableHead>{t('labels.title')}</TableHead>
                    <TableHead>{t('labels.status')}</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {(visibleColumns.length > 0 ? visibleColumns : [1, 2, 3]).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length || 3} className="text-center py-8 text-muted-foreground">
                    {t('views.no_data_available')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item: BusinessObjectWithFields) => (
                  <TableRow
                    key={item.id}
                    className={canAccessDetail ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => handleRowClick(item)}
                  >
                    {visibleColumns.length > 0 ? (
                      visibleColumns.map(col => (
                        <TableCell key={col.field_id + (col.source_field_id || '')}>
                          {col.field_id === 'status' && item.status ? (
                            <Chip variant="default">{item.status}</Chip>
                          ) : (
                            getFieldValue(item, col) as React.ReactNode
                          )}
                        </TableCell>
                      ))
                    ) : (
                      <>
                        <TableCell className="font-medium">{item.reference_number}</TableCell>
                        <TableCell>{item.title || '-'}</TableCell>
                        <TableCell>
                          {item.status ? <Chip variant="default">{item.status}</Chip> : '-'}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t">
              <UnifiedPagination
                totalItems={totalCount}
                currentPage={currentPage + 1}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page - 1)}
                pageSize={pageSize}
                rangeStart={currentPage * pageSize + 1}
                rangeEnd={Math.min((currentPage + 1) * pageSize, totalCount)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      {hasCreateButton && boId && (
        <CreateBusinessObjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          boDefinitionId={boId}
          formFields={block.config.create_button?.form_fields || []}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.businessObjects.list(boId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.businessObjects.count(boId) });
          }}
        />
      )}
    </div>
  );
}

// Block Renderer
function BlockView({ block, boDefinitions, userRoleIds, viewConfigId, clientId, eoId, children }: {
  block: PageBlock;
  boDefinitions: { id: string; name: string }[];
  userRoleIds: string[];
  viewConfigId: string;
  clientId?: string;
  eoId?: string;
  children?: PageBlock[];
}) {
  const { t } = useT();
  switch (block.type) {
    case 'data_table':
      return <DataTableView block={block as DataTableBlock} boDefinitions={boDefinitions} userRoleIds={userRoleIds} />;
    case 'eo_card':
      return <EoCardView block={block as EoCardBlock} viewConfigId={viewConfigId} initialEoId={eoId} />;
    case 'survey_creator':
      return <SurveyCreatorView block={block as SurveyCreatorBlock} viewConfigId={viewConfigId} clientId={clientId} />;
    case 'survey_responses':
      return <SurveyResponsesView block={block as SurveyResponsesBlock} />;
    case 'users':
      return <UsersBlockView config={(block as UsersBlock).config} />;
    case 'profiles':
      return <ProfilesBlockView config={(block as ProfilesBlock).config} />;
    case 'section':
    case 'sub_section': {
      const title = block.title || (block.config as { title?: string }).title;
      const isSubSection = block.type === 'sub_section';
      return (
        <div className="space-y-4">
          {title && (
            <h2 className={isSubSection ? 'text-base font-semibold' : 'text-lg font-bold'}>
              {title}
            </h2>
          )}
          {children && children.length > 0 && (
            <div className="space-y-4">
              {children.map(child => (
                <BlockView
                  key={child.id}
                  block={child}
                  boDefinitions={boDefinitions}
                  userRoleIds={userRoleIds}
                  viewConfigId={viewConfigId}
                  clientId={clientId}
                  eoId={eoId}
                />
              ))}
            </div>
          )}
        </div>
      );
    }
    case 'separator': {
      const sepStyle = (block.config as { style?: string }).style || 'line';
      return sepStyle === 'line' ? <hr className="border-border" /> : <div className="h-6" />;
    }
    default:
      return <div className="p-4 text-muted-foreground text-center">{t('views.unknown_block_type')}</div>;
  }
}

export function DynamicPageView({ viewId, eoId }: DynamicPageViewProps) {
  const { t } = useT();
  // Get user's permission context
  const { data: permContext } = useUserPermissions();
  const userRoleIds = permContext?.roleIds || [];
  
  // Get client ID from view mode context
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id;

  const { data: viewConfig, isLoading: isLoadingConfig } = useViewConfigById(viewId);

  const { data: boDefinitions = [] } = useBoDefinitionsList();

  const config = useMemo(() => viewConfig?.config as PageBuilderConfig | null, [viewConfig]);
  const activeBlocks = useMemo(() => config?.blocks?.filter(b => b.isActive) || [], [config]);
  const topLevelBlocks = useMemo(() => activeBlocks.filter(b => !b.parentId), [activeBlocks]);
  const childrenByParent = useMemo(() => {
    const map: Record<string, PageBlock[]> = {};
    for (const b of activeBlocks) {
      if (b.parentId) {
        if (!map[b.parentId]) map[b.parentId] = [];
        map[b.parentId].push(b);
      }
    }
    return map;
  }, [activeBlocks]);

  if (isLoadingConfig) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!config || activeBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm font-medium">{t('views.page_not_configured')}</p>
        <p className="text-xs">{t('views.page_no_content')}</p>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100dvh-3rem)]" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: `${config.settings?.gap || 16}px` }}>
      {topLevelBlocks.map(block => {
        // rowSpan 4 = 100% of viewport height, rowSpan 2 = 50%, etc.
        const heightPercent = ((block.position.rowSpan || 4) / 4) * 100;
        return (
          <div
            key={block.id}
            className="overflow-hidden"
            style={{
              gridColumn: `span ${block.position.colSpan || 12}`,
              height: `${heightPercent}%`,
            }}
          >
            <div className="h-full overflow-auto">
              <BlockView block={block} boDefinitions={boDefinitions} userRoleIds={userRoleIds} viewConfigId={viewId} clientId={clientId} eoId={eoId} children={childrenByParent[block.id]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Export for use in PageBuilder preview
export function DynamicPageViewFromConfig({ blocks, settings, boDefinitions = [], viewConfigId = '' }: {
  blocks: PageBlock[];
  settings?: { gap?: number; padding?: number };
  boDefinitions?: { id: string; name: string }[];
  viewConfigId?: string;
}) {
  const { t } = useT();
  const activeBlocks = blocks.filter(b => b.isActive);
  const topLevel = activeBlocks.filter(b => !b.parentId);
  const childMap: Record<string, PageBlock[]> = {};
  for (const b of activeBlocks) {
    if (b.parentId) {
      if (!childMap[b.parentId]) childMap[b.parentId] = [];
      childMap[b.parentId].push(b);
    }
  }

  if (topLevel.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm font-medium">{t('views.no_active_blocks')}</p>
        <p className="text-xs">{t('views.add_blocks_hint')}</p>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100dvh-3rem)]" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: `${settings?.gap || 16}px` }}>
      {topLevel.map(block => {
        const heightPercent = ((block.position.rowSpan || 4) / 4) * 100;
        return (
          <div
            key={block.id}
            className="overflow-hidden"
            style={{
              gridColumn: `span ${block.position.colSpan || 12}`,
              height: `${heightPercent}%`,
            }}
          >
            <div className="h-full overflow-auto">
              <BlockView block={block} boDefinitions={boDefinitions} userRoleIds={[]} viewConfigId={viewConfigId} children={childMap[block.id]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
