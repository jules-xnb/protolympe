import { Plus, GripVertical, X } from 'lucide-react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import { useT } from '@/hooks/useT';
import type { EoListColumnConfig } from '@/components/builder/page-builder/types';

/* ── Draggable available item (left panel) ── */
export function DraggableAvailableItem({ id, name, onAdd }: { id: string; name: string; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `available-${id}`,
    data: { type: 'available', fieldId: id, fieldName: name },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      style={{ touchAction: 'none' }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-accent/50 transition-colors group cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30'
      )}
      onClick={onAdd}
    >
      <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
      <span className="truncate">{name}</span>
    </div>
  );
}

/* ── Sortable selected item (right panel) ── */
export function SortableColumnItem({ column, onRemove, isFixed }: {
  column: EoListColumnConfig;
  onRemove: () => void;
  isFixed?: boolean;
}) {
  const { t } = useT();
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: column.field_id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2.5 rounded-lg border bg-background transition-shadow',
        isDragging && 'opacity-50 z-50 shadow-lg',
        isFixed && 'opacity-50'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="flex-1 text-sm font-medium">{column.field_name}</span>
      {column.is_custom && (
        <Chip variant="outline" className="text-xs shrink-0">{t('columns.custom')}</Chip>
      )}
      {isFixed ? (
        <Chip variant="outline" className="text-xs shrink-0">{t('labels.required')}</Chip>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/* ── Drag overlay ghost ── */
export function DragOverlayItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background shadow-xl w-64">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{name}</span>
    </div>
  );
}

/* ── Droppable zone for selected columns ── */
export function DroppableSelectedZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { t } = useT();
  const { setNodeRef, isOver } = useDroppable({ id: 'selected-zone' });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-full rounded-lg transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/20 ring-inset',
        isEmpty && !isOver && 'border-2 border-dashed flex items-center justify-center'
      )}
    >
      {isEmpty && !isOver ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('columns.drop_hint')}
        </p>
      ) : (
        children
      )}
    </div>
  );
}
