import type { ReactNode } from 'react';
import { List, GitBranch, LayoutGrid, Upload, Download, ArrowUpDown, Plus, Settings2, History } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DynamicFilters, type FilterColumn, type FilterRule, type FilterLogic } from '@/components/admin/DynamicFilters';
import type { EoViewMode } from '@/components/builder/page-builder/types';

const VIEW_ICONS: Record<EoViewMode, React.ElementType> = {
  list: List,
  tree: GitBranch,
  canvas: LayoutGrid,
};

const VIEW_LABELS: Record<EoViewMode, string> = {
  list: 'Liste',
  tree: 'Arbre',
  canvas: 'Canvas',
};

const VALID_VIEWS: EoViewMode[] = ['list', 'tree', 'canvas'];

export interface EoCardHeaderProps {
  title: string;
  userEoCount: number;
  availableViews: EoViewMode[];
  currentView: EoViewMode;
  onViewChange: (view: EoViewMode) => void;
  showConfigButton: boolean;
  onConfigClick: () => void;
  enableImport: boolean;
  enableExport: boolean;
  onImportClick: () => void;
  onExportClick: () => void;
  exportDisabled: boolean;
  enableHistory: boolean;
  onHistoryClick: () => void;
  filterColumns: FilterColumn[];
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  filterLogic: FilterLogic;
  onFilterLogicChange: (logic: FilterLogic) => void;
  enableCreate: boolean;
  onCreateClick: () => void;
  children?: ReactNode;
}

export function EoCardHeader({
  title,
  userEoCount,
  availableViews,
  currentView,
  onViewChange,
  showConfigButton,
  onConfigClick,
  enableImport,
  enableExport,
  onImportClick,
  onExportClick,
  exportDisabled,
  enableHistory,
  onHistoryClick,
  filterColumns,
  filters,
  onFiltersChange,
  filterLogic,
  onFilterLogicChange,
  enableCreate,
  onCreateClick,
  children,
}: EoCardHeaderProps) {
  const validAvailableViews = availableViews.filter(v => VALID_VIEWS.includes(v));

  const renderViewSelector = () => {
    if (validAvailableViews.length <= 1) return null;

    return (
      <ToggleGroup
        type="single"
        value={currentView}
        onValueChange={(v) => { if (v) onViewChange(v as EoViewMode); }}
        variant="outline"
        className="gap-0 rounded-lg overflow-hidden"
      >
        {validAvailableViews.map((view) => {
          const Icon = VIEW_ICONS[view];
          if (!Icon) return null;
          return (
            <ToggleGroupItem
              key={view}
              value={view}
              title={VIEW_LABELS[view]}
              className="rounded-none h-10 w-10"
            >
              <Icon className="h-[18px] w-[18px]" />
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    );
  };

  const renderImportExport = () => {
    if (!enableImport && !enableExport) return null;

    if (enableImport && !enableExport) {
      return (
        <Button variant="outline" className="h-10" onClick={onImportClick}>
          Importer
          <Upload className="h-4 w-4" />
        </Button>
      );
    }
    if (enableExport && !enableImport) {
      return (
        <Button variant="outline" className="h-10" onClick={onExportClick} disabled={exportDisabled}>
          Exporter
          <Download className="h-4 w-4" />
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10">
            Import / Export
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onImportClick}>
            Importer
            <Upload className="ml-auto h-4 w-4" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportClick} disabled={exportDisabled}>
            Exporter
            <Download className="ml-auto h-4 w-4" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="space-y-4 py-4">
      {/* Row 1: Title + action buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          {title}
          {userEoCount > 1 && (
            <Chip variant="secondary">
              {userEoCount} EOs
            </Chip>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {showConfigButton && (
            <Button variant="outline" className="h-10" onClick={onConfigClick}>
              Configuration
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          {renderImportExport()}
          {enableHistory && (
            <Button
              variant="outline"
              className="h-10"
              onClick={onHistoryClick}
            >
              Historique
              <History className="h-4 w-4" />
            </Button>
          )}
          {enableCreate && (
            <Button variant="default" className="h-10" onClick={onCreateClick}>
              Nouveau
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Search (via children slot) + Filters + View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 mr-2">
          {children}
        </div>
        <div className="flex items-center gap-2">
          <DynamicFilters
            columns={filterColumns}
            filters={filters}
            onFiltersChange={onFiltersChange}
            logic={filterLogic}
            onLogicChange={onFilterLogicChange}
            showBadges={false}
          />
          {renderViewSelector()}
        </div>
      </div>
    </div>
  );
}
