import type { FieldVisibilityCondition } from './types';

export const OPERATOR_LABELS: Record<FieldVisibilityCondition['operator'], string> = {
  equals: '\u00c9gal \u00e0',
  not_equals: 'Diff\u00e9rent de',
  greater_than: 'Sup\u00e9rieur \u00e0',
  less_than: 'Inf\u00e9rieur \u00e0',
  greater_or_equal: '\u2265',
  less_or_equal: '\u2264',
  contains: 'Contient',
  is_empty: 'Est vide',
  is_not_empty: 'N\'est pas vide',
};

export function getOperatorsForFieldType(fieldType: string): FieldVisibilityCondition['operator'][] {
  if (['number', 'decimal', 'currency', 'calculated'].includes(fieldType)) {
    return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'];
  }
  if (['checkbox'].includes(fieldType)) {
    return ['equals', 'not_equals'];
  }
  return ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'];
}

export function needsValueInput(operator: FieldVisibilityCondition['operator']): boolean {
  return !['is_empty', 'is_not_empty'].includes(operator);
}

export interface FieldDef {
  id: string;
  name: string;
  field_type: string;
  is_required: boolean;
}
