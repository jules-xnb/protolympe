import type { FilterColumn, FilterRule, FilterLogic } from './DynamicFilters';

/** Apply filter rules to a dataset */
export function applyFilters<T>(
  data: T[],
  filters: FilterRule[],
  columns: FilterColumn[],
  getValueFn: (item: T, columnId: string) => unknown,
  logic: FilterLogic = 'and'
): T[] {
  const activeFilters = filters.filter(f => f.value !== '');
  if (activeFilters.length === 0) return data;

  const matchesFilter = (item: T, filter: FilterRule): boolean => {
    const col = columns.find(c => c.id === filter.columnId);
    const raw = getValueFn(item, filter.columnId);
    const value = raw === null || raw === undefined ? '' : String(raw);
    const filterVal = filter.value;

    switch (filter.operator) {
      case 'contains':
        return value.toLowerCase().includes(filterVal.toLowerCase());
      case 'equals':
        if (col?.type === 'number') return Number(value) === Number(filterVal);
        if (col?.type === 'boolean') return value === filterVal;
        if (col?.type === 'date') return value.substring(0, 10) === filterVal;
        return value.toLowerCase() === filterVal.toLowerCase();
      case 'not_equals':
        if (col?.type === 'date') return value.substring(0, 10) !== filterVal;
        if (col?.type === 'number') return Number(value) !== Number(filterVal);
        return value.toLowerCase() !== filterVal.toLowerCase();
      case 'starts_with':
        return value.toLowerCase().startsWith(filterVal.toLowerCase());
      case 'gt':
        if (col?.type === 'date') return value.substring(0, 10) > filterVal;
        return Number(value) > Number(filterVal);
      case 'lt':
        if (col?.type === 'date') return value.substring(0, 10) < filterVal;
        return Number(value) < Number(filterVal);
      case 'gte':
        if (col?.type === 'date') return value.substring(0, 10) >= filterVal;
        return Number(value) >= Number(filterVal);
      case 'lte':
        if (col?.type === 'date') return value.substring(0, 10) <= filterVal;
        return Number(value) <= Number(filterVal);
      default:
        return true;
    }
  };

  return data.filter(item => {
    if (logic === 'and') {
      return activeFilters.every(filter => matchesFilter(item, filter));
    } else {
      return activeFilters.some(filter => matchesFilter(item, filter));
    }
  });
}
