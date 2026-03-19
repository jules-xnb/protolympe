import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { applyFilters } from '@/components/admin/dynamic-filters-utils';
import type { FilterColumn, FilterRule, FilterLogic } from '@/components/admin/DynamicFilters';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { useAllListeValues } from '@/hooks/useListeValues';
import {
  fetchEoFieldValuesForEos,
  matchesPreFilterValue,
  normalizeJsonbScalar,
  type PreFilterOperator as FilterOperator,
} from './eo-field-filtering';
import type { EoCardBlock, EoPreFilterConfig } from '@/components/builder/page-builder/types';
import type { OrganizationalEntity } from './EoCardFields';
import { queryKeys } from '@/lib/query-keys';

const NATIVE_FIELD_IDS = new Set([
  'name', 'code', 'description', 'email', 'phone', 'website',
  'address_line1', 'address_line2', 'city', 'postal_code', 'country',
  'manager_name', 'cost_center', 'employee_count', 'budget',
  'is_active', 'level', 'path', 'parent',
]);

function mapPreFilterOperator(op: string): string {
  switch (op) {
    case 'equals': return 'equals';
    case 'not_equals': return 'not_equals';
    case 'contains': return 'contains';
    case 'not_contains': return 'contains';
    case 'greater_than': return 'gt';
    case 'less_than': return 'lt';
    case 'greater_or_equal': return 'gte';
    case 'less_or_equal': return 'lte';
    default: return 'equals';
  }
}

function buildPrefilterRules(prefilters: EoPreFilterConfig[]): FilterRule[] {
  return prefilters
    .filter(pf => pf.value !== undefined && pf.value !== '')
    .map(pf => ({
      id: `prefilter_${pf.field_id}`,
      columnId: pf.field_id,
      operator: mapPreFilterOperator(pf.operator || 'equals'),
      value: String(pf.value),
      is_locked: false,
    }));
}

interface UseEoFilteringParams {
  allBaseEntities: OrganizationalEntity[];
  config: EoCardBlock['config'];
  clientId: string | undefined;
  isBaseDataLoading: boolean;
}

