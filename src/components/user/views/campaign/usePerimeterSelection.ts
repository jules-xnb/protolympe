import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { applyFilters } from '@/components/admin/dynamic-filters-utils';
import type { FilterColumn, FilterRule, FilterLogic } from '@/components/admin/DynamicFilters';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { useAllReferentialValues } from '@/hooks/useReferentialValues';
import { fetchEoFieldValuesForEos, normalizeJsonbScalar } from '@/components/user/views/eo-card/eo-field-filtering';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { useEoGroups } from '@/hooks/useEoGroups';
import { useEoGroupMembers } from '@/hooks/useEoGroupMembers';
import type { EoTarget } from './CampaignPerimeterStep';
import { queryKeys } from '@/lib/query-keys';

export function usePerimeterSelection(clientId?: string) {
  const [targets, setTargets] = useState<EoTarget[]>([]);
  const [expandedEos, setExpandedEos] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [filterLogic, setFilterLogic] = useState<FilterLogic>('and');

  const { data: allEos = [] } = useOrganizationalEntities(clientId);
  const { data: eoGroups = [] } = useEoGroups(clientId);
  const { data: groupMembers = [] } = useEoGroupMembers(selectedGroupId ?? undefined);

  // Pre-select EOs when group is selected
  useEffect(() => {
    if (selectedGroupId && groupMembers.length > 0) {
      setTargets(groupMembers.map(m => ({
        eo_id: m.eo_id,
        include_descendants: m.include_descendants,
      })));
    }
  }, [selectedGroupId, groupMembers]);

  // -- Dynamic filters: field definitions + referential values --
  const { data: eoFieldDefs = [] } = useEoFieldDefinitions(clientId);
  const activeEoFieldDefs = useMemo(() => eoFieldDefs.filter(f => f.is_active), [eoFieldDefs]);

  const fieldsWithRef = useMemo(
    () => activeEoFieldDefs
      .filter(f => ['select', 'multiselect'].includes(f.field_type))
      .map(f => ({ referential_id: f.settings?.referential_id as string | null })),
    [activeEoFieldDefs],
  );
  const { data: refValuesMap } = useAllReferentialValues(fieldsWithRef);

  const NATIVE_FIELD_IDS = useMemo(() => new Set(['name', 'code']), []);

  const getFieldOptions = useCallback((fieldId: string) => {
    const fd = activeEoFieldDefs.find(f => f.id === fieldId);
    if (!fd) return [];
    const refId = fd.settings?.referential_id as string | undefined;
    if (refId && refValuesMap) {
      const vals = refValuesMap.get(refId);
      if (vals) return vals.map(v => ({ value: v.label, label: v.label }));
    }
    if (!fd.options) return [];
    return (fd.options as Array<string | { value?: string; label?: string }>).map(o =>
      typeof o === 'string' ? { value: o, label: o } : { value: o.value || '', label: o.label || o.value || '' }
    );
  }, [activeEoFieldDefs, refValuesMap]);

  const filterColumns: FilterColumn[] = useMemo(() => {
    const native: FilterColumn[] = [
      { id: 'name', label: 'Nom', type: 'text' },
      { id: 'code', label: 'Code', type: 'text' },
    ];
    const custom: FilterColumn[] = activeEoFieldDefs.map(fd => {
      let type: FilterColumn['type'] = 'text';
      if (['number', 'decimal'].includes(fd.field_type)) type = 'number';
      else if (fd.field_type === 'checkbox') type = 'boolean';
      else if (['select', 'multiselect'].includes(fd.field_type)) type = 'select';
      else if (['date', 'datetime'].includes(fd.field_type)) type = 'date';
      return { id: fd.id, label: fd.name, type, options: type === 'select' ? getFieldOptions(fd.id) : undefined };
    });
    return [...native, ...custom];
  }, [activeEoFieldDefs, getFieldOptions]);

  // Split filter rules: native (client-side) vs custom (server-side)
  const nativeRules = useMemo(() => filters.filter(r => r.value && NATIVE_FIELD_IDS.has(r.columnId)), [filters, NATIVE_FIELD_IDS]);
  const customRules = useMemo(() => filters.filter(r => r.value && !NATIVE_FIELD_IDS.has(r.columnId)), [filters, NATIVE_FIELD_IDS]);

  // Native filtering (client-side on name/code)
  const nativeFilteredEos = useMemo(() => {
    if (nativeRules.length === 0) return allEos;
    return applyFilters(allEos, nativeRules, filterColumns, (eo, colId) => (eo as Record<string, unknown>)[colId], filterLogic);
  }, [allEos, nativeRules, filterColumns, filterLogic]);

  // Custom filtering (server-side via React Query)
  const baseEoIds = useMemo(() => nativeFilteredEos.map(e => e.id), [nativeFilteredEos]);

  const { data: customFilteredEoIds, isLoading: isLoadingCustomFilter } = useQuery({
    queryKey: queryKeys.campaignEoFilter.filter(customRules, baseEoIds),
    queryFn: async () => {
      const matchingEoIds = [...baseEoIds];
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
        filterLogic,
      );
      return filtered.map(item => item.id);
    },
    enabled: customRules.length > 0 && baseEoIds.length > 0,
  });

  // Combine native + custom filter results
  const filteredEos = useMemo(() => {
    if (customRules.length === 0) return nativeFilteredEos;
    if (isLoadingCustomFilter || !customFilteredEoIds) return nativeFilteredEos;
    const idSet = new Set(customFilteredEoIds);
    return nativeFilteredEos.filter(eo => idSet.has(eo.id));
  }, [nativeFilteredEos, customRules, customFilteredEoIds, isLoadingCustomFilter]);

  const hasActiveFilters = filters.some(f => f.value !== '');

  // Build EO tree
  const eoTree = useMemo(() => {
    const rootEos = allEos.filter(eo => !eo.parent_id);
    const childrenMap = new Map<string, typeof allEos>();

    allEos.forEach(eo => {
      if (eo.parent_id) {
        const children = childrenMap.get(eo.parent_id) || [];
        children.push(eo);
        childrenMap.set(eo.parent_id, children);
      }
    });

    return { roots: rootEos, childrenMap };
  }, [allEos]);

  // Filtered EO tree based on dynamic filters + search query
  const filteredEoTree = useMemo(() => {
    const baseEosLocal = filteredEos;
    const baseIdSet = new Set(baseEosLocal.map(e => e.id));

    if (!searchQuery && !hasActiveFilters) return eoTree;

    let candidateIds: Set<string>;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      candidateIds = new Set<string>();
      baseEosLocal.forEach(eo => {
        if (eo.name.toLowerCase().includes(query) || eo.code?.toLowerCase().includes(query)) {
          candidateIds.add(eo.id);
        }
      });
    } else {
      candidateIds = baseIdSet;
    }

    // Add ancestors so the tree stays connected
    const matchingIds = new Set(candidateIds);
    candidateIds.forEach(id => {
      const eo = allEos.find(e => e.id === id);
      let parentId = eo?.parent_id;
      while (parentId) {
        matchingIds.add(parentId);
        const parent = allEos.find(e => e.id === parentId);
        parentId = parent?.parent_id ?? null;
      }
    });

    const filtered = allEos.filter(eo => matchingIds.has(eo.id));
    const roots = filtered.filter(eo => !eo.parent_id || !matchingIds.has(eo.parent_id));
    const childrenMap = new Map<string, typeof filtered>();
    filtered.forEach(eo => {
      if (eo.parent_id && matchingIds.has(eo.parent_id)) {
        const children = childrenMap.get(eo.parent_id) || [];
        children.push(eo);
        childrenMap.set(eo.parent_id, children);
      }
    });
    return { roots, childrenMap };
  }, [allEos, filteredEos, searchQuery, hasActiveFilters, eoTree]);

  // Auto-expand tree when filters are active
  useEffect(() => {
    if (hasActiveFilters || searchQuery) {
      const allIds = new Set<string>();
      filteredEoTree.roots.forEach(function collectIds(eo: { id: string }) {
        const children = filteredEoTree.childrenMap.get(eo.id) || [];
        if (children.length > 0) {
          allIds.add(eo.id);
          children.forEach(collectIds);
        }
      });
      setExpandedEos(allIds);
    }
  }, [filteredEoTree, hasActiveFilters, searchQuery]);

  // Count descendants for an EO
  const countDescendants = useCallback((eoId: string): number => {
    const children = eoTree.childrenMap.get(eoId) || [];
    let count = children.length;
    children.forEach(child => {
      count += countDescendants(child.id);
    });
    return count;
  }, [eoTree]);

  // Calculate total targeted EOs
  const totalTargetedEos = useMemo(() => {
    let total = 0;
    targets.forEach(target => {
      total += 1;
      if (target.include_descendants) {
        total += countDescendants(target.eo_id);
      }
    });
    return total;
  }, [targets, countDescendants]);

  // Collect all descendant IDs recursively
  const getAllDescendantIds = useCallback((eoId: string): string[] => {
    const children = eoTree.childrenMap.get(eoId) || [];
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...getAllDescendantIds(child.id));
    }
    return ids;
  }, [eoTree]);

  const handleToggleEo = useCallback((eoId: string, checked: boolean) => {
    const children = eoTree.childrenMap.get(eoId) || [];
    const hasChildren = children.length > 0;

    if (checked) {
      if (hasChildren) {
        const descendantIds = getAllDescendantIds(eoId);
        const allIds = [eoId, ...descendantIds];
        setTargets(prev => {
          const existing = new Set(prev.map(t => t.eo_id));
          const newTargets = allIds
            .filter(id => !existing.has(id))
            .map(id => ({ eo_id: id, include_descendants: false }));
          return [...prev, ...newTargets];
        });
      } else {
        setTargets(prev => [...prev, { eo_id: eoId, include_descendants: false }]);
      }
    } else {
      if (hasChildren) {
        const descendantIds = new Set(getAllDescendantIds(eoId));
        descendantIds.add(eoId);
        setTargets(prev => prev.filter(t => !descendantIds.has(t.eo_id)));
      } else {
        setTargets(prev => prev.filter(t => t.eo_id !== eoId));
      }
    }
  }, [eoTree, getAllDescendantIds]);

  const handleToggleDescendants = useCallback((eoId: string, checked: boolean) => {
    setTargets(prev => prev.map(t =>
      t.eo_id === eoId ? { ...t, include_descendants: checked } : t
    ));
  }, []);

  const isEoSelected = useCallback((eoId: string) => targets.some(t => t.eo_id === eoId), [targets]);
  const includesDescendants = useCallback((eoId: string) => targets.find(t => t.eo_id === eoId)?.include_descendants ?? false, [targets]);

  const toggleExpand = useCallback((eoId: string) => {
    setExpandedEos(prev => {
      const next = new Set(prev);
      if (next.has(eoId)) {
        next.delete(eoId);
      } else {
        next.add(eoId);
      }
      return next;
    });
  }, []);

  const handleExportMissing = useCallback((missingRolesMap: Map<string, string[]>) => {
    const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = [['Filiale', 'Code', 'Rôle manquant']];
    targets.forEach(t => {
      const missing = missingRolesMap.get(t.eo_id);
      if (missing && missing.length > 0) {
        const eo = allEos.find(e => e.id === t.eo_id);
        rows.push([escapeCSV(eo?.name || ''), escapeCSV(eo?.code || ''), escapeCSV(missing.join(', '))]);
      }
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roles_manquants.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [targets, allEos]);

  const resetPerimeter = useCallback(() => {
    setTargets([]);
    setExpandedEos(new Set());
    setSearchQuery('');
    setSelectedGroupId(null);
    setFilters([]);
    setFilterLogic('and');
  }, []);

  return {
    // State
    targets,
    setTargets,
    expandedEos,
    searchQuery,
    setSearchQuery,
    selectedGroupId,
    setSelectedGroupId,
    filters,
    setFilters,
    filterLogic,
    setFilterLogic,
    // Derived
    allEos,
    eoGroups,
    eoTree,
    filteredEoTree,
    filterColumns,
    totalTargetedEos,
    hasActiveFilters,
    // Handlers
    handleToggleEo,
    handleToggleDescendants,
    isEoSelected,
    includesDescendants,
    toggleExpand,
    handleExportMissing,
    getAllDescendantIds,
    resetPerimeter,
  };
}
