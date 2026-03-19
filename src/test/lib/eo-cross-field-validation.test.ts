import { describe, it, expect } from 'vitest';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import {
  getRuleTypeLabel,
  getCompatibleRuleTypes,
  getCompatibleTargetFields,
  getCrossFieldRules,
  validateCrossFieldRules,
} from '@/lib/eo/eo-cross-field-validation';

const makeField = (overrides: Partial<EoFieldDefinition> & { id: string; name: string }) =>
  ({
    field_type: 'text',
    is_active: true,
    validation_rules: null,
    ...overrides,
  }) as unknown as EoFieldDefinition;

describe('getRuleTypeLabel', () => {
  it('returns French label for known types', () => {
    expect(getRuleTypeLabel('date_before')).toBe('Doit être avant');
    expect(getRuleTypeLabel('date_after')).toBe('Doit être après');
    expect(getRuleTypeLabel('number_less_than')).toBe('Doit être inférieur à');
    expect(getRuleTypeLabel('number_greater_than')).toBe('Doit être supérieur à');
    expect(getRuleTypeLabel('required_if_filled')).toBe('Obligatoire si rempli');
  });

  it('returns the type itself when unknown', () => {
    expect(getRuleTypeLabel('unknown_rule')).toBe('unknown_rule');
  });
});

describe('getCompatibleRuleTypes', () => {
  it('returns date rules + required_if_filled for date fields', () => {
    const rules = getCompatibleRuleTypes('date');
    const values = rules.map((r) => r.value);
    expect(values).toContain('date_before');
    expect(values).toContain('date_after');
    expect(values).toContain('required_if_filled');
    expect(values).not.toContain('number_less_than');
  });

  it('returns number rules + required_if_filled for number fields', () => {
    const rules = getCompatibleRuleTypes('number');
    const values = rules.map((r) => r.value);
    expect(values).toContain('number_less_than');
    expect(values).toContain('number_greater_than');
    expect(values).toContain('required_if_filled');
    expect(values).not.toContain('date_before');
  });

  it('returns only required_if_filled for other field types', () => {
    const rules = getCompatibleRuleTypes('text');
    expect(rules).toHaveLength(1);
    expect(rules[0].value).toBe('required_if_filled');
  });
});

describe('getCompatibleTargetFields', () => {
  const fields = [
    makeField({ id: 'f1', name: 'Start Date', field_type: 'date' }),
    makeField({ id: 'f2', name: 'End Date', field_type: 'date' }),
    makeField({ id: 'f3', name: 'Amount', field_type: 'number' }),
    makeField({ id: 'f4', name: 'Inactive', field_type: 'date', is_active: false }),
    makeField({ id: 'f5', name: 'Label', field_type: 'text' }),
  ];

  it('filters out the current field', () => {
    const result = getCompatibleTargetFields('date_before', 'f1', fields);
    expect(result.every((f) => f.id !== 'f1')).toBe(true);
  });

  it('filters out inactive fields', () => {
    const result = getCompatibleTargetFields('date_before', 'f1', fields);
    expect(result.every((f) => f.id !== 'f4')).toBe(true);
  });

  it('date rules return only date fields', () => {
    const result = getCompatibleTargetFields('date_after', 'f1', fields);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('f2');
  });

  it('number rules return only number fields', () => {
    const result = getCompatibleTargetFields('number_less_than', 'f3', fields);
    expect(result).toHaveLength(0); // f3 is self, no other number field
  });

  it('required_if_filled returns all active fields except self', () => {
    const result = getCompatibleTargetFields('required_if_filled', 'f1', fields);
    expect(result).toHaveLength(3); // f2, f3, f5 (not f1 self, not f4 inactive)
  });
});

describe('getCrossFieldRules', () => {
  it('returns cross_field_rules array when present', () => {
    const field = makeField({
      id: 'f1',
      name: 'Start',
      validation_rules: {
        cross_field_rules: [{ type: 'date_before', target_field_id: 'f2' }],
      },
    });
    expect(getCrossFieldRules(field)).toEqual([{ type: 'date_before', target_field_id: 'f2' }]);
  });

  it('returns empty array when validation_rules is null', () => {
    const field = makeField({ id: 'f1', name: 'X', validation_rules: null });
    expect(getCrossFieldRules(field)).toEqual([]);
  });

  it('returns empty array when cross_field_rules is missing', () => {
    const field = makeField({ id: 'f1', name: 'X', validation_rules: {} });
    expect(getCrossFieldRules(field)).toEqual([]);
  });

  it('returns empty array when cross_field_rules is not an array', () => {
    const field = makeField({
      id: 'f1',
      name: 'X',
      validation_rules: { cross_field_rules: 'bad' as any },
    });
    expect(getCrossFieldRules(field)).toEqual([]);
  });
});

