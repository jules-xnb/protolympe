import { Building2, List, GitBranch, LayoutGrid } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { EoCardBlockConfig, EoViewMode, EoListColumnConfig } from './types';

interface BlockPreviewEoCardProps {
  config: EoCardBlockConfig;
  isCompact?: boolean;
}

const VIEW_ICONS: Record<string, React.ElementType> = {
  list: List,
  tree: GitBranch,
  canvas: LayoutGrid,
};

const VIEW_LABELS: Record<string, string> = {
  list: 'Liste',
  tree: 'Arbre',
  canvas: 'Canvas',
};

const VALID_VIEWS: EoViewMode[] = ['list', 'tree', 'canvas'];

// Mock data rows to simulate what the real view looks like
const MOCK_ROWS = [
  { name: 'Siège Social', code: 'HQ-001', level: 0, is_active: true },
  { name: 'Direction Financière', code: 'FIN-001', level: 1, is_active: true },
  { name: 'Direction RH', code: 'RH-001', level: 1, is_active: true },
  { name: 'Agence Nord', code: 'AGN-001', level: 1, is_active: false },
  { name: 'Service Paie', code: 'RH-002', level: 2, is_active: true },
];

export function BlockPreviewEoCard({ config, isCompact }: BlockPreviewEoCardProps) {
  const availableViews = config.available_views || ['list', 'tree', 'canvas'];
  const defaultView = config.default_view || 'list';
  const validAvailableViews = (availableViews as string[]).filter(v => VALID_VIEWS.includes(v as EoViewMode));

  // Get configured columns or defaults
  const listColumns: EoListColumnConfig[] = config.list_columns && config.list_columns.length > 0
    ? config.list_columns
    : [{ field_id: 'name', field_name: 'Nom' }];

  const pageSize = config.list_page_size ?? 50;
  const mockTotal = 48;
  const displayedRows = MOCK_ROWS.slice(0, isCompact ? 3 : 5);

  // Helper to get mock value
  const getMockValue = (row: typeof MOCK_ROWS[0], fieldId: string): string => {
    if (fieldId === 'name') return row.name;
    if (fieldId === 'code') return row.code;
    if (fieldId === 'level') return String(row.level);
    if (fieldId === 'is_active') return row.is_active ? 'Actif' : 'Inactif';
    return '—';
  };

  if (isCompact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1 flex-wrap">
          {validAvailableViews.map(view => {
            const Icon = VIEW_ICONS[view];
            const isDefault = view === defaultView;
            if (!Icon) return null;
            return (
              <Chip key={view} variant={isDefault ? "default" : "outline"} className="text-xs gap-1">
                <Icon className="h-3 w-3" />
                {VIEW_LABELS[view]}
              </Chip>
            );
          })}
        </div>

        {/* Compact list rows */}
        <div className="space-y-0.5">
          {displayedRows.map((row, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs py-0.5 ${!row.is_active ? 'opacity-50' : ''}`}>
              <Building2 className={`h-3 w-3 shrink-0 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`truncate ${i === 0 ? 'font-medium' : 'text-muted-foreground'}`}>{row.name}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {config.show_children && <Chip variant="outline" className="text-xs">Sous-entités</Chip>}
          {config.enable_search && <Chip variant="outline" className="text-xs">Recherche</Chip>}
          {config.enable_filters && <Chip variant="outline" className="text-xs">Filtres</Chip>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* View mode toggle */}
      <ToggleGroup type="single" value={defaultView} variant="outline" className="justify-start gap-0 rounded-lg overflow-hidden">
        {validAvailableViews.map(view => {
          const Icon = VIEW_ICONS[view];
          if (!Icon) return null;
          return (
            <ToggleGroupItem
              key={view}
              value={view}
              className="rounded-none"
              disabled
            >
              <Icon className="h-[18px] w-[18px]" />
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      {/* Table preview matching real view */}
      <div className="border rounded-md overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
          <div className="w-4 shrink-0" />
          {listColumns.map((col, idx) => (
            <div
              key={col.field_id}
              className={idx === 0 ? "flex-1 min-w-0" : "w-[70px] shrink-0 truncate"}
            >
              {col.field_name}
            </div>
          ))}
        </div>

        {/* Table rows */}
        <div className="divide-y">
          {displayedRows.map((row, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-1.5 ${!row.is_active ? 'opacity-50' : ''}`}
            >
              <div className="w-4 shrink-0 flex items-center justify-center">
                <Building2 className={`h-3 w-3 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              {listColumns.map((col, idx) => {
                const value = getMockValue(row, col.field_id);
                return (
                  <div
                    key={col.field_id}
                    className={
                      idx === 0
                        ? `flex-1 min-w-0 text-xs truncate ${i === 0 ? 'font-medium text-primary' : 'font-medium'}`
                        : "w-[70px] shrink-0 text-xs text-muted-foreground truncate"
                    }
                  >
                    {value}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Pagination footer - matches real view */}
        <div className="px-3 py-1.5 bg-muted/30 border-t">
          <UnifiedPagination
            totalItems={mockTotal}
            currentPage={1}
            totalPages={Math.ceil(mockTotal / pageSize)}
            onPageChange={() => {}}
            rangeStart={1}
            rangeEnd={Math.min(pageSize, mockTotal)}
            compact
          />
        </div>
      </div>

      {/* Config badges */}
      <div className="flex flex-wrap gap-1">
        {config.show_children && <Chip variant="outline" className="text-xs">Sous-entités</Chip>}
        {config.enable_search && <Chip variant="outline" className="text-xs">Recherche</Chip>}
        {config.enable_filters && <Chip variant="outline" className="text-xs">Filtres</Chip>}
        {(config.enable_import ?? config.enable_import_export) && <Chip variant="outline" className="text-xs">Import</Chip>}
        {(config.enable_export ?? config.enable_import_export) && <Chip variant="outline" className="text-xs">Export</Chip>}
        {(config.prefilters?.length ?? 0) > 0 && (
          <Chip variant="default" className="text-xs">
            {config.prefilters!.length} pré-filtre{config.prefilters!.length !== 1 ? 's' : ''}
          </Chip>
        )}
      </div>
    </div>
  );
}
