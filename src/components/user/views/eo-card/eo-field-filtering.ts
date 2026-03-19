import { api } from '@/lib/api-client';

export type EoFieldFilterType =
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'number'
  | 'decimal'
  | string;

export function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    out.push(arr.slice(i, i + chunkSize));
  }
  return out;
}

export function normalizeJsonbScalar(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    // Some JSONB strings end up represented as: "Ouvert" (string with quotes)
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      return value.slice(1, -1);
    }
    return value;
  }

  // booleans / numbers
  return String(value);
}

export function matchesFilterValue(params: {
  storedValue: unknown;
  filterValue: string;
  type: EoFieldFilterType;
}): boolean {
  const { storedValue, filterValue, type } = params;

  if (filterValue === '' || filterValue === '__all__') return true;

  if (type === 'select') {
    const s = normalizeJsonbScalar(storedValue).toLowerCase();
    return s === filterValue.toLowerCase();
  }

  if (type === 'multiselect') {
    if (Array.isArray(storedValue)) {
      const needle = filterValue.toLowerCase();
      return storedValue
        .map((v) => normalizeJsonbScalar(v).toLowerCase())
        .includes(needle);
    }
    // Fallback if stored as scalar
    return normalizeJsonbScalar(storedValue).toLowerCase() === filterValue.toLowerCase();
  }

  if (type === 'checkbox') {
    const boolValue = filterValue === 'true';
    const fieldBool =
      storedValue === true ||
      storedValue === 'true' ||
      String(storedValue).toLowerCase() === 'true';
    return fieldBool === boolValue;
  }

  if (type === 'date' || type === 'datetime') {
    return normalizeJsonbScalar(storedValue).includes(filterValue);
  }

  // Default: text search
  return normalizeJsonbScalar(storedValue)
    .toLowerCase()
    .includes(filterValue.toLowerCase());
}

// Pre-filter operator matching (for default filters)
export type PreFilterOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'greater_than' 
  | 'less_than' 
  | 'greater_or_equal' 
  | 'less_or_equal' 
  | 'contains' 
  | 'not_contains'
  | 'is_empty' 
  | 'is_not_empty';

export function matchesPreFilterValue(params: {
  storedValue: unknown;
  operator: PreFilterOperator;
  filterValue: string | number | boolean | undefined;
  type: EoFieldFilterType;
}): boolean {
  const { storedValue, operator, filterValue, type } = params;
  
  const normalizedStored = normalizeJsonbScalar(storedValue);
  const isEmpty = normalizedStored === '' || storedValue === null || storedValue === undefined;

  // Handle is_empty / is_not_empty operators
  if (operator === 'is_empty') return isEmpty;
  if (operator === 'is_not_empty') return !isEmpty;

  const filterValueStr = String(filterValue ?? '').toLowerCase();
  const storedLower = normalizedStored.toLowerCase();

  switch (operator) {
    case 'equals':
      if (type === 'boolean' || type === 'checkbox') {
        const storedBool = storedValue === true || storedValue === 'true' || storedLower === 'true';
        const filterBool = filterValue === true || filterValue === 'true';
        return storedBool === filterBool;
      }
      return storedLower === filterValueStr;
      
    case 'not_equals':
      if (type === 'boolean' || type === 'checkbox') {
        const storedBool = storedValue === true || storedValue === 'true' || storedLower === 'true';
        const filterBool = filterValue === true || filterValue === 'true';
        return storedBool !== filterBool;
      }
      return storedLower !== filterValueStr;
      
    case 'contains':
      return storedLower.includes(filterValueStr);
      
    case 'not_contains':
      return !storedLower.includes(filterValueStr);
      
    case 'greater_than':
      if (type === 'number' || type === 'decimal') {
        return parseFloat(normalizedStored) > parseFloat(String(filterValue));
      }
      return normalizedStored > String(filterValue);
      
    case 'less_than':
      if (type === 'number' || type === 'decimal') {
        return parseFloat(normalizedStored) < parseFloat(String(filterValue));
      }
      return normalizedStored < String(filterValue);
      
    case 'greater_or_equal':
      if (type === 'number' || type === 'decimal') {
        return parseFloat(normalizedStored) >= parseFloat(String(filterValue));
      }
      return normalizedStored >= String(filterValue);
      
    case 'less_or_equal':
      if (type === 'number' || type === 'decimal') {
        return parseFloat(normalizedStored) <= parseFloat(String(filterValue));
      }
      return normalizedStored <= String(filterValue);
      
    default:
      return true;
  }
}

export async function fetchEoFieldValuesForEos(params: {
  fieldDefinitionId: string;
  eoIds: string[];
  batchSize?: number;
}): Promise<Array<{ eo_id: string; value: unknown }>> {
  const { fieldDefinitionId, eoIds, batchSize = 50 } = params;

  if (eoIds.length === 0) return [];

  const batches = chunkArray(eoIds, batchSize);
  const out: Array<{ eo_id: string; value: unknown }> = [];

  for (const batch of batches) {
    const data = await api.post<Array<{ eo_id: string; value: unknown }>>('/api/organizational-entities/field-values', {
      field_definition_id: fieldDefinitionId,
      eo_ids: batch,
    });
    if (data?.length) out.push(...data);
  }

  return out;
}
