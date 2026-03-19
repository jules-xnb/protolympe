import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { STALE_TIME_MS } from '@/lib/constants';
import { api } from '@/lib/api-client';
import { getFieldFormat, applyFieldFormat } from '@/lib/eo/eo-field-format';
import { EO_LIST_COLUMN_OPTIONS } from '@/components/builder/page-builder/types';
import type { EoCardBlock, EoViewMode, EoListColumnConfig } from '@/components/builder/page-builder/types';
import type { OrganizationalEntity } from './EoCardFields';
import type { FilterRule } from '@/components/admin/DynamicFilters';
import type { EoFieldSettings, EoFieldOption } from '@/hooks/useEoFieldDefinitions';
import { queryKeys } from '@/lib/query-keys';

interface UseEoPaginationParams {
  filteredEntities: OrganizationalEntity[];
  allBaseEntities: OrganizationalEntity[];
  config: EoCardBlock['config'];
  currentView: EoViewMode;
  fieldDefinitions: Array<{
    id: string;
    field_type: string;
    slug: string;
    is_active: boolean;
    display_order: number;
    settings: EoFieldSettings | null;
    options: EoFieldOption[];
  }>;
  isBaseDataLoading: boolean;
  filters: FilterRule[];
  configuredPreFilters: EoCardBlock['config']['prefilters'];
}

