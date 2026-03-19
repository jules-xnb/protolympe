import { describe, it, expect } from 'vitest';
import { buildLookupMap } from '@/lib/data-utils';

describe('buildLookupMap', () => {
  it('should create a map keyed by id', () => {
    const items = [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
      { id: 'c', name: 'Charlie' },
    ];
    const map = buildLookupMap(items);
    expect(map.size).toBe(3);
    expect(map.get('a')).toEqual({ id: 'a', name: 'Alice' });
    expect(map.get('b')).toEqual({ id: 'b', name: 'Bob' });
    expect(map.get('c')).toEqual({ id: 'c', name: 'Charlie' });
  });

  it('should support custom key function', () => {
    const items = [
      { code: 'FR', label: 'France' },
      { code: 'US', label: 'United States' },
    ];
    const map = buildLookupMap(items, item => item.code);
    expect(map.size).toBe(2);
    expect(map.get('FR')).toEqual({ code: 'FR', label: 'France' });
    expect(map.get('US')).toEqual({ code: 'US', label: 'United States' });
  });

  it('should handle empty array', () => {
    const map = buildLookupMap([]);
    expect(map.size).toBe(0);
    expect(map).toBeInstanceOf(Map);
  });

  it('should handle duplicate keys (last wins)', () => {
    const items = [
      { id: '1', value: 'first' },
      { id: '1', value: 'second' },
    ];
    const map = buildLookupMap(items);
    expect(map.size).toBe(1);
    expect(map.get('1')).toEqual({ id: '1', value: 'second' });
  });

  it('should return undefined for missing keys', () => {
    const items = [{ id: 'a', name: 'Alice' }];
    const map = buildLookupMap(items);
    expect(map.get('nonexistent')).toBeUndefined();
  });
});
