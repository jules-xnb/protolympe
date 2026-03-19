import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Search, Filter, ChevronLeft, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import type { DataTableBlockConfig } from './types';
import { queryKeys } from '@/lib/query-keys';

interface ItemInfo {
  id: string;
  reference_number: string;
  status: string | null;
  created_at: string;
}

interface BlockPreviewDataTableProps {
  config: DataTableBlockConfig;
  isCompact?: boolean;
}

export function BlockPreviewDataTable({ config, isCompact = false }: BlockPreviewDataTableProps) {
  // Use configured columns or empty array
  const configuredColumns = useMemo(() => config.columns || [], [config.columns]);
  const hasConfiguredColumns = configuredColumns.length > 0;

  // Fetch sample data
  const { data: boData, isLoading } = useQuery({
    queryKey: queryKeys.boPreview.byDefinition(config.bo_definition_id, isCompact),
    queryFn: async () => {
      if (!config.bo_definition_id) return null;

      // Fetch definition
      const definitions = await api.get<{ id: string; name: string; slug: string }[]>(
        `/api/business-objects/definitions?id=${config.bo_definition_id}`
      );
      const definition = definitions[0] || null;

      // Fetch sample items
      const limitParam = isCompact ? 3 : 5;
      const itemsResult = await api.get<{ data: ItemInfo[]; count: number }>(
        `/api/business-objects?definition_id=${config.bo_definition_id}&limit=${limitParam}&count=true`
      );

      return {
        definition,
        items: itemsResult.data || [],
        count: itemsResult.count || 0
      };
    },
    enabled: !!config.bo_definition_id,
  });

  if (!config.bo_definition_id) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Table className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Sélectionnez un objet métier</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    );
  }

  // No columns configured
  if (!hasConfiguredColumns) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Aucune colonne sélectionnée</p>
        <p className="text-xs">Configurez les colonnes à afficher</p>
      </div>
    );
  }

  // Display all configured columns with horizontal scroll
  const displayColumns = configuredColumns;
  const colCount = displayColumns.length;

  return (
    <div className="space-y-2">
      {/* Toolbar Preview */}
      <div className="flex items-center gap-2 px-1">
        {config.enable_search && (
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input 
              className="h-7 pl-7 text-xs" 
              placeholder="Rechercher..." 
              disabled 
            />
          </div>
        )}
        {config.enable_filters && (
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
            Filtres
            <Filter className="h-3 w-3" />
          </Button>
        )}
        
        {/* Spacer */}
        {!config.enable_search && !config.enable_filters && !config.create_button?.enabled && null}
        {(config.enable_search || config.enable_filters) && <div className="flex-1" />}
        
        {/* Create Button */}
        {config.create_button?.enabled && (
          <Button size="sm" className="h-7 text-xs" disabled>
            {config.create_button.label || 'Nouveau'}
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Table Preview */}
      <div className="border rounded-md overflow-x-auto bg-background">
        <div style={{ minWidth: `${Math.max(colCount * 120, 300)}px` }}>
          {/* Header */}
          <div 
            className="grid gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(100px, 1fr))` }}
          >
            {displayColumns.map((col) => (
              <div key={col.field_id + (col.source_field_id || '')} className="truncate">
                {col.source_field_name ? (
                  <span className="text-primary/70">{col.source_field_name}.</span>
                ) : null}
                {col.field_name}
              </div>
            ))}
          </div>

          {/* Rows */}
          {boData?.items.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              Aucune donnée
            </div>
          ) : (
            boData?.items.map((item) => (
              <div 
                key={item.id}
                className="grid gap-2 px-3 py-2 text-xs border-t hover:bg-muted/30 cursor-pointer"
                style={{ gridTemplateColumns: `repeat(${colCount}, minmax(100px, 1fr))` }}
              >
                {displayColumns.map((col) => (
                  <div key={col.field_id + (col.source_field_id || '')} className="text-muted-foreground truncate">
                    —
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination Preview - always shown */}
      {boData && boData.count > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{boData.count} élément{boData.count > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-2">1 / {Math.ceil(boData.count / (config.page_size || 10))}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