export function useEoFiltering({
  allBaseEntities,
  config,
  clientId,
  isBaseDataLoading,
}: UseEoFilteringParams) {
  const configuredPreFilters = config.prefilters || [];

  // Separate fixed vs editable pre-filters
  const fixedPreFilters = configuredPreFilters.filter(pf => !pf.is_user_editable);
  const editablePreFilters = configuredPreFilters.filter(pf => pf.is_user_editable);

  // DynamicFilters state
  const [filters, setFilters] = useState<FilterRule[]>(() => buildPrefilterRules(editablePreFilters));
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('and');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync editable pre-filters only on initial mount (tracked via ref)
  const prefiltersInitialized = useRef(false);
  useEffect(() => {
    if (prefiltersInitialized.current) return;
    if (editablePreFilters.length === 0) return;
    prefiltersInitialized.current = true;
  }, [editablePreFilters]);

  const hasFixedPreFilters = fixedPreFilters.length > 0;

  // Fetch field definitions to get options for select fields
  const { data: fieldDefinitions = [] } = useEoFieldDefinitions(clientId);

  // Batch-fetch referential values for fields that use referentials
  const fieldsWithRef = useMemo(
    () => fieldDefinitions
      .filter(f => ['select', 'multiselect'].includes(f.field_type))
      .map(f => ({ referential_id: (f.settings?.referential_id as string) ?? null })),
    [fieldDefinitions],
  );
  const { data: refValuesMap } = useAllListeValues(fieldsWithRef);

  // Get options for select fields (must be before filterColumns)
  const getFieldOptions = useCallback((fieldId: string): { value: string; label: string }[] => {
    const fieldDef = fieldDefinitions.find(f => f.id === fieldId);
    if (!fieldDef) return [];

    // Check referential first
    const refId = fieldDef.settings?.referential_id;
    if (refId && refValuesMap) {
      const values = refValuesMap.get(refId);
      if (values) {
        return values.map(rv => ({ value: rv.label, label: rv.label }));
      }
    }

    // Fallback to inline options
    if (!fieldDef.options) return [];
    return fieldDef.options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return { value: opt.value || '', label: opt.label || opt.value || '' };
    });
  }, [fieldDefinitions, refValuesMap]);

  // Build filter columns for DynamicFilters
  const filterColumns: FilterColumn[] = useMemo(() => {
    const configuredFilters = config.filters || [];
    const existingIds = new Set(configuredFilters.map(f => f.field_id));
    const mergedFilters = [
      ...configuredFilters,
      ...editablePreFilters
        .filter(pf => !existingIds.has(pf.field_id))
        .map(pf => ({
          field_id: pf.field_id,
          field_name: pf.field_name,
          field_type: pf.field_type,
          is_native: pf.is_native,
          is_locked: true,
        })),
    ];
    if (mergedFilters.length === 0) return [
      { id: 'name', label: 'Nom', type: 'text' as const },
      { id: 'code', label: 'ID', type: 'text' as const },
      { id: 'is_active', label: 'Statut actif', type: 'boolean' as const },
    ];

    const nativeTypeMap: Record<string, FilterColumn['type']> = {
      name: 'text', code: 'text', is_active: 'boolean', city: 'text',
      country: 'text', manager_name: 'text', employee_count: 'number',
      email: 'text', cost_center: 'text', description: 'text', phone: 'text',
      website: 'text', address_line1: 'text', address_line2: 'text',
      postal_code: 'text', budget: 'number', level: 'number', path: 'text',
    };

    const cols: FilterColumn[] = [];
    for (const f of mergedFilters) {
      const fieldId = f.field_id;
      if (NATIVE_FIELD_IDS.has(fieldId)) {
        cols.push({
          id: fieldId,
          label: f.field_name,
          type: nativeTypeMap[fieldId] || 'text',
        });
      } else {
        let type: FilterColumn['type'] = 'text';
        const ft = ('field_type' in f ? (f as { field_type: string }).field_type : undefined)
          || fieldDefinitions.find(fd => fd.id === fieldId)?.field_type;
        if (ft === 'number' || ft === 'decimal') type = 'number';
        else if (ft === 'checkbox') type = 'boolean';
        else if (ft === 'select' || ft === 'multiselect') type = 'select';
        else if (ft === 'date' || ft === 'datetime') type = 'date';
        cols.push({
          id: fieldId,
          label: f.field_name,
          type,
          options: type === 'select' ? getFieldOptions(fieldId) : undefined,
        });
      }
    }
    return cols;
  }, [config.filters, editablePreFilters, fieldDefinitions, getFieldOptions]);

  // Derive active rules split by native vs custom
  const nativeRules = useMemo(() => filters.filter(r => r.value && NATIVE_FIELD_IDS.has(r.columnId)), [filters]);
  const customRules = useMemo(() => filters.filter(r => r.value && !NATIVE_FIELD_IDS.has(r.columnId)), [filters]);
  const hasActiveCustomFilters = customRules.length > 0;
  const hasActiveNativeFilters = nativeRules.length > 0;
  const hasActiveFilters = hasActiveCustomFilters || hasActiveNativeFilters;

  // Separate fixed pre-filters into native vs custom
  const fixedNativePreFilters = fixedPreFilters.filter(pf => pf.is_native);
  const fixedCustomPreFilters = fixedPreFilters.filter(pf => !pf.is_native);
  const hasFixedCustomPreFilters = fixedCustomPreFilters.length > 0;

  // Apply native filters client-side
  const nativeFilteredEntities = useMemo(() => {
    let entities = allBaseEntities;

    // Apply fixed native pre-filters
    for (const pf of fixedNativePreFilters) {
      entities = entities.filter(entity => {
        const storedValue = getField(entity, pf.field_id);
        return matchesPreFilterValue({
          storedValue,
          operator: pf.operator as FilterOperator,
          filterValue: pf.value,
          type: pf.field_type,
        });
      });
    }

    // Apply native DynamicFilter rules
    if (nativeRules.length > 0) {
      entities = applyFilters(
        entities,
        nativeRules,
        filterColumns,
        (entity, columnId) => getField(entity, columnId),
        filterLogic
      );
    }

    return entities;
  }, [allBaseEntities, fixedNativePreFilters, nativeRules, filterColumns, filterLogic]);

  // Build stable list of EO IDs for custom field filtering
  const baseEoIds = useMemo(() => {
    if (isBaseDataLoading) return [];
    return nativeFilteredEntities.map(e => e.id).sort();
  }, [nativeFilteredEntities, isBaseDataLoading]);

  // Server-side filtering for custom fields
  const {
    data: filteredEoIds,
    isLoading: isLoadingFiltered,
    error: filteringError,
  } = useQuery({
    queryKey: queryKeys.organizationalEntities.filteredByFields(customRules, fixedCustomPreFilters, baseEoIds),
    queryFn: async () => {
      if (baseEoIds.length === 0) return [];

      let matchingEoIds: string[] = [...baseEoIds];

      // Apply fixed custom pre-filters
      for (const prefilter of fixedCustomPreFilters) {
        const fieldValues = await fetchEoFieldValuesForEos({
          fieldDefinitionId: prefilter.field_id,
          eoIds: matchingEoIds,
          batchSize: 50,
        });

        const matchingIdSet = new Set(
          (fieldValues || [])
            .filter((fv) =>
              matchesPreFilterValue({
                storedValue: fv.value,
                operator: prefilter.operator as FilterOperator,
                filterValue: prefilter.value,
                type: prefilter.field_type,
              })
            )
            .map((fv) => fv.eo_id)
        );

        matchingEoIds = matchingEoIds.filter((id) => matchingIdSet.has(id));
      }

      // Apply custom DynamicFilter rules
      if (customRules.length > 0) {
        const valuesMap: Record<string, Record<string, string>> = {};
        for (const rule of customRules) {
          const fieldValues = await fetchEoFieldValuesForEos({
            fieldDefinitionId: rule.columnId,
            eoIds: matchingEoIds,
            batchSize: 50,
          });
          for (const fv of fieldValues) {
            if (!valuesMap[fv.eo_id]) valuesMap[fv.eo_id] = {};
            valuesMap[fv.eo_id][rule.columnId] = normalizeJsonbScalar(fv.value);
          }
        }

        const items = matchingEoIds.map(id => ({ id, values: valuesMap[id] || {} }));
        const filtered = applyFilters(
          items,
          customRules,
          filterColumns,
          (item, columnId) => item.values[columnId] ?? '',
          filterLogic
        );
        matchingEoIds = filtered.map(item => item.id);
      }

      return matchingEoIds;
    },
    enabled: (hasFixedCustomPreFilters || hasActiveCustomFilters) && baseEoIds.length > 0 && !isBaseDataLoading,
  });

  // Apply server-side filter results to entities
  const filteredByFilters = useMemo(() => {
    if (!hasActiveCustomFilters && !hasFixedCustomPreFilters) {
      return nativeFilteredEntities;
    }
    if (isLoadingFiltered || filteringError) return nativeFilteredEntities;
    if (!filteredEoIds) return [];
    return nativeFilteredEntities.filter(entity => filteredEoIds.includes(entity.id));
  }, [nativeFilteredEntities, hasActiveCustomFilters, hasFixedCustomPreFilters, filteredEoIds, isLoadingFiltered, filteringError]);

  // Apply client-side search filter
  const searchFilteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return filteredByFilters;
    const lowerQuery = searchQuery.toLowerCase().trim();
    return filteredByFilters.filter(entity =>
      entity.name.toLowerCase().includes(lowerQuery) ||
      (entity.code && entity.code.toLowerCase().includes(lowerQuery))
    );
  }, [filteredByFilters, searchQuery]);

  return {
    // Filtered entities (after all filters + search)
    filteredEntities: searchFilteredEntities,
    // Filter state
    filters,
    setFilters,
    filterLogic,
    setFilterLogic,
    filterColumns,
    hasActiveFilters,
    hasFixedPreFilters,
    // Search state
    searchQuery,
    setSearchQuery,
    searchInputValue,
    setSearchInputValue,
    searchDebounceRef,
    searchEnabled: config.enable_search ?? true,
    // Field definitions (needed by other parts of the component)
    fieldDefinitions,
    // Pre-filter config
    configuredPreFilters,
  };
}
