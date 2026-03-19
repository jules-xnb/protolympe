import type { PageBlock } from './types';

/**
 * Get the pixel sizes of a single grid cell in the page builder.
 * Returns null if the grid element is not found in the DOM.
 */
export function getGridCellSizes() {
  const gridEl = document.querySelector('[data-page-builder-grid]');
  if (!gridEl) return null;
  const gridWidth = gridEl.clientWidth;
  const gap = 16;
  const padding = 16;
  const usableWidth = gridWidth - padding * 2;
  const colWidth = (usableWidth + gap) / 12;
  const computedRowSize = parseFloat(
    window.getComputedStyle(gridEl as HTMLElement).gridAutoRows
  ) || 80;
  const rowHeight = computedRowSize + gap;
  return { colWidth, rowHeight };
}

/**
 * Check if placing a block at the given grid position would overlap with any existing block.
 */
export function wouldOverlap(
  blockId: string,
  colStart: number,
  colSpan: number,
  rowStart: number,
  rowSpan: number,
  allBlocks: PageBlock[]
): boolean {
  const colEnd = colStart + colSpan;
  const rowEnd = rowStart + rowSpan;
  return allBlocks.some(b => {
    if (b.id === blockId) return false;
    const bColStart = b.position.colStart || 1;
    const bColEnd = bColStart + b.position.colSpan;
    const bRowStart = b.position.rowStart || 1;
    const bRowEnd = bRowStart + (b.position.rowSpan || 2);
    return colStart < bColEnd && colEnd > bColStart && rowStart < bRowEnd && rowEnd > bRowStart;
  });
}