describe('validateCrossFieldRules', () => {
  const targetDateField = makeField({ id: 'f2', name: 'End Date', field_type: 'date' });
  const targetNumberField = makeField({ id: 'f3', name: 'Max Amount', field_type: 'number' });
  const targetTextField = makeField({ id: 'f4', name: 'Note', field_type: 'text' });
  const allDefs = [targetDateField, targetNumberField, targetTextField];

  describe('date_before', () => {
    const field = makeField({
      id: 'f1',
      name: 'Start Date',
      field_type: 'date',
      validation_rules: {
        cross_field_rules: [{ type: 'date_before', target_field_id: 'f2' }],
      },
    });

    it('returns error when date >= target date', () => {
      const result = validateCrossFieldRules(field, '2024-06-15', { f2: '2024-06-10' }, allDefs);
      expect(result).toBeTypeOf('string');
      expect(result).not.toBeNull();
    });

    it('returns error when dates are equal', () => {
      const result = validateCrossFieldRules(field, '2024-06-10', { f2: '2024-06-10' }, allDefs);
      expect(result).not.toBeNull();
    });

    it('returns null when date < target date', () => {
      const result = validateCrossFieldRules(field, '2024-06-01', { f2: '2024-06-10' }, allDefs);
      expect(result).toBeNull();
    });

    it('skips validation when field value is empty', () => {
      expect(validateCrossFieldRules(field, '', { f2: '2024-06-10' }, allDefs)).toBeNull();
      expect(validateCrossFieldRules(field, null, { f2: '2024-06-10' }, allDefs)).toBeNull();
    });

    it('skips validation when target value is empty', () => {
      expect(validateCrossFieldRules(field, '2024-06-10', { f2: '' }, allDefs)).toBeNull();
      expect(validateCrossFieldRules(field, '2024-06-10', { f2: null }, allDefs)).toBeNull();
    });
  });

  describe('date_after', () => {
    const field = makeField({
      id: 'f1',
      name: 'End Date',
      field_type: 'date',
      validation_rules: {
        cross_field_rules: [{ type: 'date_after', target_field_id: 'f2' }],
      },
    });

    it('returns error when date <= target date', () => {
      const result = validateCrossFieldRules(field, '2024-06-01', { f2: '2024-06-10' }, allDefs);
      expect(result).not.toBeNull();
    });

    it('returns null when date > target date', () => {
      const result = validateCrossFieldRules(field, '2024-06-15', { f2: '2024-06-10' }, allDefs);
      expect(result).toBeNull();
    });
  });

  describe('number_less_than', () => {
    const field = makeField({
      id: 'f1',
      name: 'Min',
      field_type: 'number',
      validation_rules: {
        cross_field_rules: [{ type: 'number_less_than', target_field_id: 'f3' }],
      },
    });

    it('returns error when number >= target number', () => {
      expect(validateCrossFieldRules(field, 100, { f3: 50 }, allDefs)).not.toBeNull();
      expect(validateCrossFieldRules(field, 50, { f3: 50 }, allDefs)).not.toBeNull();
    });

    it('returns null when number < target number', () => {
      expect(validateCrossFieldRules(field, 10, { f3: 50 }, allDefs)).toBeNull();
    });

    it('skips when either value is empty', () => {
      expect(validateCrossFieldRules(field, '', { f3: 50 }, allDefs)).toBeNull();
      expect(validateCrossFieldRules(field, 10, { f3: '' }, allDefs)).toBeNull();
    });
  });

  describe('number_greater_than', () => {
    const field = makeField({
      id: 'f1',
      name: 'Max',
      field_type: 'number',
      validation_rules: {
        cross_field_rules: [{ type: 'number_greater_than', target_field_id: 'f3' }],
      },
    });

    it('returns error when number <= target number', () => {
      expect(validateCrossFieldRules(field, 10, { f3: 50 }, allDefs)).not.toBeNull();
      expect(validateCrossFieldRules(field, 50, { f3: 50 }, allDefs)).not.toBeNull();
    });

    it('returns null when number > target number', () => {
      expect(validateCrossFieldRules(field, 100, { f3: 50 }, allDefs)).toBeNull();
    });
  });

  describe('required_if_filled', () => {
    const field = makeField({
      id: 'f1',
      name: 'Comment',
      field_type: 'text',
      validation_rules: {
        cross_field_rules: [{ type: 'required_if_filled', target_field_id: 'f4' }],
      },
    });

    it('returns error when target has value but field is empty', () => {
      expect(validateCrossFieldRules(field, '', { f4: 'filled' }, allDefs)).not.toBeNull();
      expect(validateCrossFieldRules(field, null, { f4: 'filled' }, allDefs)).not.toBeNull();
    });

    it('returns null when both are filled', () => {
      expect(validateCrossFieldRules(field, 'value', { f4: 'filled' }, allDefs)).toBeNull();
    });

    it('returns null when target is empty', () => {
      expect(validateCrossFieldRules(field, '', { f4: '' }, allDefs)).toBeNull();
      expect(validateCrossFieldRules(field, '', { f4: null }, allDefs)).toBeNull();
    });
  });

  describe('no rules', () => {
    it('returns null when field has no cross-field rules', () => {
      const field = makeField({ id: 'f1', name: 'Plain', validation_rules: null });
      expect(validateCrossFieldRules(field, 'anything', {}, allDefs)).toBeNull();
    });
  });
});
