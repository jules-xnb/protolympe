import { useState, useEffect } from 'react';
import { GripVertical, X, Plus, Columns3, ArrowLeft } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import type { EoListColumnConfig } from './types';
import { EO_LIST_COLUMN_OPTIONS } from './types';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

/* ── Draggable item in the left "available" panel ── */
function DraggableAvailableItem({ id, name, onAdd }: { id: string; name: string; onAdd: () => void }) {
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

/* ── Sortable item in the right "selected" panel ── */
function SortableColumnItem({ column, onRemove, isFixed }: {
  column: EoListColumnConfig;
  onRemove: () => void;
  isFixed?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.field_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2.5 rounded-lg border bg-background transition-shadow',
        isDragging && 'opacity-50 z-50 shadow-lg'
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
      {isFixed ? (
        <Chip variant="outline" className="text-xs shrink-0">Obligatoire</Chip>
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
function DragOverlayItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background shadow-xl w-64">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{name}</span>
    </div>
  );
}

/* ── Droppable wrapper for the right panel ── */
function DroppableSelectedZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
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
          Glissez une colonne ici ou cliquez à gauche
        </p>
      ) : (
        children
      )}
    </div>
  );
}

/* ── Main panel (replaces dialog) ── */
interface EoListColumnsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: EoListColumnConfig[];
  customFields: EoFieldDefinition[];
  onSave: (columns: EoListColumnConfig[]) => void;
}

export function EoListColumnsConfigDialog({
  open,
  onOpenChange,
  columns,
  customFields,
  onSave,
}: EoListColumnsConfigDialogProps) {
  const ensureNameColumn = (cols: EoListColumnConfig[]): EoListColumnConfig[] => {
    const hasName = cols.some(c => c.field_id === 'name');
    if (!hasName) {
      return [{ field_id: 'name', field_name: 'Nom', is_custom: false }, ...cols];
    }
    return cols;
  };

  const [localColumns, setLocalColumns] = useState<EoListColumnConfig[]>(ensureNameColumn(columns));
  const [activeItem, setActiveItem] = useState<{ id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (open) {
      setLocalColumns(ensureNameColumn(columns));
    }
  }, [open, columns]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === 'available') {
      setActiveItem({ id: data.fieldId, name: data.fieldName });
    } else {
      const col = localColumns.find(c => c.field_id === active.id);
      if (col) setActiveItem({ id: col.field_id, name: col.field_name });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    const data = active.data.current;

    if (data?.type === 'available') {
      if (over) {
        const fieldId = data.fieldId as string;
        const fieldName = data.fieldName as string;
        if (!localColumns.some(c => c.field_id === fieldId)) {
          setLocalColumns(prev => [...prev, { field_id: fieldId, field_name: fieldName }]);
        }
      }
      return;
    }

    if (!over || active.id === over.id) return;
    const oldIndex = localColumns.findIndex(c => c.field_id === active.id);
    const newIndex = localColumns.findIndex(c => c.field_id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setLocalColumns(arrayMove(localColumns, oldIndex, newIndex));
    }
  };

  const handleAddColumn = (field: string, label: string) => {
    if (localColumns.some(c => c.field_id === field)) return;
    setLocalColumns([...localColumns, { field_id: field, field_name: label }]);
  };

  const handleRemoveColumn = (fieldId: string) => {
    if (fieldId === 'name') return;
    setLocalColumns(localColumns.filter(c => c.field_id !== fieldId));
  };

  const handleClose = () => {
    onSave(localColumns);
    onOpenChange(false);
  };

  if (!open) return null;

  const selectedFieldIds = new Set(localColumns.map(c => c.field_id));

  const allAvailableFields = [
    ...EO_LIST_COLUMN_OPTIONS.filter(f => f.field !== 'name' && !selectedFieldIds.has(f.field))
      .map(f => ({ id: f.field, name: f.label })),
    ...customFields.filter(f => f.is_active && !selectedFieldIds.has(f.id))
      .map(f => ({ id: f.id, name: f.name })),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Columns3 className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Colonnes de la vue liste</h3>
          <p className="text-xs text-muted-foreground">Glissez-déposez ou cliquez pour ajouter</p>
        </div>
      </div>

      {/* DnD panels */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-2 divide-x overflow-hidden">
          {/* Left panel – Available */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b">
              <span className="text-xs font-medium">Disponibles</span>
              <span className="text-xs text-muted-foreground ml-1.5">{allAvailableFields.length}</span>
            </div>
            <div className="flex-1 h-0 overflow-y-auto p-2">
              {allAvailableFields.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Toutes les colonnes sont sélectionnées
                </p>
              ) : (
                <div className="space-y-0.5">
                  {allAvailableFields.map(field => (
                    <DraggableAvailableItem
                      key={field.id}
                      id={field.id}
                      name={field.name}
                      onAdd={() => handleAddColumn(field.id, field.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right panel – Selected */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 border-b flex items-center justify-between" style={{ height: 45 }}>
              <span className="text-xs font-medium">Sélectionnées</span>
              <span className="text-xs text-muted-foreground">
                {localColumns.length} colonne{localColumns.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 h-0 overflow-y-auto p-2">
              <DroppableSelectedZone isEmpty={localColumns.length === 0}>
                <SortableContext
                  items={localColumns.map(c => c.field_id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {localColumns.map(column => (
                      <SortableColumnItem
                        key={column.field_id}
                        column={column}
                        onRemove={() => handleRemoveColumn(column.field_id)}
                        isFixed={column.field_id === 'name'}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableSelectedZone>
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeItem ? <DragOverlayItem name={activeItem.name} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
