import { describe, it, expect } from 'vitest';
import { buildNavigationConfigTree } from '@/hooks/useNavigationConfigs';
import type { NavigationConfigWithRelations } from '@/hooks/useNavigationConfigs';

// ── Helper ──────────────────────────────────────────────────────────────────

function makeNavConfig(
  overrides: Partial<NavigationConfigWithRelations> = {},
): NavigationConfigWithRelations {
  return {
    id: 'nav-1',
    client_id: 'client-1',
    parent_id: null,
    label: 'Item',
    display_label: null,
    slug: 'item',
    icon: null,
    view_config_id: null,
    url: null,
    display_order: 0,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    created_by: null,
    view_configs: null,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('buildNavigationConfigTree', () => {
  it('should return empty array for empty input', () => {
    expect(buildNavigationConfigTree([])).toEqual([]);
  });

  it('should return all items as roots when no parent_id set', () => {
    const items = [
      makeNavConfig({ id: 'a', label: 'A', parent_id: null }),
      makeNavConfig({ id: 'b', label: 'B', parent_id: null }),
    ];
    const tree = buildNavigationConfigTree(items);
    expect(tree).toHaveLength(2);
    expect(tree[0].label).toBe('A');
    expect(tree[1].label).toBe('B');
    expect(tree[0].children).toEqual([]);
    expect(tree[1].children).toEqual([]);
  });

  it('should build parent-child relationships correctly', () => {
    const items = [
      makeNavConfig({ id: 'root', label: 'Root', parent_id: null }),
      makeNavConfig({ id: 'child-1', label: 'Child 1', parent_id: 'root' }),
      makeNavConfig({ id: 'child-2', label: 'Child 2', parent_id: 'root' }),
    ];
    const tree = buildNavigationConfigTree(items);
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe('Root');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children![0].label).toBe('Child 1');
    expect(tree[0].children![1].label).toBe('Child 2');
  });

  it('should handle multiple levels of nesting', () => {
    const items = [
      makeNavConfig({ id: 'root', label: 'Root', parent_id: null }),
      makeNavConfig({ id: 'child', label: 'Child', parent_id: 'root' }),
      makeNavConfig({ id: 'grandchild', label: 'Grandchild', parent_id: 'child' }),
    ];
    const tree = buildNavigationConfigTree(items);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].children).toHaveLength(1);
    expect(tree[0].children![0].children![0].label).toBe('Grandchild');
  });

  it('should put items with unknown parent_id as roots', () => {
    const items = [
      makeNavConfig({ id: 'a', label: 'A', parent_id: null }),
      makeNavConfig({ id: 'b', label: 'Orphan', parent_id: 'nonexistent' }),
    ];
    const tree = buildNavigationConfigTree(items);
    expect(tree).toHaveLength(2);
    const labels = tree.map(n => n.label);
    expect(labels).toContain('A');
    expect(labels).toContain('Orphan');
  });
});
