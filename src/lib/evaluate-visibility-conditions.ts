import type { FieldVisibilityCondition } from '@/types/builder-types';

/** Loose condition shape accepted from JSON (operator is string, not union). */
type ConditionLike = {
  source_field_id: string;
  operator: string;
  value?: string | number;
};

/**
 * Evaluates an array of visibility conditions against current field values.
 * Returns true if the field should be visible.
 * Returns true if conditions array is empty/undefined (always visible).
 * @param logic - 'AND' (default): all conditions must be met. 'OR': at least one must be met.
 */
export function evaluateVisibilityConditions(
  conditions: (FieldVisibilityCondition | ConditionLike)[] | undefined | null,
  values: Record<string, unknown>,
  logic: 'AND' | 'OR' = 'AND',
): boolean {
  if (!conditions || conditions.length === 0) return true;

  const evaluate = (condition: FieldVisibilityCondition | ConditionLike) => {
    const fieldValue = values[condition.source_field_id];
    return evaluateSingleCondition(condition, fieldValue);
  };

  return logic === 'OR' ? conditions.some(evaluate) : conditions.every(evaluate);
}

function evaluateSingleCondition(
  condition: FieldVisibilityCondition | ConditionLike,
  fieldValue: unknown,
): boolean {
  const { operator, value: conditionValue } = condition;

  switch (operator) {
    case 'is_empty':
      return fieldValue === null || fieldValue === undefined || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
    case 'equals':
      return String(fieldValue) === String(conditionValue);
    case 'not_equals':
      return String(fieldValue) !== String(conditionValue);
    case 'contains':
      return typeof fieldValue === 'string' && typeof conditionValue === 'string'
        && fieldValue.toLowerCase().includes(conditionValue.toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(conditionValue);
    case 'less_than':
      return Number(fieldValue) < Number(conditionValue);
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(conditionValue);
    case 'less_or_equal':
      return Number(fieldValue) <= Number(conditionValue);
    default:
      return true;
  }
}