export function useEoPagination({
  filteredEntities,
  allBaseEntities,
  config,
  currentView,
  fieldDefinitions,
  isBaseDataLoading,
  filters,
  configuredPreFilters,
}: UseEoPaginationParams) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const pageSize = config.list_page_size ?? 50;

  // Determine if the current sort field is a custom field
  const baseFieldIds = useMemo(() => new Set(EO_LIST_COLUMN_OPTIONS.map(f => f.field)), []);
  const sortFieldIsCustom = sortField ? !baseFieldIds.has(sortField) : false;

  // Fetch sort-column custom field values for ALL visible entities
  const allVisibleEoIds = useMemo(() => filteredEntities.map(e => e.id), [filteredEntities]);
  const { data: sortFieldValuesMap = {} } = useQuery({
    queryKey: queryKeys.eoPagination.sortFieldValues(sortField, allVisibleEoIds),
    queryFn: async () => {
      if (!sortField || !sortFieldIsCustom || allVisibleEoIds.length === 0) return {};
      const map: Record<string, unknown> = {};
      for (let i = 0; i < allVisibleEoIds.length; i += 200) {
        const batch = allVisibleEoIds.slice(i, i + 200);
        const data = await api.post<Array<{ eo_id: string; value: unknown }>>('/api/organizational-entities/field-values', {
          field_definition_id: sortField,
          eo_ids: batch,
        });
        if (data) {
          for (const row of data) {
            let val = row.value;
            if (typeof val === 'string') {
              try { val = JSON.parse(val); } catch { /* intentionally ignored */ }
            }
            map[row.eo_id] = val;
          }
        }
      }
      return map;
    },
    enabled: sortFieldIsCustom && allVisibleEoIds.length > 0,
    staleTime: STALE_TIME_MS,
  });

  // Sort entities
  const allVisibleEntities = useMemo(() => {
    if (!sortField) return filteredEntities;

    return [...filteredEntities].sort((a, b) => {
      let valA: unknown, valB: unknown;

      if (sortFieldIsCustom) {
        valA = sortFieldValuesMap[a.id];
        valB = sortFieldValuesMap[b.id];
      } else {
        valA = getField(a, sortField);
        valB = getField(b, sortField);
      }

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const cmp = strA.localeCompare(strB, 'fr');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredEntities, sortField, sortDirection, sortFieldIsCustom, sortFieldValuesMap]);

  // EO ids for the current list page
  const listPageEoIds = useMemo(() => {
    if (currentView !== 'list') return [] as string[];
    if (allVisibleEntities.length === 0) return [] as string[];
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, allVisibleEntities.length);
    return allVisibleEntities.slice(start, end).map(e => e.id);
  }, [currentView, allVisibleEntities, currentPage, pageSize]);

  // Get custom field IDs from list_columns config
  const customColumnFieldIds = useMemo(() => {
    const cols = config.list_columns || [];
    const baseFieldIdsSet = new Set(EO_LIST_COLUMN_OPTIONS.map(f => f.field));
    const activeFieldIds = new Set(fieldDefinitions.map(f => f.id));
    return cols.filter(c => !baseFieldIdsSet.has(c.field_id) && activeFieldIds.has(c.field_id)).map(c => c.field_id);
  }, [config.list_columns, fieldDefinitions]);

  // Fetch custom field values for list display
  const {
    data: customFieldValuesMap,
  } = useQuery({
    queryKey: queryKeys.eoPagination.customFieldValues(customColumnFieldIds, listPageEoIds),
    queryFn: async () => {
      if (listPageEoIds.length === 0 || customColumnFieldIds.length === 0) return {};

      const map: Record<string, Record<string, unknown>> = {};
      try {
        const data = await api.post<Array<{ eo_id: string; field_definition_id: string; value: unknown }>>('/api/organizational-entities/field-values/batch', {
          eo_ids: listPageEoIds,
          field_definition_ids: customColumnFieldIds,
        });

        for (const row of (data || [])) {
          if (!map[row.eo_id]) map[row.eo_id] = {};
          map[row.eo_id][row.field_definition_id] = row.value;
        }
      } catch (error) {
        console.error('Error fetching custom field values:', error);
      }

      return map;
    },
    enabled: currentView === 'list' && customColumnFieldIds.length > 0 && listPageEoIds.length > 0 && !isBaseDataLoading,
    placeholderData: (prev) => prev ?? {},
    staleTime: STALE_TIME_MS,
  });

  // Get configured columns or use defaults, filtering by visible
  const listColumns = useMemo(() => {
    const configured = config.list_columns;
    if (configured && configured.length > 0) {
      const baseFieldIdsSet = new Set(EO_LIST_COLUMN_OPTIONS.map(f => f.field));
      const activeFieldIds = new Set(fieldDefinitions.map(f => f.id));
      return configured.filter(c => {
        if (c.visible === false) return false;
        if (baseFieldIdsSet.has(c.field_id)) return true;
        return activeFieldIds.has(c.field_id);
      });
    }
    return [
      { field_id: 'name', field_name: 'Nom' },
    ] as EoListColumnConfig[];
  }, [config.list_columns, fieldDefinitions]);

  // All columns (including hidden) for config sheet
  const allListColumns = useMemo(() => {
    return config.list_columns || [];
  }, [config.list_columns]);

  // Helper to get entity field value
  const getEntityFieldValue = useCallback((entity: OrganizationalEntity, fieldId: string, _isCustom?: boolean): React.ReactNode => {
    const baseFieldIdsSet = new Set(EO_LIST_COLUMN_OPTIONS.map(f => f.field));
    const isCustomField = !baseFieldIdsSet.has(fieldId);

    if (isCustomField) {
      const eoValues = customFieldValuesMap?.[entity.id];
      if (!eoValues) return null;
      let value = eoValues[fieldId];
      if (value === null || value === undefined) return null;

      // Find field definition for formatting
      const fieldDef = fieldDefinitions.find(f => f.id === fieldId);
      const fieldFormat = fieldDef ? getFieldFormat(fieldDef.settings) : null;

      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed === null || parsed === undefined) return null;
          if (typeof parsed === 'string') return fieldFormat ? applyFieldFormat(parsed, fieldFormat) : parsed;
          if (typeof parsed === 'number') return fieldFormat ? applyFieldFormat(parsed, fieldFormat) : parsed.toLocaleString('fr-FR');
          if (typeof parsed === 'boolean') return parsed ? 'Oui' : 'Non';
          if (Array.isArray(parsed)) return parsed.join(', ');
          if (typeof parsed === 'object') return JSON.stringify(parsed);
          return String(parsed);
        } catch {
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          return fieldFormat ? applyFieldFormat(value as string, fieldFormat) : (value as string);
        }
      }

      if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
      if (typeof value === 'number') return fieldFormat ? applyFieldFormat(value as number, fieldFormat) : value.toLocaleString('fr-FR');
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'object') return JSON.stringify(value);
      return fieldFormat ? applyFieldFormat(String(value), fieldFormat) : String(value);
    }

    if (fieldId === 'parent') {
      if (!entity.parent_id) return null;
      const parent = allBaseEntities.find(e => e.id === entity.parent_id);
      return parent?.name || null;
    }
    const value = getField(entity, fieldId);
    if (value === null || value === undefined) return null;
    if (fieldId === 'is_active') return value ? 'Actif' : 'Inactif';
    if (fieldId === 'employee_count' && typeof value === 'number') return value.toLocaleString('fr-FR');
    return String(value);
  }, [customFieldValuesMap, allBaseEntities, fieldDefinitions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, configuredPreFilters]);

  // Pagination calculations
  const totalItems = allVisibleEntities.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedEntities = allVisibleEntities.slice(startIndex, endIndex);

  return {
    // Sorted + visible entities (all, before pagination)
    allVisibleEntities,
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    paginatedEntities,
    // Sorting
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    // List columns
    listColumns,
    allListColumns,
    // Field value helper
    getEntityFieldValue,
  };
}
