import { describe, it, expect } from 'vitest';
import { evaluateVisibilityConditions } from '@/lib/evaluate-visibility-conditions';

describe('evaluateVisibilityConditions', () => {
  describe('empty / missing conditions', () => {
    it('returns true for undefined conditions', () => {
      expect(evaluateVisibilityConditions(undefined, {})).toBe(true);
    });

    it('returns true for null conditions', () => {
      expect(evaluateVisibilityConditions(null, {})).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(evaluateVisibilityConditions([], {})).toBe(true);
    });
  });

  describe('is_empty operator', () => {
    const cond = [{ source_field_id: 'f1', operator: 'is_empty' }];

    it('returns true when field is null', () => {
      expect(evaluateVisibilityConditions(cond, { f1: null })).toBe(true);
    });

    it('returns true when field is undefined', () => {
      expect(evaluateVisibilityConditions(cond, {})).toBe(true);
    });

    it('returns true when field is empty string', () => {
      expect(evaluateVisibilityConditions(cond, { f1: '' })).toBe(true);
    });

    it('returns false when field has a value', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'hello' })).toBe(false);
    });
  });

  describe('is_not_empty operator', () => {
    const cond = [{ source_field_id: 'f1', operator: 'is_not_empty' }];

    it('returns false when field is null', () => {
      expect(evaluateVisibilityConditions(cond, { f1: null })).toBe(false);
    });

    it('returns false when field is undefined', () => {
      expect(evaluateVisibilityConditions(cond, {})).toBe(false);
    });

    it('returns false when field is empty string', () => {
      expect(evaluateVisibilityConditions(cond, { f1: '' })).toBe(false);
    });

    it('returns true when field has a value', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'hello' })).toBe(true);
    });
  });

  describe('equals operator', () => {
    const cond = [{ source_field_id: 'f1', operator: 'equals', value: 'yes' }];

    it('returns true when values match', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'yes' })).toBe(true);
    });

    it('returns false when values differ', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'no' })).toBe(false);
    });

    it('coerces both sides via String()', () => {
      const numCond = [{ source_field_id: 'f1', operator: 'equals', value: 42 }];
      expect(evaluateVisibilityConditions(numCond, { f1: '42' })).toBe(true);
    });
  });

  describe('not_equals operator', () => {
    const cond = [{ source_field_id: 'f1', operator: 'not_equals', value: 'yes' }];

    it('returns false when values match', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'yes' })).toBe(false);
    });

    it('returns true when values differ', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'no' })).toBe(true);
    });
  });

  describe('contains operator', () => {
    const cond = [{ source_field_id: 'f1', operator: 'contains', value: 'hello' }];

    it('returns true for case-insensitive substring match', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'say HELLO world' })).toBe(true);
    });

    it('returns false when substring is absent', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 'goodbye' })).toBe(false);
    });

    it('returns false when field value is not a string', () => {
      expect(evaluateVisibilityConditions(cond, { f1: 12345 })).toBe(false);
    });
  });

  describe('numeric comparison operators', () => {
    it('greater_than: true when field > condition value', () => {
      const cond = [{ source_field_id: 'f1', operator: 'greater_than', value: 10 }];
      expect(evaluateVisibilityConditions(cond, { f1: 11 })).toBe(true);
      expect(evaluateVisibilityConditions(cond, { f1: 10 })).toBe(false);
      expect(evaluateVisibilityConditions(cond, { f1: 9 })).toBe(false);
    });

    it('less_than: true when field < condition value', () => {
      const cond = [{ source_field_id: 'f1', operator: 'less_than', value: 10 }];
      expect(evaluateVisibilityConditions(cond, { f1: 9 })).toBe(true);
      expect(evaluateVisibilityConditions(cond, { f1: 10 })).toBe(false);
      expect(evaluateVisibilityConditions(cond, { f1: 11 })).toBe(false);
    });

    it('greater_or_equal: true when field >= condition value', () => {
      const cond = [{ source_field_id: 'f1', operator: 'greater_or_equal', value: 10 }];
      expect(evaluateVisibilityConditions(cond, { f1: 10 })).toBe(true);
      expect(evaluateVisibilityConditions(cond, { f1: 11 })).toBe(true);
      expect(evaluateVisibilityConditions(cond, { f1: 9 })).toBe(false);
    });

    it('less_or_equal: true when field <= condition value', () => {
      const cond = [{ source_field_id: 'f1', operator: 'less_or_equal', value: 10 }];
      expect(evaluateVisibilityConditions(cond, { f1: 10 })).toBe(true);
      expect(evaluateVisibilityConditions(cond, { f1: 9 })).toBe(true);
      expect(evaluateVisibilityConditions(cond, { f1: 11 })).toBe(false);
    });
  });

  describe('unknown operator', () => {
    it('defaults to true', () => {
      const cond = [{ source_field_id: 'f1', operator: 'banana', value: '1' }];
      expect(evaluateVisibilityConditions(cond, { f1: 'anything' })).toBe(true);
    });
  });

  describe('AND logic (default)', () => {
    it('returns true only when all conditions pass', () => {
      const conds = [
        { source_field_id: 'f1', operator: 'equals', value: 'a' },
        { source_field_id: 'f2', operator: 'equals', value: 'b' },
      ];
      expect(evaluateVisibilityConditions(conds, { f1: 'a', f2: 'b' })).toBe(true);
      expect(evaluateVisibilityConditions(conds, { f1: 'a', f2: 'x' })).toBe(false);
    });
  });

  describe('OR logic', () => {
    it('returns true when at least one condition passes', () => {
      const conds = [
        { source_field_id: 'f1', operator: 'equals', value: 'a' },
        { source_field_id: 'f2', operator: 'equals', value: 'b' },
      ];
      expect(evaluateVisibilityConditions(conds, { f1: 'a', f2: 'x' }, 'OR')).toBe(true);
      expect(evaluateVisibilityConditions(conds, { f1: 'x', f2: 'b' }, 'OR')).toBe(true);
    });

    it('returns false when no conditions pass', () => {
      const conds = [
        { source_field_id: 'f1', operator: 'equals', value: 'a' },
        { source_field_id: 'f2', operator: 'equals', value: 'b' },
      ];
      expect(evaluateVisibilityConditions(conds, { f1: 'x', f2: 'y' }, 'OR')).toBe(false);
    });
  });
});
