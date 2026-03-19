import type { ListeValue } from '@/hooks/useListes';
export { PRESET_COLORS, DEFAULT_COLOR } from '@/lib/constants';

export interface ValueFormData {
  code: string;
  label: string;
  color: string;
  parent_value_id: string | null;
}

export interface TreeNode extends ListeValue {
  children: TreeNode[];
}

// Build tree structure from flat list
export function buildTree(values: ListeValue[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create nodes
  values.forEach(value => {
    map.set(value.id, { ...value, children: [] });
  });

  // Second pass: build tree
  values.forEach(value => {
    const node = map.get(value.id)!;
    if (value.parent_value_id && map.has(value.parent_value_id)) {
      map.get(value.parent_value_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by display_order
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.display_order - b.display_order);
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

// Get all descendants of a value (to prevent circular references)
export function getDescendantIds(valueId: string, values: ListeValue[]): Set<string> {
  const descendants = new Set<string>();
  const addDescendants = (parentId: string) => {
    values.forEach(v => {
      if (v.parent_value_id === parentId && !descendants.has(v.id)) {
        descendants.add(v.id);
        addDescendants(v.id);
      }
    });
  };
  addDescendants(valueId);
  return descendants;
}
