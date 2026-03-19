import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Filter, FilterX, Lock, Plus, X } from 'lucide-react';
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
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import type { EoFilterConfig, EoPreFilterConfig } from './types';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

const FILTERABLE_FIELD_TYPES = [
  'text', 'email', 'phone', 'url',
  'number', 'decimal',
  'date', 'datetime',
  'select', 'multiselect',
  'checkbox',
];

function isFilterableFieldType(fieldType: string): boolean {
  return FILTERABLE_FIELD_TYPES.includes(fieldType);
}

const NATIVE_FILTERABLE_FIELDS: Array<{ id: string; name: string; field_type: string }> = [
  { id: 'name', name: 'Nom', field_type: 'text' },
  { id: 'code', name: 'Code', field_type: 'text' },
];

interface FieldItem {
  id: string;
  name: string;
  field_type: string;
  is_native: boolean;
}

/* ── Draggable available item ── */
function DraggableAvailableItem({ field, onAdd }: { field: FieldItem; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `available-${field.id}`,
    data: { type: 'available', field },
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
      <span className="truncate flex-1">{field.name}</span>
      <Chip variant="outline" className="text-xs shrink-0">{field.field_type}</Chip>
    </div>
  );
}

/* ── Sortable selected item ── */
function SortableSelectedItem({ field, onRemove, isLocked }: { field: FieldItem; onRemove: () => void; isLocked?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

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
        isDragging && 'opacity-50 z-50 shadow-lg',
        isLocked && 'border-primary/30 bg-primary/5'
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
      <span className="flex-1 text-sm font-medium truncate">{field.name}</span>
      {isLocked && (
        <Lock className="h-3 w-3 text-primary/60 shrink-0" />
      )}
      <Chip variant="outline" className="text-xs shrink-0">{field.field_type}</Chip>
      {isLocked ? (
        <Chip variant="default" className="text-xs shrink-0">Par défaut</Chip>
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

/* ── Drag overlay ── */
function DragOverlayItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-background shadow-xl w-56">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium">{name}</span>
    </div>
  );
}

/* ── Droppable zone ── */
function DroppableZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'selected-zone' });

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
          Glissez un filtre ici ou cliquez à gauche
        </p>
      ) : (
        children
      )}
    </div>
  );
}

/* ── Main panel ── */
interface EoFiltersConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: EoFilterConfig[];
  prefilters?: EoPreFilterConfig[];
  customFields: EoFieldDefinition[];
  onSave: (filters: EoFilterConfig[]) => void;
}

export function EoFiltersConfigDialog({
  open,
  onOpenChange,
  filters: initialFilters,
  prefilters = [],
  customFields,
  onSave,
}: EoFiltersConfigDialogProps) {
  const [selectedFields, setSelectedFields] = useState<FieldItem[]>([]);
  const [activeItem, setActiveItem] = useState<{ id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allFields: FieldItem[] = useMemo(() => {
    const filterableCustomFields = customFields.filter(f =>
      f.is_active && isFilterableFieldType(f.field_type)
    );
    return [
      ...NATIVE_FILTERABLE_FIELDS.map(f => ({ ...f, is_native: true })),
      ...filterableCustomFields.map(f => ({ id: f.id, name: f.name, field_type: f.field_type, is_native: false })),
    ];
  }, [customFields]);

  // Compute locked field IDs from user-editable prefilters
  const lockedFieldIds = useMemo(() => {
    return new Set(
      prefilters
        .filter(pf => pf.is_user_editable)
        .map(pf => pf.field_id)
    );
  }, [prefilters]);

  useEffect(() => {
    if (open) {
      // Build locked fields from editable prefilters
      const lockedFields: FieldItem[] = prefilters
        .filter(pf => pf.is_user_editable)
        .map(pf => {
          const match = allFields.find(af => af.id === pf.field_id);
          return match || { id: pf.field_id, name: pf.field_name, field_type: pf.field_type, is_native: !!pf.is_native };
        });

      // Build non-locked fields from initialFilters (excluding any that are now locked)
      const nonLockedFields = initialFilters
        .filter(f => !lockedFieldIds.has(f.field_id))
        .map(f => {
          const match = allFields.find(af => af.id === f.field_id);
          return match || { id: f.field_id, name: f.field_name, field_type: f.field_type, is_native: !!f.is_native };
        });

      setSelectedFields([...lockedFields, ...nonLockedFields]);
    }
  }, [open, initialFilters, prefilters, allFields, lockedFieldIds]);

  const handleClose = () => {
    const result: EoFilterConfig[] = selectedFields.map(f => ({
      field_id: f.id,
      field_name: f.name,
      field_type: f.field_type,
      is_native: f.is_native || undefined,
      is_locked: lockedFieldIds.has(f.id) || undefined,
    }));
    onSave(result);
    onOpenChange(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'available') {
      setActiveItem({ id: data.field.id, name: data.field.name });
    } else {
      const f = selectedFields.find(sf => sf.id === event.active.id);
      if (f) setActiveItem({ id: f.id, name: f.name });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    const data = active.data.current;
    if (data?.type === 'available') {
      if (over) {
        const field = data.field as FieldItem;
        if (!selectedFields.some(f => f.id === field.id)) {
          setSelectedFields(prev => [...prev, field]);
        }
      }
      return;
    }

    if (!over || active.id === over.id) return;
    const oldIndex = selectedFields.findIndex(f => f.id === active.id);
    const newIndex = selectedFields.findIndex(f => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setSelectedFields(arrayMove(selectedFields, oldIndex, newIndex));
    }
  };

  const handleAdd = (field: FieldItem) => {
    if (selectedFields.some(f => f.id === field.id)) return;
    setSelectedFields(prev => [...prev, field]);
  };

  const handleRemove = (id: string) => {
    if (lockedFieldIds.has(id)) return;
    setSelectedFields(prev => prev.filter(f => f.id !== id));
  };

  if (!open) return null;

  const selectedIds = new Set(selectedFields.map(f => f.id));
  const availableFields = allFields.filter(f => !selectedIds.has(f.id));

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Filter className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Configuration des filtres EO</h3>
          <p className="text-xs text-muted-foreground">Glissez-déposez ou cliquez pour configurer</p>
        </div>
      </div>

      {/* DnD panels */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-2 divide-x min-h-0">
          {/* Left – Available */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b flex items-center gap-2">
              <FilterX className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Disponibles</span>
              <span className="text-xs text-muted-foreground">{availableFields.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {availableFields.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Tous les filtres sont activés
                </p>
              ) : (
                <div className="space-y-0.5">
                  {availableFields.map(f => (
                    <DraggableAvailableItem
                      key={f.id}
                      field={f}
                      onAdd={() => handleAdd(f)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right – Selected */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Actifs</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedFields.length} filtre{selectedFields.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <DroppableZone isEmpty={selectedFields.length === 0}>
                <SortableContext
                  items={selectedFields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {selectedFields.map(f => (
                      <SortableSelectedItem
                        key={f.id}
                        field={f}
                        isLocked={lockedFieldIds.has(f.id)}
                        onRemove={() => handleRemove(f.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DroppableZone>
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
