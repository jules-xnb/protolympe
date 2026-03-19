/**
 * Utility functions for building and flattening tree structures
 * from flat arrays with parent references.
 */

export interface BuildTreeOpts<T, C extends string = 'children'> {
  /** Property used as node identifier (default: 'id') */
  idKey?: keyof T;
  /** Property linking to the parent node (e.g. 'parent_id', 'parent_field_id') */
  parentKey: keyof T;
  /** Property name where child nodes are stored (default: 'children') */
  childrenKey?: C;
  /** Optional comparator applied recursively to sort siblings */
  sort?: (a: T, b: T) => number;
}

export interface FlattenTreeOpts<C extends string = 'children', D extends string = 'depth'> {
  /** Property name where child nodes are stored (default: 'children') */
  childrenKey?: C;
  /** Property name where depth is written (default: 'depth') */
  depthKey?: D;
}

/** A tree node: the original item T plus a children array keyed by C */
export type TreeNode<T, C extends string = 'children'> = T & Record<C, TreeNode<T, C>[]>;

/** A flattened node: the original item T plus a numeric depth keyed by D */
export type FlatNode<T, D extends string = 'depth'> = T & Record<D, number>;

/**
 * Builds a tree from a flat array of items that reference their parent
 * via a foreign-key property.
 *
 * Items whose parentKey value is null, undefined, or points to an ID
 * not present in the dataset are treated as root nodes.
 *
 * @example
 * ```ts
 * const tree = buildTree(fields, { parentKey: 'parent_field_id' });
 * const tree = buildTree(entities, {
 *   parentKey: 'parent_id',
 *   sort: (a, b) => a.name.localeCompare(b.name),
 * });
 * ```
 */
export function buildTree<T extends Record<string, unknown>, C extends string = 'children'>(
  items: T[],
  opts: BuildTreeOpts<T, C>,
): TreeNode<T, C>[] {
  const idKey = (opts.idKey ?? 'id') as string;
  const parentKey = opts.parentKey as string;
  const childrenKey = (opts.childrenKey ?? 'children') as C;

  type Node = TreeNode<T, C>;

  // Build a map keyed by item ID, adding an empty children array to each node
  const nodeMap = new Map<string, Node>();
  items.forEach(item => {
    nodeMap.set(String(item[idKey]), { ...item, [childrenKey]: [] } as Node);
  });

  // Wire parent → child relationships and collect roots
  const roots: Node[] = [];

  items.forEach(item => {
    const node = nodeMap.get(String(item[idKey]))!;
    const parentId = item[parentKey];

    if (parentId != null && nodeMap.has(String(parentId))) {
      const parent = nodeMap.get(String(parentId))!;
      (parent[childrenKey] as Node[]).push(node);
    } else {
      roots.push(node);
    }
  });

  // Recursively sort siblings when a comparator is provided
  if (opts.sort) {
    const sortRecursive = (nodes: Node[]) => {
      nodes.sort(opts.sort!);
      nodes.forEach(node => sortRecursive(node[childrenKey] as Node[]));
    };
    sortRecursive(roots);
  }

  return roots;
}

/**
 * Flattens a tree (output of `buildTree`) into a depth-first ordered
 * flat array, annotating each node with its depth level.
 *
 * @example
 * ```ts
 * const flat = flattenTree(roots);
 * // flat[0].depth === 0, flat[0].children[0].depth === 1, etc.
 *
 * const flat = flattenTree(roots, { depthKey: 'level' });
 * ```
 */
export function flattenTree<T extends Record<string, unknown>, C extends string = 'children', D extends string = 'depth'>(
  roots: T[],
  opts?: FlattenTreeOpts<C, D>,
): FlatNode<T, D>[] {
  const childrenKey = (opts?.childrenKey ?? 'children') as string;
  const depthKey = (opts?.depthKey ?? 'depth') as string;

  type Out = FlatNode<T, D>;
  const result: Out[] = [];

  const walk = (nodes: T[], depth: number) => {
    nodes.forEach(node => {
      result.push({ ...node, [depthKey]: depth } as Out);
      const children = node[childrenKey] as T[] | undefined;
      if (children && children.length > 0) {
        walk(children, depth + 1);
      }
    });
  };

  walk(roots, 0);
  return result;
}
