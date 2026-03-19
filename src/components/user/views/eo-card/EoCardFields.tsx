import type { ReactNode } from 'react';
import { useRef } from 'react';
import { Building2, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EoListColumnConfig } from '@/components/builder/page-builder/types';

export interface OrganizationalEntity {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  manager_name: string | null;
  cost_center: string | null;
  employee_count: number | null;
  parent_id: string | null;
  path: string;
  level: number;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface EoCardFieldsProps {
  searchEnabled: boolean;
  searchInputValue: string;
  onSearchInputChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSearchClear: () => void;
  listColumns: EoListColumnConfig[];
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: string | null, direction: 'asc' | 'desc') => void;
  paginatedEntities: OrganizationalEntity[];
  userEoIds: string[];
  onEntityClick: (entity: OrganizationalEntity) => void;
  getEntityFieldValue: (entity: OrganizationalEntity, fieldId: string, isCustom?: boolean) => ReactNode;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  hasActiveFilters: boolean;
  searchQuery: string;
  allBaseEntitiesCount: number;
}

export function EoCardFields({
  searchEnabled,
  searchInputValue,
  onSearchInputChange,
  onSearchQueryChange,
  onSearchClear,
  listColumns,
  sortField,
  sortDirection,
  onSortChange,
  paginatedEntities,
  userEoIds,
  onEntityClick,
  getEntityFieldValue,
  totalItems,
  totalPages,
  currentPage,
  startIndex,
  endIndex,
  onPageChange,
  hasActiveFilters,
  searchQuery,
  allBaseEntitiesCount,
}: EoCardFieldsProps) {
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="flex flex-col h-full">
      {searchEnabled && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="relative">
            <Input
              placeholder="Rechercher par nom ou ID..."
              value={searchInputValue}
              onChange={(e) => {
                const value = e.target.value;
                onSearchInputChange(value);
                if (searchDebounceRef.current) {
                  clearTimeout(searchDebounceRef.current);
                }
                searchDebounceRef.current = setTimeout(() => {
                  onSearchQueryChange(value);
                }, 300);
              }}
              className="h-8 pl-8"
            />
            <Building2 className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            {searchInputValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={() => {
                  onSearchClear();
                  if (searchDebounceRef.current) {
                    clearTimeout(searchDebounceRef.current);
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {totalItems > 0 && (
        <div className="px-2 py-2 border-b bg-muted/30">
          <UnifiedPagination
            totalItems={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            rangeStart={startIndex + 1}
            rangeEnd={endIndex}
            compact
            extra={(hasActiveFilters || searchQuery.trim()) && totalItems !== allBaseEntitiesCount ? (
              <span className="ml-1">({allBaseEntitiesCount} au total)</span>
            ) : undefined}
          />
        </div>
      )}

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              {listColumns.map((col) => {
                const isActive = sortField === col.field_id;
                return (
                  <TableHead
                    key={col.field_id}
                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={() => {
                      if (sortField === col.field_id) {
                        if (sortDirection === 'desc') {
                          onSortChange(null, 'asc');
                        } else {
                          onSortChange(col.field_id, 'desc');
                        }
                      } else {
                        onSortChange(col.field_id, 'asc');
                      }
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.field_name}
                      {isActive ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 shrink-0 opacity-30" />
                      )}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEntities.map(entity => {
              return (
                <TableRow
                  key={entity.id}
                  className={`cursor-pointer ${!entity.is_active ? 'opacity-60' : ''}`}
                  onClick={() => onEntityClick(entity)}
                >
                  {listColumns.map((col) => {
                    const value = getEntityFieldValue(entity, col.field_id, col.is_custom);
                    return (
                      <TableCell key={col.field_id} className="truncate max-w-[200px]">
                        {value ?? '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {paginatedEntities.length === 0 && (
              <TableRow>
                <TableCell colSpan={listColumns.length} className="text-center py-4 text-muted-foreground">
                  Aucune entité à afficher
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
