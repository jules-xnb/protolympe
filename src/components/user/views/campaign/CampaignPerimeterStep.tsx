import React from 'react';
import { ChevronRight, Search, X, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/hooks/useT';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DynamicFilters, type FilterColumn, type FilterRule, type FilterLogic } from '@/components/admin/DynamicFilters';
import type { OrganizationalEntity } from '@/hooks/useOrganizationalEntities';

export interface EoTarget {
  eo_id: string;
  include_descendants: boolean;
}

interface EoGroup {
  id: string;
  name: string;
}

interface EoTree {
  roots: OrganizationalEntity[];
  childrenMap: Map<string, OrganizationalEntity[]>;
}

interface CampaignPerimeterStepProps {
  // Search
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  // Filters
  filterColumns: FilterColumn[];
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  filterLogic: FilterLogic;
  onFilterLogicChange: (logic: FilterLogic) => void;
  // Groups
  eoGroups: EoGroup[];
  selectedGroupId: string | null;
  onSelectedGroupIdChange: (groupId: string | null) => void;
  // Tree
  filteredEoTree: EoTree;
  eoTree: EoTree;
  expandedEos: Set<string>;
  onToggleExpand: (eoId: string) => void;
  // Targets
  targets: EoTarget[];
  onToggleEo: (eoId: string, checked: boolean) => void;
  onResetTargets: () => void;
  // Helpers
  isEoSelected: (eoId: string) => boolean;
  getAllDescendantIds: (eoId: string) => string[];
}

export function CampaignPerimeterStep({
  searchQuery,
  onSearchQueryChange,
  filterColumns,
  filters,
  onFiltersChange,
  filterLogic,
  onFilterLogicChange,
  eoGroups,
  selectedGroupId,
  onSelectedGroupIdChange,
  filteredEoTree,
  eoTree: _eoTree,
  expandedEos,
  onToggleExpand,
  targets,
  onToggleEo,
  onResetTargets,
  isEoSelected,
  getAllDescendantIds,
}: CampaignPerimeterStepProps) {
  const { t } = useT();

  const renderEoRows = (eos: OrganizationalEntity[], level: number): React.ReactNode[] => {
    return eos.flatMap(eo => {
      const children = filteredEoTree.childrenMap.get(eo.id) || [];
      const hasChildren = children.length > 0;
      const isExpanded = expandedEos.has(eo.id);
      const isSelected = isEoSelected(eo.id);

      // Compute indeterminate state for parents
      let checkboxState: boolean | 'indeterminate' = isSelected;
      if (hasChildren && !isSelected) {
        const descendantIds = getAllDescendantIds(eo.id);
        const someSelected = descendantIds.some(id => isEoSelected(id));
        if (someSelected) checkboxState = 'indeterminate';
      }

      const rows: React.ReactNode[] = [
        <TableRow key={eo.id}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
              {hasChildren ? (
                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={() => onToggleExpand(eo.id)}>
                  <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </Button>
              ) : (
                <div className="w-5" />
              )}
              <Checkbox
                checked={checkboxState}
                onCheckedChange={(checked) => onToggleEo(eo.id, !!checked)}
              />
              <span className="text-sm">
                {eo.name}
                {eo.code && <span className="text-xs text-muted-foreground ml-1">({eo.code})</span>}
              </span>
            </div>
          </TableCell>
        </TableRow>
      ];

      if (hasChildren && isExpanded) {
        rows.push(...renderEoRows(children, level + 1));
      }

      return rows;
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('campaigns.search_placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground shrink-0"
          disabled={targets.length === 0}
          onClick={onResetTargets}
        >
          {t('buttons.reset')}
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Dynamic Filters + Grouping */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterColumns.length > 0 && (
          <DynamicFilters
            columns={filterColumns}
            filters={filters}
            onFiltersChange={onFiltersChange}
            logic={filterLogic}
            onLogicChange={onFilterLogicChange}
          />
        )}
        <Select value={selectedGroupId || ''} onValueChange={(v) => onSelectedGroupIdChange(v || null)}>
          <SelectTrigger className="h-10 w-[200px]">
            <SelectValue placeholder={t('campaigns.grouping_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {eoGroups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* EO Table */}
      <ScrollArea className="flex-1 border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('campaigns.table_subsidiaries')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderEoRows(filteredEoTree.roots, 0)}
          </TableBody>
        </Table>
      </ScrollArea>

    </div>
  );
}
