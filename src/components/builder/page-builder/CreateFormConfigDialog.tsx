import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FloatingInput } from '@/components/ui/floating-input';
import { Chip } from '@/components/ui/chip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { CreateFormFieldConfig, CreateButtonConfig } from './types';
import { SortableFieldItem } from './SortableFieldItem';
import type { FieldDef } from './sortable-field-utils';

interface CreateFormConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CreateButtonConfig;
  fieldDefinitions: FieldDef[];
  onSave: (config: CreateButtonConfig) => void;
}

export function CreateFormConfigDialog({
  open,
  onOpenChange,
  config,
  fieldDefinitions,
  onSave,
}: CreateFormConfigDialogProps) {
  const [buttonLabel, setButtonLabel] = useState(config.label || 'Nouveau');
  const [formFields, setFormFields] = useState<CreateFormFieldConfig[]>(config.form_fields || []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Reset state when dialog opens - auto-add required fields
  useEffect(() => {
    if (open) {
      setButtonLabel(config.label || 'Nouveau');

      // Start with existing form fields
      const initialFields = config.form_fields || [];

      // Auto-add required fields that are not already in the form
      const existingFieldIds = new Set(initialFields.map(f => f.field_id));
      const requiredFieldsToAdd = fieldDefinitions
        .filter(fd => fd.is_required && !existingFieldIds.has(fd.id))
        .map(fd => ({
          field_id: fd.id,
          field_name: fd.name,
          field_type: fd.field_type,
          is_required: true, // Mark as required in form config too
        }));

      setFormFields([...initialFields, ...requiredFieldsToAdd]);
    }
  }, [open, config, fieldDefinitions]);

  // Available fields (not yet added)
  const availableFields = fieldDefinitions.filter(
    fd => !formFields.some(ff => ff.field_id === fd.id)
  );

  const handleAddField = (fieldDef: FieldDef) => {
    const newField: CreateFormFieldConfig = {
      field_id: fieldDef.id,
      field_name: fieldDef.name,
      field_type: fieldDef.field_type,
      is_required: fieldDef.is_required, // Preserve required status from definition
    };
    setFormFields([...formFields, newField]);
  };

  const handleRemoveField = (fieldId: string) => {
    setFormFields(formFields.filter(f => f.field_id !== fieldId));
  };

  const handleUpdateField = (fieldId: string, updates: Partial<CreateFormFieldConfig>) => {
    setFormFields(formFields.map(f =>
      f.field_id === fieldId ? { ...f, ...updates } : f
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = formFields.findIndex(f => f.field_id === active.id);
    const newIndex = formFields.findIndex(f => f.field_id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setFormFields(arrayMove(formFields, oldIndex, newIndex));
    }
  };

  // Auto-save when closing the dialog
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onSave({
        ...config,
        label: buttonLabel,
        form_fields: formFields,
      });
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configuration du formulaire de cr\u00e9ation</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-4">
          {/* Button label */}
          <div className="shrink-0">
            <FloatingInput
              label="Libellé du bouton"
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
            />
          </div>

          <Separator />

          {/* Two-column layout: Available fields | Selected fields */}
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
            {/* Available fields */}
            <div className="flex flex-col min-h-0">
              <Label className="text-xs text-muted-foreground mb-2">
                Champs disponibles ({availableFields.length})
              </Label>
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-2 space-y-1">
                  {availableFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Tous les champs sont ajout\u00e9s
                    </p>
                  ) : (
                    availableFields.map((field) => (
                      <Button
                        key={field.id}
                        variant="ghost"
                        type="button"
                        onClick={() => handleAddField(field)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 h-auto text-left rounded hover:bg-muted/50 justify-start"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{field.name}</span>
                        <Chip variant="outline" className="text-xs">{field.field_type}</Chip>
                      </Button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Selected fields */}
            <div className="flex flex-col min-h-0">
              <Label className="text-xs text-muted-foreground mb-2">
                Champs du formulaire ({formFields.length})
              </Label>
              <ScrollArea className="flex-1 border rounded-lg bg-muted/20">
                <div className="p-2">
                  {formFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Cliquez sur un champ pour l'ajouter
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={formFields.map(f => f.field_id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {formFields.map((field) => {
                            const fieldDef = fieldDefinitions.find(fd => fd.id === field.field_id);
                            return (
                              <SortableFieldItem
                                key={field.field_id}
                                field={field}
                                allFormFields={formFields}
                                fieldDefinitions={fieldDefinitions}
                                isDefinitionRequired={fieldDef?.is_required ?? false}
                                onUpdate={(updates) => handleUpdateField(field.field_id, updates)}
                                onRemove={() => handleRemoveField(field.field_id)}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
