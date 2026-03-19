export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 50;
export const HORIZONTAL_GAP = 30;
export const VERTICAL_GAP = 60;

interface TreeNode {
  id: string;
  name: string;
  children: TreeNode[];
}

export interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  entity: TreeNode & Record<string, unknown>;
  children: NodePosition[];
  isExpanded: boolean;
  hasChildren: boolean;
}

/**
 * Calculate tree layout positions with expansion state.
 */
export function calculateLayout(
  nodes: TreeNode[],
  expandedNodes: Set<string>,
  startX: number = 0,
  startY: number = 0
): { positions: NodePosition[]; totalWidth: number } {
  const positions: NodePosition[] = [];
  let currentX = startX;

  nodes.forEach((node) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    let childResult = { positions: [] as NodePosition[], totalWidth: 0 };

    // Only calculate children if expanded
    if (hasChildren && isExpanded) {
      childResult = calculateLayout(
        node.children,
        expandedNodes,
        currentX,
        startY + NODE_HEIGHT + VERTICAL_GAP
      );
    }

    const subtreeWidth = Math.max(NODE_WIDTH, childResult.totalWidth);
    const nodeX = currentX + (subtreeWidth - NODE_WIDTH) / 2;

    positions.push({
      x: nodeX,
      y: startY,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      entity: node as TreeNode & Record<string, unknown>,
      children: childResult.positions,
      isExpanded,
      hasChildren,
    });

    currentX += subtreeWidth + HORIZONTAL_GAP;
  });

  const totalWidth = currentX - startX - (nodes.length > 0 ? HORIZONTAL_GAP : 0);
  return { positions, totalWidth };
}

/**
 * Calculate the bounding box of all visible nodes.
 */
export function calculateCanvasSize(nodePositions: NodePosition[]): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;

  const traverse = (nodes: NodePosition[]) => {
    nodes.forEach((node) => {
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  };

  traverse(nodePositions);
  return { width: Math.max(maxX + 50, 400), height: Math.max(maxY + 50, 300) };
}

/**
 * Count the number of visible nodes (including expanded children).
 */
export function countVisibleNodes(nodePositions: NodePosition[]): number {
  let count = 0;
  const countVisible = (positions: NodePosition[]) => {
    positions.forEach(pos => {
      count++;
      if (pos.children.length > 0) {
        countVisible(pos.children);
      }
    });
  };
  countVisible(nodePositions);
  return count;
}

/**
 * Find a node position by entity ID, searching recursively.
 */
export function findNodePosition(positions: NodePosition[], id: string): NodePosition | null {
  for (const pos of positions) {
    if (pos.entity.id === id) return pos;
    if (pos.children.length > 0) {
      const found = findNodePosition(pos.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Collect all expandable node IDs from a tree.
 */
export function collectExpandableIds(nodes: { id: string; children: { id: string; children: unknown[] }[] }[]): Set<string> {
  const allIds = new Set<string>();
  const collect = (items: typeof nodes) => {
    items.forEach(node => {
      if (node.children.length > 0) {
        allIds.add(node.id);
        collect(node.children);
      }
    });
  };
  collect(nodes);
  return allIds;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
export function truncateText(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '\u2026' : text;
}
