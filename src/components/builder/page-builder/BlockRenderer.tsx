import { useCallback, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import {
  Table,
  Building2,
  GripVertical,
  ClipboardList,
  FileCheck,
  Users,
  UserCog,
  LayoutPanelTop,
  LayoutList,
  Minus,
  Puzzle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BlockPreviewDataTable } from './BlockPreviewDataTable';
import { BlockPreviewEoCard } from './BlockPreviewEoCard';
import { BlockPreviewUsers } from './BlockPreviewUsers';
import type { PageBlock, BlockType, DataTableBlock, EoCardBlock, UsersBlock } from './types';

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  data_table: Table,
  eo_card: Building2,
  survey_creator: ClipboardList,
  survey_responses: FileCheck,
  users: Users,
  profiles: UserCog,
  section: LayoutPanelTop,
  sub_section: LayoutList,
  separator: Minus,
};

const BLOCK_LABELS: Record<BlockType, string> = {
  data_table: 'Tableau de données',
  eo_card: 'Organisation',
  survey_creator: 'Questionnaires',
  survey_responses: 'Réponses questionnaires',
  users: 'Utilisateurs',
  profiles: 'Profils',
  section: 'Section',
  sub_section: 'Sous-section',
  separator: 'Séparateur',
};

interface BlockRendererProps {
  block: PageBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onResize: (colSpan: number) => void;
  onResizeHeight: (rowSpan: number) => void;
  onMove: (colStart: number) => void;
  onMoveRow: (rowStart: number) => void;
  boDefinitions?: { id: string; name: string }[];
  roles?: { id: string; name: string }[];
  children?: PageBlock[];
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string | null) => void;
  onDeleteBlock?: (id: string) => void;
}

