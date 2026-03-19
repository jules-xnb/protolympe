import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlockRenderer } from './BlockRenderer';
import type { PageBlock } from './types';
import { useRef, useState, useEffect, useMemo } from 'react';

interface PageBuilderPreviewPaneProps {
  viewId: string;
  viewName: string;
  blocks: PageBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onResizeBlock: (id: string, colSpan: number) => void;
  onResizeBlockHeight: (id: string, rowSpan: number) => void;
  onMoveBlock: (id: string, colStart: number) => void;
  onMoveBlockRow: (id: string, rowStart: number) => void;
  settings?: { gap?: number; padding?: number };
  boDefinitions?: { id: string; name: string }[];
}

export function PageBuilderPreviewPane({
  viewName,
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onResizeBlock,
  onResizeBlockHeight,
  onMoveBlock,
  onMoveBlockRow,
  settings,
  boDefinitions = [],
}: PageBuilderPreviewPaneProps) {
  // Separate top-level blocks from children (blocks inside sections)
  const topLevelBlocks = useMemo(
    () => blocks.filter(b => !b.parentId),
    [blocks]
  );

  const childrenByParent = useMemo(() => {
    const map: Record<string, PageBlock[]> = {};
    for (const b of blocks) {
      if (b.parentId) {
        if (!map[b.parentId]) map[b.parentId] = [];
        map[b.parentId].push(b);
      }
    }
    return map;
  }, [blocks]);
  const { setNodeRef, isOver } = useDroppable({
    id: 'page-builder-canvas',
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Ensure there's always space below the last quarter
  const totalHeight = Math.max(contentHeight, viewportHeight) + viewportHeight;

  return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden border bg-background">
      {/* Header */}
      <div className="h-12 border-b px-4 flex items-center bg-background shrink-0">
        <h1 className="font-semibold text-sm truncate">{viewName}</h1>
      </div>

      {/* Page Content - Scrollable viewport simulation */}
      <div 
        ref={(node) => {
          setNodeRef(node);
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn(
          "flex-1 overflow-auto transition-colors relative",
          isOver && "bg-primary/5"
        )}
        onClick={() => onSelectBlock(null)}
      >
        {blocks.length === 0 ? (
          <div className={cn(
            "h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground m-4 rounded-lg border-2 border-dashed",
            isOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          )}>
            <Puzzle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium">Glissez des blocs ici</p>
            <p className="text-xs">Construisez votre page avec la grille 12 colonnes</p>
          </div>
        ) : (
        <SortableContext items={topLevelBlocks.map(b => b.id)} strategy={rectSortingStrategy}>
            <div className="relative" style={{ minHeight: `${totalHeight}px` }}>
              {/* Graduated ruler on the left - absolute so it doesn't affect grid layout */}
              {viewportHeight > 0 && (
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-muted/30 border-r border-border/50 pointer-events-none select-none z-20">
                  {(() => {
                    const pad = settings?.padding || 16;
                    const gap = settings?.gap || 16;
                    const rowH = viewportHeight / 8;
                    const count = rowH > 0 ? Math.floor(totalHeight / rowH) : 0;
                    return Array.from({ length: count }, (_, i) => {
                      const y = pad + rowH * (i + 1) + gap * i;
                      const isFold = (i + 1) % 8 === 0;
                      const isMajor = (i + 1) % 2 === 0;
                      const pct = (i + 1) * 25 / 2; // 12.5 per row
                      return (
                        <div key={i} className="absolute left-0 right-0" style={{ top: `${y}px` }}>
                          <div className={cn(
                            "w-full border-t",
                            isFold ? "border-muted-foreground/40" : isMajor ? "border-muted-foreground/20" : "border-muted-foreground/10"
                          )} />
                          {(isFold || isMajor) && (
                            <span className={cn(
                              "absolute left-0.5 -translate-y-full font-mono leading-none",
                              isFold ? "text-xs text-foreground/60 font-semibold" : "text-[9px] text-muted-foreground/50"
                            )}>
                              {isFold ? `${(i + 1) / 8}x` : `${pct}`}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
              {/* Grid area with left padding to avoid ruler overlap */}
              <div 
                ref={gridRef}
                data-page-builder-grid
                className="grid relative"
                style={{ 
                  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                  gridAutoRows: `${viewportHeight / 8}px`,
                  gap: `${settings?.gap || 16}px`,
                  padding: `${settings?.padding || 16}px`,
                  paddingLeft: `${(settings?.padding || 16) + 28}px`,
                }}
              >
                {topLevelBlocks.map(block => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => onSelectBlock(block.id)}
                    onDelete={() => onDeleteBlock(block.id)}
                    onResize={(colSpan) => onResizeBlock(block.id, colSpan)}
                    onResizeHeight={(rowSpan) => onResizeBlockHeight(block.id, rowSpan)}
                    onMove={(colStart) => onMoveBlock(block.id, colStart)}
                    onMoveRow={(rowStart) => onMoveBlockRow(block.id, rowStart)}
                    boDefinitions={boDefinitions}
                    children={childrenByParent[block.id] || []}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={onSelectBlock}
                    onDeleteBlock={onDeleteBlock}
                  />
                ))}
              </div>
              {/* Subtle horizontal guide lines across the canvas */}
              {viewportHeight > 0 && (() => {
                const pad = settings?.padding || 16;
                const gap = settings?.gap || 16;
                const rowH = viewportHeight / 8;
                const count = rowH > 0 ? Math.floor(totalHeight / rowH) : 0;
                return Array.from({ length: count }, (_, i) => {
                  const y = pad + rowH * (i + 1) + gap * i;
                  const isFold = (i + 1) % 8 === 0;
                  const isMajor = (i + 1) % 2 === 0;
                  return (
                    <div
                      key={i}
                      className="absolute left-6 right-0 pointer-events-none z-10"
                      style={{ top: `${y}px` }}
                    >
                      <div className={cn(
                        "w-full border-t border-dashed",
                        isFold ? "border-muted-foreground/25" : isMajor ? "border-muted-foreground/10" : "border-muted-foreground/5"
                      )} />
                    </div>
                  );
                });
              })()}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
