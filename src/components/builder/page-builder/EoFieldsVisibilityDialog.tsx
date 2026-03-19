import { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, ArrowLeft, Plus, X, Pencil, PencilOff } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { EoFieldVisibilityConfig, EoFieldKey } from './types';
import { EO_FIELD_DEFINITIONS } from './types';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

/* ── Draggable available item ── */
function DraggableAvailableItem({ id, name, isCustom, onAdd }: { id: string; name: string; isCustom: boolean; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `available-${id}`,
    data: { type: 'available', fieldId: id, fieldName: name, isCustom },
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
      <span className="truncate flex-1">{name}</span>
      {isCustom && <Chip variant="outline" className="text-xs shrink-0">Perso.</Chip>}
    </div>
  );
}

/* ── Sortable visible item ── */
function SortableVisibleItem({ field, label, isCustom, editable, isLocked, onRemove, onToggleEditable }: {
  field: string;
  label: string;
  isCustom: boolean;
  editable: boolean;
  isLocked?: boolean;
  onRemove: () => void;
  onToggleEditable: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field });

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
      <span className="flex-1 text-sm font-medium truncate">{label}</span>
      {isCustom && <Chip variant="outline" className="text-xs shrink-0">Perso.</Chip>}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={editable ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 gap-1 shrink-0 text-xs"
            onClick={onToggleEditable}
          >
            {editable ? <Pencil className="h-3.5 w-3.5" /> : <PencilOff className="h-3.5 w-3.5" />}
            {editable ? 'Éditable' : 'Lecture'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {editable ? 'Cliquer pour passer en lecture seule' : 'Cliquer pour rendre éditable'}
        </TooltipContent>
      </Tooltip>
      {!isLocked && (
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
  const { setNodeRef, isOver } = useDroppable({ id: 'visible-zone' });

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

/* ── Main panel ── */
interface EoFieldsVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldVisibility: EoFieldVisibilityConfig[];
  customFields?: EoFieldDefinition[];
  onSave: (fieldVisibility: EoFieldVisibilityConfig[]) => void;
}

interface FieldDef {
  field: string;
  label: string;
  is_custom: boolean;
  editable: boolean;
}

export function EoFieldsVisibilityDialog({
  open,
  onOpenChange,
  fieldVisibility,
  customFields = [],
  onSave,
}: EoFieldsVisibilityDialogProps) {
  const allFieldDefinitions = useMemo<Omit<FieldDef, 'editable'>[]>(() => {
    const base = EO_FIELD_DEFINITIONS.map(def => ({
      field: def.field,
      label: def.label,
      is_custom: false,
    }));
    const custom = customFields.filter(cf => cf.is_active).map(cf => ({
      field: cf.id,
      label: cf.name,
      is_custom: true,
    }));
    return [...base, ...custom];
  }, [customFields]);

  const [visibleFields, setVisibleFields] = useState<FieldDef[]>([]);
  const [activeItem, setActiveItem] = useState<{ id: string; name: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fields that must always be visible (cannot be removed)
  const ALWAYS_VISIBLE_FIELDS = useMemo(() => new Set(['name']), []);

  useEffect(() => {
    if (open) {
      if (fieldVisibility.length === 0) {
        setVisibleFields(allFieldDefinitions.map(d => ({ ...d, editable: true })));
      } else {
        const ordered: FieldDef[] = [];
        fieldVisibility.forEach(fv => {
          if (fv.visible !== false) {
            const def = allFieldDefinitions.find(d => d.field === fv.field);
            if (def) ordered.push({ ...def, editable: fv.editable !== false });
          }
        });
        // Ensure always-visible fields are present
        for (const fieldKey of ALWAYS_VISIBLE_FIELDS) {
          if (!ordered.some(f => f.field === fieldKey)) {
            const def = allFieldDefinitions.find(d => d.field === fieldKey);
            if (def) ordered.push({ ...def, editable: true });
          }
        }
        setVisibleFields(ordered);
      }
    }
  }, [open, fieldVisibility, allFieldDefinitions, ALWAYS_VISIBLE_FIELDS]);

  const handleClose = () => {
    const visibleMap = new Map(visibleFields.map(f => [f.field, f]));
    const result: EoFieldVisibilityConfig[] = allFieldDefinitions.map(def => {
      const vis = visibleMap.get(def.field);
      return {
        field: def.field as EoFieldKey,
        label: def.label,
        visible: !!vis,
        editable: vis ? vis.editable : true,
        is_custom: def.is_custom,
      };
    });
    onSave(result);
    onOpenChange(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === 'available') {
      setActiveItem({ id: data.fieldId, name: data.fieldName });
    } else {
      const f = visibleFields.find(v => v.field === active.id);
      if (f) setActiveItem({ id: f.field, name: f.label });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    const data = active.data.current;

    if (data?.type === 'available') {
      if (over) {
        const fieldId = data.fieldId as string;
        if (!visibleFields.some(f => f.field === fieldId)) {
          const def = allFieldDefinitions.find(d => d.field === fieldId);
          if (def) setVisibleFields(prev => [...prev, { ...def, editable: true }]);
        }
      }
      return;
    }

    if (!over || active.id === over.id) return;
    const oldIndex = visibleFields.findIndex(f => f.field === active.id);
    const newIndex = visibleFields.findIndex(f => f.field === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setVisibleFields(arrayMove(visibleFields, oldIndex, newIndex));
    }
  };

  const handleAdd = (fieldDef: Omit<FieldDef, 'editable'>) => {
    if (visibleFields.some(f => f.field === fieldDef.field)) return;
    setVisibleFields(prev => [...prev, { ...fieldDef, editable: true }]);
  };

  const handleRemove = (field: string) => {
    if (ALWAYS_VISIBLE_FIELDS.has(field)) return; // Cannot remove always-visible fields
    setVisibleFields(prev => prev.filter(f => f.field !== field));
  };

  const handleToggleEditable = (field: string) => {
    setVisibleFields(prev => prev.map(f =>
      f.field === field ? { ...f, editable: !f.editable } : f
    ));
  };

  const allEditable = visibleFields.length > 0 && visibleFields.every(f => f.editable);

  const handleToggleAll = () => {
    const newEditable = !allEditable;
    setVisibleFields(prev => prev.map(f => ({ ...f, editable: newEditable })));
  };

  if (!open) return null;

  const visibleFieldIds = new Set(visibleFields.map(f => f.field));
  const hiddenFields = allFieldDefinitions.filter(f => !visibleFieldIds.has(f.field) && !ALWAYS_VISIBLE_FIELDS.has(f.field));

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Eye className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Visibilité des champs</h3>
          <p className="text-xs text-muted-foreground">Glissez-déposez ou cliquez pour configurer</p>
        </div>
        {visibleFields.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleToggleAll}
          >
            {allEditable ? <PencilOff className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {allEditable ? 'Tout en lecture seule' : 'Tout éditable'}
          </Button>
        )}
      </div>

      {/* DnD panels */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-2 divide-x min-h-0">
          {/* Left – Hidden fields */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b flex items-center gap-2">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Masqués</span>
              <span className="text-xs text-muted-foreground">{hiddenFields.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {hiddenFields.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Tous les champs sont visibles
                </p>
              ) : (
                <div className="space-y-2">
                  {hiddenFields.map(f => (
                    <DraggableAvailableItem
                      key={f.field}
                      id={f.field}
                      name={f.label}
                      isCustom={f.is_custom}
                      onAdd={() => handleAdd(f)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right – Visible fields */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Visibles</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {visibleFields.length} champ{visibleFields.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <DroppableZone isEmpty={visibleFields.length === 0}>
                <SortableContext
                  items={visibleFields.map(f => f.field)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {visibleFields.map(f => (
                      <SortableVisibleItem
                        key={f.field}
                        field={f.field}
                        label={f.label}
                        isCustom={f.is_custom}
                        editable={f.editable}
                        isLocked={ALWAYS_VISIBLE_FIELDS.has(f.field)}
                        onRemove={() => handleRemove(f.field)}
                        onToggleEditable={() => handleToggleEditable(f.field)}
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