export function BlockRenderer({
  block,
  isSelected,
  onSelect,
  onDelete: _onDelete,
  onResize,
  onResizeHeight,
  onMove: _onMove,
  onMoveRow: _onMoveRow,
  boDefinitions: _boDefinitions = [],
  roles: _roles = [],
  children = [],
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock: _onDeleteBlock,
}: BlockRendererProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform: _transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: {
      type: 'canvas-block',
      block,
    },
  });

  const isContainer = block.type === 'section' || block.type === 'sub_section';

  // Make sections/sub-sections droppable
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `section-drop-${block.id}`,
    data: {
      type: 'section-drop-zone',
      sectionId: block.id,
    },
    disabled: !isContainer,
  });

  const colStart = block.position.colStart || 1;
  const rowSpan = block.position.rowSpan || 2;
  const rowStart = block.position.rowStart || undefined;
  const maxColSpan = 13 - colStart;

  const style: React.CSSProperties = {
    transition: isDragging ? 'none' : transition,
    gridColumnStart: colStart,
    gridColumnEnd: `span ${Math.min(block.position.colSpan, maxColSpan)}`,
    gridRow: rowStart ? `${rowStart} / span ${rowSpan}` : `span ${rowSpan}`,
    overflow: 'hidden',
  };

  const Icon = BLOCK_ICONS[block.type];
  const label = block.title || BLOCK_LABELS[block.type];

  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback((
    e: React.MouseEvent,
    mode: 'width' | 'height' | 'both'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startColSpan = block.position.colSpan;
    const startRowSpan = rowSpan;
    const el = containerRef.current;
    if (!el) return;

    const cellWidth = el.offsetWidth / startColSpan;
    const cellHeight = el.offsetHeight / startRowSpan;

    setIsResizing(true);

    const handleMouseMove = (ev: MouseEvent) => {
      if (mode === 'width' || mode === 'both') {
        const dx = ev.clientX - startX;
        const colDelta = Math.round(dx / cellWidth);
        const newColSpan = Math.max(1, Math.min(startColSpan + colDelta, 13 - colStart));
        onResize(newColSpan);
      }
      if (mode === 'height' || mode === 'both') {
        const dy = ev.clientY - startY;
        const rowDelta = Math.round(dy / cellHeight);
        const newRowSpan = Math.max(1, Math.min(startRowSpan + rowDelta, 12));
        onResizeHeight(newRowSpan);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [block.position.colSpan, rowSpan, colStart, onResize, onResizeHeight]);

  // Render separator block
  if (block.type === 'separator') {
    const sepStyle = (block.config as { style?: string }).style || 'line';
    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style}
        className={cn(
          'relative group h-full min-h-0 flex items-center',
          isDragging && 'opacity-50 z-50',
          isResizing && 'z-40 select-none'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div className={cn(
          'w-full px-4 py-2 rounded-md transition-all cursor-pointer',
          isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/30',
        )}>
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
            {sepStyle === 'line' ? (
              <div className="flex-1 border-t border-border" />
            ) : (
              <div className="flex-1 h-6" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render section/sub-section container
  if (isContainer) {
    const isSubSection = block.type === 'sub_section';
    return (
      <div
        ref={(node) => {
          setNodeRef(node);
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        style={style}
        className={cn(
          'relative group h-full min-h-0 overflow-hidden',
          isDragging && 'opacity-50 z-50',
          isResizing && 'z-40 select-none'
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <div
          className={cn(
            'h-full rounded-lg transition-all overflow-hidden flex flex-col',
            isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/30',
            isSubSection
              ? 'border border-dashed border-muted-foreground/30 bg-muted/20'
              : 'border-2 border-dashed border-muted-foreground/40 bg-muted/10',
          )}
        >
          {/* Section header */}
          <div className={cn(
            'flex items-center gap-2 shrink-0 border-b',
            isSubSection ? 'px-3 py-1.5 bg-muted/30' : 'px-4 py-2 bg-muted/40'
          )}>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-accent rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Icon className={cn("text-muted-foreground shrink-0", isSubSection ? "h-3.5 w-3.5" : "h-4 w-4")} />
            <span className={cn(
              "font-medium truncate",
              isSubSection ? "text-xs" : "text-sm"
            )}>{label}</span>
            <span className="ml-auto text-xs font-mono text-muted-foreground">
              {block.position.colSpan}×{rowSpan}
            </span>
          </div>

          {/* Section body - droppable zone */}
          <div
            ref={setDropRef}
            className={cn(
              "flex-1 min-h-0 p-2 overflow-auto transition-colors",
              isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30",
            )}
          >
            {children.length === 0 ? (
              <div className={cn(
                "h-full min-h-[60px] flex flex-col items-center justify-center rounded-md border border-dashed transition-colors",
                isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
              )}>
                <Puzzle className="h-5 w-5 mb-1 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground/60">
                  Glissez un bloc métier ici
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {children.map(child => {
                  const ChildIcon = BLOCK_ICONS[child.type];
                  const childLabel = child.title || BLOCK_LABELS[child.type];
                  const isChildSelected = selectedBlockId === child.id;
                  return (
                    <Card
                      key={child.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        isChildSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBlock?.(child.id);
                      }}
                    >
                      <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0 border-b bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <ChildIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <CardTitle className="text-xs font-medium truncate">{childLabel}</CardTitle>
                        </div>
                      </CardHeader>
                      <div className="p-2 overflow-hidden text-xs text-muted-foreground/60">
                        {renderBlockPreview(child)}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Resize handles */}
        {isSelected && (
          <>
            <div
              className="absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-20 flex items-center justify-center group/handle"
              onMouseDown={(e) => startResize(e, 'width')}
            >
              <div className="w-1 h-8 rounded-full bg-primary opacity-60 group-hover/handle:opacity-100 transition-opacity" />
            </div>
            <div
              className="absolute -bottom-1.5 left-0 h-3 w-full cursor-row-resize z-20 flex items-center justify-center group/handle"
              onMouseDown={(e) => startResize(e, 'height')}
            >
              <div className="h-1 w-8 rounded-full bg-primary opacity-60 group-hover/handle:opacity-100 transition-opacity" />
            </div>
            <div
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 cursor-nwse-resize z-30 flex items-center justify-center group/handle"
              onMouseDown={(e) => startResize(e, 'both')}
            >
              <div className="w-2.5 h-2.5 rounded-sm bg-primary opacity-60 group-hover/handle:opacity-100 transition-opacity" />
            </div>
          </>
        )}
      </div>
    );
  }

  // Render business block (original behavior)
  const isInactive = !block.isActive;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={style}
      className={cn(
        'relative group h-full min-h-0 overflow-hidden',
        isDragging && 'opacity-50 z-50',
        isInactive && 'opacity-50',
        isResizing && 'z-40 select-none'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <Card
        className={cn(
          'h-full cursor-pointer transition-all overflow-hidden',
          isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50',
          isInactive && 'bg-muted/50 border-dashed'
        )}
      >
        <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0 border-b bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-accent rounded"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-sm font-medium truncate">{label}</CardTitle>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {block.position.colSpan}×{rowSpan}
          </span>
        </CardHeader>
        <div className="flex-1 min-h-0 p-3 overflow-hidden text-xs text-muted-foreground/60">
          {renderBlockPreview(block)}
        </div>
      </Card>

      {/* Resize handle: right edge (width) */}
      {isSelected && (
        <div
          className="absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-20 flex items-center justify-center group/handle"
          onMouseDown={(e) => startResize(e, 'width')}
        >
          <div className="w-1 h-8 rounded-full bg-primary opacity-60 group-hover/handle:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Resize handle: bottom edge (height) */}
      {isSelected && (
        <div
          className="absolute -bottom-1.5 left-0 h-3 w-full cursor-row-resize z-20 flex items-center justify-center group/handle"
          onMouseDown={(e) => startResize(e, 'height')}
        >
          <div className="h-1 w-8 rounded-full bg-primary opacity-60 group-hover/handle:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Resize handle: bottom-right corner (both) */}
      {isSelected && (
        <div
          className="absolute -bottom-1.5 -right-1.5 w-4 h-4 cursor-nwse-resize z-30 flex items-center justify-center group/handle"
          onMouseDown={(e) => startResize(e, 'both')}
        >
          <div className="w-2.5 h-2.5 rounded-sm bg-primary opacity-60 group-hover/handle:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}

function renderBlockPreview(block: PageBlock) {
  const isCompact = block.position.colSpan <= 6;

  switch (block.type) {
    case 'data_table':
      return <BlockPreviewDataTable config={(block as DataTableBlock).config} isCompact={isCompact} />;
    case 'eo_card':
      return <BlockPreviewEoCard config={(block as EoCardBlock).config} isCompact={isCompact} />;
    case 'survey_creator':
      return (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span>Création de questionnaires</span>
          </div>
          <p className="text-xs">Permet de créer des questionnaires et lancer des campagnes</p>
        </div>
      );
    case 'survey_responses':
      return (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <span>Réponses aux questionnaires</span>
          </div>
          <p className="text-xs">Liste des questionnaires à compléter par l'utilisateur</p>
        </div>
      );
    case 'users':
      return <BlockPreviewUsers config={(block as UsersBlock).config} />;
    case 'profiles':
      return (
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span>Gestion des profils</span>
          </div>
          <p className="text-xs">Permet aux utilisateurs de créer et gérer leurs profils</p>
        </div>
      );
    default:
      return null;
  }
}