import { useState, useEffect } from 'react';
import { ArrowLeft, Eye, EyeOff, X, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
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
import { cn } from '@/lib/utils';
import type { UserAnonymizableField, UserFieldAnonymization } from '@/types/builder-types';

const ALL_FIELDS: { field: UserAnonymizableField; label: string }[] = [
  { field: 'first_name', label: 'Prénom' },
  { field: 'last_name', label: 'Nom' },
  { field: 'email', label: 'Email' },
  { field: 'profile', label: 'Profil' },
];

/* ── Draggable item in "Visibles" column ── */
function DraggableVisibleItem({ id, label, onMove }: { id: string; label: string; onMove: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `visible-${id}`,
    data: { type: 'visible', fieldId: id, label },
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
        'w-full flex items-center gap-2 px-[10px] h-[50px] rounded-lg border text-left hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30'
      )}
      onClick={onMove}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate flex-1 text-[14px] font-medium text-foreground">{label}</span>
    </div>
  );
}

/* ── Sortable item in "Anonymes" column ── */
function SortableAnonymousItem({ field, label, onRemove }: { field: string; label: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 px-[10px] h-[50px] rounded-lg border bg-background transition-shadow',
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
      <span className="flex-1 text-[14px] font-medium text-foreground truncate">{label}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ── Droppable zone ── */
function DroppableAnonymousZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'anonymous-zone' });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[200px] rounded-lg transition-colors',
        isOver && 'bg-primary/5 ring-2 ring-primary/20 ring-inset',
        isEmpty && !isOver && 'border-2 border-dashed flex items-center justify-center'
      )}
    >
      {isEmpty && !isOver ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Glissez un champ ici ou cliquez à gauche
        </p>
      ) : (
        children
      )}
    </div>
  );
}

/* ── Drag overlay ── */
function DragOverlayItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background shadow-xl w-56">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{name}</span>
    </div>
  );
}

/* ── Main dialog ── */
interface UsersAnonymizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anonymization: UserFieldAnonymization[];
  onSave: (anonymization: UserFieldAnonymization[]) => void;
}

export function UsersAnonymizationDialog({
  open,
  onOpenChange,
  anonymization: initialAnonymization,
  onSave,
}: UsersAnonymizationDialogProps) {
  const [anonymousFields, setAnonymousFields] = useState<UserAnonymizableField[]>([]);
  const [activeItem, setActiveItem] = useState<{ id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (open) setAnonymousFields(initialAnonymization.map(a => a.field));
  }, [open, initialAnonymization]);

  if (!open) return null;

  const anonymousSet = new Set(anonymousFields);
  const visibleFields = ALL_FIELDS.filter(f => !anonymousSet.has(f.field));

  const moveToAnonymous = (field: UserAnonymizableField) => {
    if (!anonymousSet.has(field)) setAnonymousFields(prev => [...prev, field]);
  };

  const moveToVisible = (field: UserAnonymizableField) => {
    setAnonymousFields(prev => prev.filter(f => f !== field));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'visible') {
      setActiveItem({ id: data.fieldId as string, name: data.label as string });
    } else {
      const f = ALL_FIELDS.find(f => f.field === event.active.id);
      if (f) setActiveItem({ id: f.field, name: f.label });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    const data = active.data.current;
    if (data?.type === 'visible') {
      if (over) moveToAnonymous(data.fieldId as UserAnonymizableField);
      return;
    }

    // Reorder within anonymous column
    if (!over || active.id === over.id) return;
    const oldIndex = anonymousFields.indexOf(active.id as UserAnonymizableField);
    const newIndex = anonymousFields.indexOf(over.id as UserAnonymizableField);
    if (oldIndex !== -1 && newIndex !== -1) {
      setAnonymousFields(arrayMove(anonymousFields, oldIndex, newIndex));
    }
  };

  const handleClose = () => {
    onSave(anonymousFields.map(field => ({ field, hidden_for_profiles: [] })));
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <EyeOff className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Anonymisation des colonnes</h3>
          <p className="text-xs text-muted-foreground">Glissez-déposez ou cliquez pour configurer</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setAnonymousFields(ALL_FIELDS.map(f => f.field))}
          >
            Tout anonymiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setAnonymousFields([])}
          >
            Tout rendre visible
          </Button>
        </div>
      </div>

      {/* Two-column DnD layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-2 divide-x min-h-0">
          {/* Left – Anonymes */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Anonymes</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {anonymousFields.length} colonne{anonymousFields.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <DroppableAnonymousZone isEmpty={anonymousFields.length === 0}>
                <SortableContext items={anonymousFields} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {anonymousFields.map(field => {
                      const def = ALL_FIELDS.find(f => f.field === field)!;
                      return (
                        <SortableAnonymousItem
                          key={field}
                          field={field}
                          label={def.label}
                          onRemove={() => moveToVisible(field)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DroppableAnonymousZone>
            </div>
          </div>

          {/* Right – Visibles */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Visibles</span>
              <span className="text-xs text-muted-foreground">{visibleFields.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {visibleFields.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Toutes les colonnes sont anonymisées
                </p>
              ) : (
                <div className="space-y-2">
                  {visibleFields.map(f => (
                    <DraggableVisibleItem
                      key={f.field}
                      id={f.field}
                      label={f.label}
                      onMove={() => moveToAnonymous(f.field)}
                    />
                  ))}
                </div>
              )}
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
