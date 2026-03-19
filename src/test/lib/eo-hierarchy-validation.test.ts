import { describe, it, expect } from 'vitest';
import { detectHierarchyAnomalies } from '@/lib/eo/eo-hierarchy-validation';
import type { ImportEntity } from '@/lib/eo/eo-hierarchy-validation';

describe('detectHierarchyAnomalies', () => {
  it('returns empty array when no anomalies', () => {
    const entities: ImportEntity[] = [
      { code: 'P1', name: 'Parent', is_active: true, parent_code: null, parent_name: null },
      { code: 'C1', name: 'Child', is_active: true, parent_code: 'P1', parent_name: 'Parent' },
    ];
    expect(detectHierarchyAnomalies(entities, [])).toEqual([]);
  });

  it('detects active entity under inactive parent in import data', () => {
    const entities: ImportEntity[] = [
      { code: 'P1', name: 'Parent', is_active: false, parent_code: null, parent_name: null },
      { code: 'C1', name: 'Child', is_active: true, parent_code: 'P1', parent_name: 'Parent' },
    ];
    const result = detectHierarchyAnomalies(entities, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('C1');
    expect(result[0]).toContain('Child');
    expect(result[0]).toContain('Parent');
  });

  it('detects active entity under inactive parent in existing DB data', () => {
    const entities: ImportEntity[] = [
      { code: 'C1', name: 'Child', is_active: true, parent_code: 'P1', parent_name: 'DB Parent' },
    ];
    const existing = [{ code: 'P1', name: 'DB Parent', is_active: false }];
    const result = detectHierarchyAnomalies(entities, existing);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('C1');
  });

  it('matches parent by code', () => {
    const entities: ImportEntity[] = [
      { code: 'P1', name: 'Parent', is_active: false, parent_code: null, parent_name: null },
      { code: 'C1', name: 'Child', is_active: true, parent_code: 'P1', parent_name: null },
    ];
    const result = detectHierarchyAnomalies(entities, []);
    expect(result).toHaveLength(1);
  });

  it('matches parent by name case-insensitively and trimmed', () => {
    const entities: ImportEntity[] = [
      { code: 'P1', name: 'Direction RH', is_active: false, parent_code: null, parent_name: null },
      {
        code: 'C1',
        name: 'Equipe Paie',
        is_active: true,
        parent_code: null,
        parent_name: '  direction rh  ',
      },
    ];
    const result = detectHierarchyAnomalies(entities, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('C1');
  });

  it('ignores inactive entities (only checks active ones)', () => {
    const entities: ImportEntity[] = [
      { code: 'P1', name: 'Parent', is_active: false, parent_code: null, parent_name: null },
      {
        code: 'C1',
        name: 'Inactive Child',
        is_active: false,
        parent_code: 'P1',
        parent_name: 'Parent',
      },
    ];
    expect(detectHierarchyAnomalies(entities, [])).toEqual([]);
  });

  it('ignores entities with no parent', () => {
    const entities: ImportEntity[] = [
      { code: 'R1', name: 'Root', is_active: true, parent_code: null, parent_name: null },
    ];
    expect(detectHierarchyAnomalies(entities, [])).toEqual([]);
  });
});
