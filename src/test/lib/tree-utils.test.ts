import { describe, it, expect } from 'vitest';
import { buildTree, flattenTree } from '@/lib/tree-utils';

describe('buildTree', () => {
  it('should build a tree from flat items with parent references', () => {
    const items = [
      { id: '1', name: 'Root', parent_id: null },
      { id: '2', name: 'Child A', parent_id: '1' },
      { id: '3', name: 'Child B', parent_id: '1' },
      { id: '4', name: 'Grandchild', parent_id: '2' },
    ];
    const tree = buildTree(items, { parentKey: 'parent_id' });
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Root');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].name).toBe('Child A');
    expect(tree[0].children[1].name).toBe('Child B');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].name).toBe('Grandchild');
  });

  it('should handle multiple roots', () => {
    const items = [
      { id: '1', name: 'Root A', parent_id: null },
      { id: '2', name: 'Root B', parent_id: null },
      { id: '3', name: 'Child of A', parent_id: '1' },
    ];
    const tree = buildTree(items, { parentKey: 'parent_id' });
    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe('Root A');
    expect(tree[1].name).toBe('Root B');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[1].children).toHaveLength(0);
  });

  it('should handle empty array', () => {
    const tree = buildTree([], { parentKey: 'parent_id' });
    expect(tree).toEqual([]);
  });

  it('should handle orphaned items as roots', () => {
    const items = [
      { id: '1', name: 'Root', parent_id: null },
      { id: '2', name: 'Orphan', parent_id: '999' }, // parent not in dataset
      { id: '3', name: 'Child of Root', parent_id: '1' },
    ];
    const tree = buildTree(items, { parentKey: 'parent_id' });
    expect(tree).toHaveLength(2);
    const rootNames = tree.map(n => n.name);
    expect(rootNames).toContain('Root');
    expect(rootNames).toContain('Orphan');
  });

  it('should sort when sort fn provided', () => {
    const items = [
      { id: '1', name: 'Root', parent_id: null },
      { id: '2', name: 'Zebra', parent_id: '1' },
      { id: '3', name: 'Alpha', parent_id: '1' },
      { id: '4', name: 'Middle', parent_id: '1' },
    ];
    const tree = buildTree(items, {
      parentKey: 'parent_id',
      sort: (a, b) => a.name.localeCompare(b.name),
    });
    expect(tree[0].children[0].name).toBe('Alpha');
    expect(tree[0].children[1].name).toBe('Middle');
    expect(tree[0].children[2].name).toBe('Zebra');
  });

  it('should sort recursively through nested levels', () => {
    const items = [
      { id: '1', name: 'Root', parent_id: null },
      { id: '2', name: 'Parent', parent_id: '1' },
      { id: '3', name: 'Z-child', parent_id: '2' },
      { id: '4', name: 'A-child', parent_id: '2' },
    ];
    const tree = buildTree(items, {
      parentKey: 'parent_id',
      sort: (a, b) => a.name.localeCompare(b.name),
    });
    const grandchildren = tree[0].children[0].children;
    expect(grandchildren[0].name).toBe('A-child');
    expect(grandchildren[1].name).toBe('Z-child');
  });

  it('should support custom idKey', () => {
    const items = [
      { uid: 'a', label: 'Root', pid: null },
      { uid: 'b', label: 'Child', pid: 'a' },
    ];
    const tree = buildTree(items, { idKey: 'uid', parentKey: 'pid' });
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe('Root');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].label).toBe('Child');
  });

  it('should support custom childrenKey', () => {
    const items = [
      { id: '1', name: 'Root', parent_id: null },
      { id: '2', name: 'Child', parent_id: '1' },
    ];
    const tree = buildTree(items, { parentKey: 'parent_id', childrenKey: 'nodes' });
    expect(tree[0].nodes).toHaveLength(1);
    expect(tree[0].nodes[0].name).toBe('Child');
  });
});

describe('flattenTree', () => {
  it('should flatten with depth info', () => {
    const tree = [
      {
        id: '1', name: 'Root', children: [
          {
            id: '2', name: 'Child', children: [
              { id: '3', name: 'Grandchild', children: [] },
            ],
          },
        ],
      },
    ];
    const flat = flattenTree(tree);
    expect(flat).toHaveLength(3);
    expect(flat[0].name).toBe('Root');
    expect(flat[0].depth).toBe(0);
    expect(flat[1].name).toBe('Child');
    expect(flat[1].depth).toBe(1);
    expect(flat[2].name).toBe('Grandchild');
    expect(flat[2].depth).toBe(2);
  });

  it('should handle empty array', () => {
    const flat = flattenTree([]);
    expect(flat).toEqual([]);
  });

  it('should support custom depthKey', () => {
    const tree = [
      {
        id: '1', name: 'Root', children: [
          { id: '2', name: 'Child', children: [] },
        ],
      },
    ];
    const flat = flattenTree(tree, { depthKey: 'level' });
    expect(flat[0].level).toBe(0);
    expect(flat[1].level).toBe(1);
  });

  it('should support custom childrenKey', () => {
    const tree = [
      {
        id: '1', name: 'Root', nodes: [
          { id: '2', name: 'Child', nodes: [] },
        ],
      },
    ];
    const flat = flattenTree(tree, { childrenKey: 'nodes' });
    expect(flat).toHaveLength(2);
    expect(flat[0].depth).toBe(0);
    expect(flat[1].depth).toBe(1);
  });

  it('should handle multiple roots', () => {
    const tree = [
      { id: '1', name: 'Root A', children: [] },
      {
        id: '2', name: 'Root B', children: [
          { id: '3', name: 'Child of B', children: [] },
        ],
      },
    ];
    const flat = flattenTree(tree);
    expect(flat).toHaveLength(3);
    expect(flat[0].depth).toBe(0);
    expect(flat[1].depth).toBe(0);
    expect(flat[2].depth).toBe(1);
  });

  it('should integrate with buildTree output', () => {
    const items = [
      { id: '1', name: 'Root', parent_id: null },
      { id: '2', name: 'Child A', parent_id: '1' },
      { id: '3', name: 'Child B', parent_id: '1' },
      { id: '4', name: 'Grandchild', parent_id: '2' },
    ];
    const tree = buildTree(items, { parentKey: 'parent_id' });
    const flat = flattenTree(tree);
    expect(flat).toHaveLength(4);
    expect(flat[0].depth).toBe(0);
    expect(flat[1].depth).toBe(1);
    expect(flat[2].depth).toBe(2);
    expect(flat[3].depth).toBe(1);
  });
});
