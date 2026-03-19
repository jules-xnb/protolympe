import { useState, useEffect } from 'react';
import { Trash2, Link2 } from 'lucide-react';
import { DragHandle } from '@/components/ui/drag-handle';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { DataTableColumnConfig } from './types';

interface FieldDef {
  id: string;
  name: string;
  field_type: string;
  display_order: number;
}

interface RelatedBO {
  sourceFieldId: string;
  sourceFieldName: string;
  relatedBoId: string;
  relatedBoName: string;
  fields: FieldDef[];
}

interface ColumnsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: DataTableColumnConfig[];
  directFields: FieldDef[];
  relatedBOs: RelatedBO[];
  onSave: (columns: DataTableColumnConfig[]) => void;
}

// Sortable column item for reordering - simplified without role configuration
interface SortableColumnItemProps {
  column: DataTableColumnConfig;
  onRemove: () => void;
}

function SortableColumnItem({ column, onRemove }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: column.source_field_id ? `${column.source_field_id}-${column.field_id}` : column.field_id 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isRelated = !!column.source_field_id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border bg-background",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      <DragHandle attributes={attributes} listeners={listeners} />
      
      {isRelated && <Link2 className="h-3.5 w-3.5 text-primary shrink-0" />}
      <span className="font-medium text-sm truncate flex-1">{column.field_name}</span>
      {isRelated && (
        <Chip variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 shrink-0">
          {column.source_field_name}
        </Chip>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function ColumnsConfigDialog({
  open,
  onOpenChange,
  columns: initialColumns,
  directFields,
  relatedBOs,
  onSave,
}: ColumnsConfigDialogProps) {
  const [columns, setColumns] = useState<DataTableColumnConfig[]>(initialColumns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setColumns(initialColumns);
    }
  }, [open, initialColumns]);

  const isDirectColumnSelected = (fieldId: string) => 
    columns.some(c => c.field_id === fieldId && !c.source_field_id);

  const isRelatedColumnSelected = (sourceFieldId: string, fieldId: string) =>
    columns.some(c => c.source_field_id === sourceFieldId && c.field_id === fieldId);

  const handleToggleDirectColumn = (field: FieldDef, checked: boolean) => {
    if (checked) {
      setColumns([...columns, {
        field_id: field.id,
        field_name: field.name,
        sortable: true,
      }]);
    } else {
      setColumns(columns.filter(c => !(c.field_id === field.id && !c.source_field_id)));
    }
  };

  const handleToggleRelatedColumn = (relatedBO: RelatedBO, field: FieldDef, checked: boolean) => {
    if (checked) {
      setColumns([...columns, {
        field_id: field.id,
        field_name: field.name,
        sortable: false,
        source_field_id: relatedBO.sourceFieldId,
        source_field_name: relatedBO.sourceFieldName,
        related_bo_id: relatedBO.relatedBoId,
        related_bo_name: relatedBO.relatedBoName,
      }]);
    } else {
      setColumns(columns.filter(c => 
        !(c.source_field_id === relatedBO.sourceFieldId && c.field_id === field.id)
      ));
    }
  };

  const handleSelectAllDirect = () => {
    const otherColumns = columns.filter(c => c.source_field_id);
    const directCols = directFields.map(f => ({
      field_id: f.id,
      field_name: f.name,
      sortable: true,
    }));
    setColumns([...directCols, ...otherColumns]);
  };

  const handleSelectNoneDirect = () => {
    setColumns(columns.filter(c => c.source_field_id));
  };

  const handleSelectAllRelated = (relatedBO: RelatedBO) => {
    const otherColumns = columns.filter(c => c.source_field_id !== relatedBO.sourceFieldId);
    const relatedCols = relatedBO.fields.map(f => ({
      field_id: f.id,
      field_name: f.name,
      sortable: false,
      source_field_id: relatedBO.sourceFieldId,
      source_field_name: relatedBO.sourceFieldName,
      related_bo_id: relatedBO.relatedBoId,
      related_bo_name: relatedBO.relatedBoName,
    }));
    setColumns([...otherColumns, ...relatedCols]);
  };

  const handleSelectNoneRelated = (relatedBO: RelatedBO) => {
    setColumns(columns.filter(c => c.source_field_id !== relatedBO.sourceFieldId));
  };

  const handleRemoveColumn = (column: DataTableColumnConfig) => {
    const key = column.source_field_id 
      ? `${column.source_field_id}-${column.field_id}` 
      : column.field_id;
    setColumns(columns.filter(c => {
      const cKey = c.source_field_id ? `${c.source_field_id}-${c.field_id}` : c.field_id;
      return cKey !== key;
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex(c => {
      const key = c.source_field_id ? `${c.source_field_id}-${c.field_id}` : c.field_id;
      return key === active.id;
    });
    const newIndex = columns.findIndex(c => {
      const key = c.source_field_id ? `${c.source_field_id}-${c.field_id}` : c.field_id;
      return key === over.id;
    });

    if (oldIndex !== -1 && newIndex !== -1) {
      setColumns(arrayMove(columns, oldIndex, newIndex));
    }
  };

  // Auto-save when closing the dialog
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onSave(columns);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configuration des colonnes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
          {/* Left: Field selection */}
          <div className="flex flex-col min-h-0 space-y-4">
            <Label className="text-xs text-muted-foreground">
              Champs disponibles
            </Label>
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-3 space-y-4">
                {/* Direct fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">
                      Champs directs
                    </Label>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={handleSelectAllDirect}>
                        Tout
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={handleSelectNoneDirect}>
                        Aucun
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {directFields.map((field) => (
                      <label
                        key={field.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={isDirectColumnSelected(field.id)}
                          onCheckedChange={(checked) => handleToggleDirectColumn(field, checked as boolean)}
                        />
                        <span className="text-sm flex-1 truncate">{field.name}</span>
                        <Chip variant="outline" className="text-xs">{field.field_type}</Chip>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Related BOs */}
                {relatedBOs.map((relatedBO) => (
                  <div key={relatedBO.sourceFieldId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 text-primary" />
                        <Label className="text-xs font-medium uppercase text-muted-foreground">
                          {relatedBO.sourceFieldName}
                        </Label>
                        <Chip variant="outline" className="text-xs bg-primary/5 text-primary">
                          {relatedBO.relatedBoName}
                        </Chip>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => handleSelectAllRelated(relatedBO)}>
                          Tout
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => handleSelectNoneRelated(relatedBO)}>
                          Aucun
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-0.5 pl-2 border-l-2 border-primary/20">
                      {relatedBO.fields.map((field) => (
                        <label
                          key={field.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={isRelatedColumnSelected(relatedBO.sourceFieldId, field.id)}
                            onCheckedChange={(checked) => handleToggleRelatedColumn(relatedBO, field, checked as boolean)}
                          />
                          <span className="text-sm flex-1 truncate">{field.name}</span>
                          <Chip variant="outline" className="text-xs">{field.field_type}</Chip>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Column order */}
          <div className="flex flex-col min-h-0 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Colonnes affichées ({columns.length})
              </Label>
            </div>
            <ScrollArea className="flex-1 border rounded-lg bg-muted/20">
              <div className="p-3">
                {columns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Sélectionnez des champs à afficher
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={columns.map(c => c.source_field_id ? `${c.source_field_id}-${c.field_id}` : c.field_id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {columns.map((column) => (
                          <SortableColumnItem
                            key={column.source_field_id ? `${column.source_field_id}-${column.field_id}` : column.field_id}
                            column={column}
                            onRemove={() => handleRemoveColumn(column)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
