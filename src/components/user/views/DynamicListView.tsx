import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  List,
} from 'lucide-react';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { useT } from '@/hooks/useT';
import type { ViewConfig } from '@/hooks/useViewConfigs';
import type { Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

interface ColumnConfig {
  field_id: string;
  field_name: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
}

interface ListConfig {
  columns?: ColumnConfig[];
  default_sort_field?: string;
  default_sort_direction?: 'asc' | 'desc';
  page_size?: number;
  show_search?: boolean;
  show_filters?: boolean;
  show_pagination?: boolean;
  row_click_action?: 'detail' | 'edit' | 'none';
}

function getConfig(json: Json | undefined): ListConfig {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as ListConfig;
  }
  return {};
}

interface DynamicListViewProps {
  viewConfig: ViewConfig;
  onRowClick?: (item: Record<string, unknown>) => void;
}

export function DynamicListView({ viewConfig, onRowClick }: DynamicListViewProps) {
  const { t } = useT();
  const config = getConfig(viewConfig.config);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState(config.default_sort_field || '');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(
    config.default_sort_direction || 'desc'
  );

  const pageSize = config.page_size || 10;

  // Fetch business objects
  const { data: items = [], isLoading, refetch: _refetch } = useQuery({
    queryKey: queryKeys.businessObjects.listPaginated(viewConfig.bo_definition_id!, currentPage, pageSize, sortField, sortDirection, searchQuery),
    queryFn: async () => {
      if (!viewConfig.bo_definition_id) return [];
      const params = new URLSearchParams({
        definition_id: viewConfig.bo_definition_id,
        page: String(currentPage),
        page_size: String(pageSize),
        sort_field: sortField || 'created_at',
        sort_direction: sortDirection,
      });
      if (searchQuery) params.set('search', searchQuery);
      return api.get<Record<string, unknown>[]>(`/api/business-objects?${params}`);
    },
    enabled: !!viewConfig.bo_definition_id,
  });

  // Fetch campaign names linked via survey_responses
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const { data: campaignMap = new Map() } = useQuery({
    queryKey: queryKeys.businessObjects.campaignNames(itemIds),
    queryFn: async () => {
      if (itemIds.length === 0) return new Map<string, string>();
      const data = await api.post<Array<{ business_object_id: string; campaign_name: string }>>('/api/business-objects/campaign-names', { bo_ids: itemIds });
      const map = new Map<string, string>();
      data.forEach((r) => {
        if (r.business_object_id && r.campaign_name) {
          map.set(r.business_object_id, r.campaign_name);
        }
      });
      return map;
    },
    enabled: itemIds.length > 0,
  });

  const hasAnyCampaign = campaignMap.size > 0;

  // Get total count for pagination (with search filter)
  const { data: totalCount = 0 } = useQuery({
    queryKey: queryKeys.businessObjects.count(viewConfig.bo_definition_id!, searchQuery),
    queryFn: async () => {
      if (!viewConfig.bo_definition_id) return 0;
      const params = new URLSearchParams({ definition_id: viewConfig.bo_definition_id });
      if (searchQuery) params.set('search', searchQuery);
      const result = await api.get<{ count: number }>(`/api/business-objects/count?${params}`);
      return result.count || 0;
    },
    enabled: !!viewConfig.bo_definition_id,
  });

  // Get total count without search filter
  const { data: totalCountUnfiltered = 0 } = useQuery({
    queryKey: queryKeys.businessObjects.countUnfiltered(viewConfig.bo_definition_id!),
    queryFn: async () => {
      if (!viewConfig.bo_definition_id) return 0;
      const result = await api.get<{ count: number }>(`/api/business-objects/count?definition_id=${viewConfig.bo_definition_id}`);
      return result.count || 0;
    },
    enabled: !!viewConfig.bo_definition_id,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  // Auto-add campaign column if any item has a campaign
  const columns = useMemo(() => {
    // Get columns to display
    const baseColumns = config.columns?.length
      ? config.columns
      : [
          { field_id: 'reference_number', field_name: t('labels.reference'), sortable: true },
          { field_id: 'title', field_name: t('labels.title'), sortable: true },
          { field_id: 'status', field_name: t('labels.status'), sortable: false },
          { field_id: 'created_at', field_name: t('labels.created_at'), sortable: true },
        ];
    if (!hasAnyCampaign) return baseColumns;
    // Insert campaign column after status (or at end if no status)
    const statusIdx = baseColumns.findIndex(c => c.field_id === 'status');
    const insertAt = statusIdx !== -1 ? statusIdx + 1 : baseColumns.length;
    const result = [...baseColumns];
    result.splice(insertAt, 0, { field_id: '__campaign__', field_name: t('labels.campaign'), sortable: false });
    return result;
  }, [config.columns, hasAnyCampaign]);

  const renderCellValue = (item: Record<string, unknown>, column: ColumnConfig) => {
    const { field_id } = column;

    // Campaign auto-column
    if (field_id === '__campaign__') {
      const name = campaignMap.get(item.id as string);
      return name ? <Chip variant="outline">{name}</Chip> : '—';
    }

    // Standard fields
    if (field_id === 'reference_number') {
      return <Chip variant="outline">{item.reference_number as string}</Chip>;
    }
    if (field_id === 'title') {
      return item.title as string || '-';
    }
    if (field_id === 'status') {
      return item.status ? <Chip variant="default">{item.status as string}</Chip> : '-';
    }
    if (field_id === 'created_at' || field_id === 'updated_at') {
      const date = item[field_id] as string;
      return date ? new Date(date).toLocaleDateString('fr-FR') : '-';
    }

    // Custom fields from field_values
    return '-';
  };

  if (!viewConfig.bo_definition_id) {
    return (
      <Card className="flex items-center justify-center h-64">
        <CardContent className="text-center py-8">
          <List className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">{t('views.no_bo_configured')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      {config.show_search !== false && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('placeholders.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-10"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {searchQuery
              ? `${totalCount} / ${totalCountUnfiltered} ${t('views.results')}`
              : `${totalCount} ${t('views.results')}`}
          </span>
        </div>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.field_id}>
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort(column.field_id)}
                    >
                      {column.field_name}
                      {getSortIcon(column.field_id)}
                    </Button>
                  ) : (
                    column.field_name
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <p className="text-muted-foreground">{t('empty.no_items')}</p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.field_id}>
                      {renderCellValue(item, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {config.show_pagination !== false && totalPages > 1 && (
        <UnifiedPagination
          totalItems={totalCount}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          rangeStart={(currentPage - 1) * pageSize + 1}
          rangeEnd={Math.min(currentPage * pageSize, totalCount)}
        />
      )}
    </div>
  );
}
