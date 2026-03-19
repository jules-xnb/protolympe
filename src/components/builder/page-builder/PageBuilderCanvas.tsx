import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { Puzzle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BlockRenderer } from './BlockRenderer';
import type { PageBlock } from './types';

interface PageBuilderCanvasProps {
  blocks: PageBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onResizeBlock: (id: string, colSpan: number) => void;
  onResizeBlockHeight: (id: string, rowSpan: number) => void;
  onMoveBlock: (id: string, colStart: number) => void;
  onMoveBlockRow: (id: string, rowStart: number) => void;
  boDefinitions?: { id: string; name: string }[];
}

export function PageBuilderCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onResizeBlock,
  onResizeBlockHeight,
  onMoveBlock,
  onMoveBlockRow,
  boDefinitions = [],
}: PageBuilderCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'page-builder-canvas',
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Aperçu de la page</CardTitle>
          <span className="text-xs text-muted-foreground">
            {blocks.length} bloc{blocks.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-auto">
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-full rounded-lg border-2 border-dashed p-4 transition-colors',
            isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          )}
          onClick={() => onSelectBlock(null)}
        >
          {blocks.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground">
              <Puzzle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm font-medium">Glissez des blocs ici</p>
              <p className="text-xs">Construisez votre page avec la grille 12 colonnes</p>
            </div>
          ) : (
            <SortableContext items={blocks.map((b) => b.id)} strategy={rectSortingStrategy}>
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
                }}
              >
                {blocks.map((block) => (
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
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
