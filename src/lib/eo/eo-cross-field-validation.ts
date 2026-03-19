import { parse, parseISO, isValid } from 'date-fns';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

/** Parse a date string that could be ISO (yyyy-MM-dd), dd/MM/yyyy, or a full ISO timestamp */
function parseDateSafe(str: string): Date | undefined {
  if (!str) return undefined;
  const iso = parseISO(str);
  if (isValid(iso)) return iso;
  const ddmm = parse(str, 'dd/MM/yyyy', new Date());
  if (isValid(ddmm)) return ddmm;
  const fallback = new Date(str);
  return isValid(fallback) ? fallback : undefined;
}

/**
 * Cross-field validation rule types stored in validation_rules.cross_field_rules
 */
export interface CrossFieldRule {
  type: 'date_before' | 'date_after' | 'number_less_than' | 'number_greater_than' | 'required_if_filled';
  /** The ID of the other field to compare against */
  target_field_id: string;
  /** Custom error message (optional) */
  message?: string;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  date_before: 'Doit être avant',
  date_after: 'Doit être après',
  number_less_than: 'Doit être inférieur à',
  number_greater_than: 'Doit être supérieur à',
  required_if_filled: 'Obligatoire si rempli',
};

/** Human-readable label for a rule type */
export function getRuleTypeLabel(type: string): string {
  return RULE_TYPE_LABELS[type] || type;
}

/** Get compatible rule types for a given field type */
export function getCompatibleRuleTypes(fieldType: string): { value: string; label: string }[] {
  const rules: { value: string; label: string }[] = [];

  if (['date', 'datetime'].includes(fieldType)) {
    rules.push({ value: 'date_before', label: 'Doit être avant' });
    rules.push({ value: 'date_after', label: 'Doit être après' });
  }

  if (['number', 'decimal'].includes(fieldType)) {
    rules.push({ value: 'number_less_than', label: 'Doit être inférieur à' });
    rules.push({ value: 'number_greater_than', label: 'Doit être supérieur à' });
  }

  // All types support "required if other filled"
  rules.push({ value: 'required_if_filled', label: 'Obligatoire si rempli' });

  return rules;
}

/** Minimal shape required for cross-field target lookup */
interface FieldLike {
  id: string;
  is_active: boolean;
  field_type: string;
}

/** Get compatible target fields for a given rule type */
export function getCompatibleTargetFields<T extends FieldLike>(
  ruleType: string,
  currentFieldId: string,
  allFields: T[],
): T[] {
  return allFields.filter((f) => {
    if (f.id === currentFieldId) return false;
    if (!f.is_active) return false;

    switch (ruleType) {
      case 'date_before':
      case 'date_after':
        return ['date', 'datetime'].includes(f.field_type);
      case 'number_less_than':
      case 'number_greater_than':
        return ['number', 'decimal'].includes(f.field_type);
      case 'required_if_filled':
        return true; // Any field
      default:
        return false;
    }
  });
}

/** Extract cross-field rules from a field definition */
export function getCrossFieldRules(field: EoFieldDefinition): CrossFieldRule[] {
  const rules = field.validation_rules?.cross_field_rules;
  return Array.isArray(rules) ? (rules as CrossFieldRule[]) : [];
}

/** Default error message for a rule */
function defaultMessage(rule: CrossFieldRule, targetFieldName: string): string {
  switch (rule.type) {
    case 'date_before':
      return `Doit être antérieure à "${targetFieldName}"`;
    case 'date_after':
      return `Doit être postérieure à "${targetFieldName}"`;
    case 'number_less_than':
      return `Doit être inférieur à "${targetFieldName}"`;
    case 'number_greater_than':
      return `Doit être supérieur à "${targetFieldName}"`;
    case 'required_if_filled':
      return `Obligatoire car "${targetFieldName}" est rempli`;
    default:
      return 'Validation échouée';
  }
}

/**
 * Validate a field value against its cross-field rules.
 *
 * @returns null if valid, or an error message string if invalid.
 */
export function validateCrossFieldRules(
  field: EoFieldDefinition,
  newValue: unknown,
  allFieldValues: Record<string, unknown>,
  allFieldDefinitions: EoFieldDefinition[],
): string | null {
  const rules = getCrossFieldRules(field);
  if (rules.length === 0) return null;

  for (const rule of rules) {
    const targetField = allFieldDefinitions.find((f) => f.id === rule.target_field_id);
    if (!targetField) continue;

    const targetValue = allFieldValues[rule.target_field_id];
    const targetName = targetField.name;
    const errorMsg = rule.message || defaultMessage(rule, targetName);

    switch (rule.type) {
      case 'date_before': {
        if (!newValue || !targetValue) continue; // Skip if either is empty
        const d1 = parseDateSafe(String(newValue));
        const d2 = parseDateSafe(String(targetValue));
        if (d1 && d2 && d1 >= d2) {
          return errorMsg;
        }
        break;
      }
      case 'date_after': {
        if (!newValue || !targetValue) continue;
        const d1 = parseDateSafe(String(newValue));
        const d2 = parseDateSafe(String(targetValue));
        if (d1 && d2 && d1 <= d2) {
          return errorMsg;
        }
        break;
      }
      case 'number_less_than': {
        if (newValue == null || newValue === '' || targetValue == null || targetValue === '') continue;
        const n1 = Number(newValue);
        const n2 = Number(targetValue);
        if (!isNaN(n1) && !isNaN(n2) && n1 >= n2) {
          return errorMsg;
        }
        break;
      }
      case 'number_greater_than': {
        if (newValue == null || newValue === '' || targetValue == null || targetValue === '') continue;
        const n1 = Number(newValue);
        const n2 = Number(targetValue);
        if (!isNaN(n1) && !isNaN(n2) && n1 <= n2) {
          return errorMsg;
        }
        break;
      }
      case 'required_if_filled': {
        const targetFilled = targetValue != null && String(targetValue).trim() !== '';
        const newEmpty = newValue == null || String(newValue).trim() === '';
        if (targetFilled && newEmpty) {
          return errorMsg;
        }
        break;
      }
    }
  }

  return null;
}
