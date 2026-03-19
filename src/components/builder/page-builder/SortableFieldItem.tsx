import { useState } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { DragHandle } from '@/components/ui/drag-handle';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CreateFormFieldConfig, FieldVisibilityCondition } from './types';
import { OPERATOR_LABELS, getOperatorsForFieldType, needsValueInput, type FieldDef } from './sortable-field-utils';

export interface SortableFieldItemProps {
  field: CreateFormFieldConfig;
  allFormFields: CreateFormFieldConfig[];
  fieldDefinitions: FieldDef[];
  isDefinitionRequired: boolean; // Whether this field is required in the BO definition
  onUpdate: (updates: Partial<CreateFormFieldConfig>) => void;
  onRemove: () => void;
}

// ── Component ───────────────────────────────────────────────────────────

export function SortableFieldItem({ field, allFormFields, fieldDefinitions, isDefinitionRequired, onUpdate, onRemove }: SortableFieldItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.field_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasConditions = (field.visibility_conditions?.length || 0) > 0;
  const otherFields = allFormFields.filter(f => f.field_id !== field.field_id);

  const handleAddCondition = () => {
    if (otherFields.length === 0) return;

    const firstField = otherFields[0];
    const fieldDef = fieldDefinitions.find(fd => fd.id === firstField.field_id);
    const operators = getOperatorsForFieldType(fieldDef?.field_type || 'text');

    const newCondition: FieldVisibilityCondition = {
      source_field_id: firstField.field_id,
      source_field_name: firstField.field_name,
      operator: operators[0],
      value: '',
    };

    onUpdate({
      visibility_conditions: [...(field.visibility_conditions || []), newCondition],
    });
  };

  const handleUpdateCondition = (index: number, updates: Partial<FieldVisibilityCondition>) => {
    const conditions = field.visibility_conditions || [];
    const updatedConditions = conditions.map((c, i) => {
      if (i !== index) return c;

      if (updates.source_field_id && updates.source_field_id !== c.source_field_id) {
        const sourceField = allFormFields.find(f => f.field_id === updates.source_field_id);
        const fieldDef = fieldDefinitions.find(fd => fd.id === updates.source_field_id);
        const operators = getOperatorsForFieldType(fieldDef?.field_type || 'text');

        return {
          ...c,
          source_field_id: updates.source_field_id,
          source_field_name: sourceField?.field_name,
          operator: operators.includes(c.operator) ? c.operator : operators[0],
          value: '',
        };
      }

      return { ...c, ...updates };
    });

    onUpdate({ visibility_conditions: updatedConditions });
  };

  const handleRemoveCondition = (index: number) => {
    const conditions = field.visibility_conditions || [];
    onUpdate({
      visibility_conditions: conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-background",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 px-3 py-2">
          <DragHandle attributes={attributes} listeners={listeners} />

          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              type="button"
              className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 -my-2 py-2 rounded h-auto justify-start"
            >
              <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
              <span className="font-medium text-sm">{field.field_name}</span>
              <Chip variant="outline" className="text-xs">{field.field_type}</Chip>
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-1">
            {field.is_hidden && (
              <Chip variant="outline" className="text-xs px-1.5 py-0 bg-muted text-muted-foreground">
                Cach\u00e9
              </Chip>
            )}
            {field.is_readonly && !field.is_hidden && (
              <Chip variant="outline" className="text-xs px-1.5 py-0 bg-muted/50 text-muted-foreground">
                Lecture
              </Chip>
            )}
            {field.is_required && (
              <Chip variant="default" className="text-xs px-1.5 py-0">Requis</Chip>
            )}
            {field.use_current_user && (
              <Chip variant="outline" className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                User
              </Chip>
            )}
            {field.use_current_user_eo && (
              <Chip variant="outline" className="text-xs px-1.5 py-0 bg-accent text-accent-foreground">
                EO
              </Chip>
            )}
            {hasConditions && (
              <Chip variant="outline" className="text-xs px-1.5 py-0">
                {field.visibility_conditions?.length} cond.
              </Chip>
            )}
            {!isDefinitionRequired && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onRemove}
                title="Retirer du formulaire"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-4 border-t mt-2">
            {/* Display mode */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={!field.is_hidden && !field.is_readonly ? 'default' : 'outline'}
                size="sm"
                type="button"
                onClick={() => onUpdate({ is_hidden: false, is_readonly: false })}
                className="text-xs py-1.5 px-2 h-auto"
              >
                \u00c9ditable
              </Button>
              <Button
                variant={!field.is_hidden && field.is_readonly ? 'default' : 'outline'}
                size="sm"
                type="button"
                onClick={() => onUpdate({ is_hidden: false, is_readonly: true })}
                className="text-xs py-1.5 px-2 h-auto"
              >
                Lecture seule
              </Button>
              <Button
                variant={field.is_hidden ? 'default' : 'outline'}
                size="sm"
                type="button"
                onClick={() => onUpdate({ is_hidden: true, is_readonly: false })}
                className="text-xs py-1.5 px-2 h-auto"
              >
                Cach\u00e9
              </Button>
            </div>

            {/* Required toggle - only for editable fields */}
            {!field.is_hidden && !field.is_readonly && (
              <div className="flex items-center justify-between">
                <Label className={cn("text-sm font-normal", isDefinitionRequired && "text-muted-foreground")}>
                  Champ obligatoire
                  {isDefinitionRequired && (
                    <span className="text-xs ml-1">(requis par d\u00e9faut)</span>
                  )}
                </Label>
                <Switch
                  checked={field.is_required || false}
                  onCheckedChange={(checked) => onUpdate({ is_required: checked })}
                  disabled={isDefinitionRequired}
                />
              </div>
            )}

            {/* Special options for user_reference */}
            {field.field_type === 'user_reference' && (
              <div className="flex items-center justify-between rounded-md border p-2 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">Utilisateur courant</Label>
                  <p className="text-xs text-muted-foreground">
                    Pr\u00e9remplir avec l'utilisateur connect\u00e9
                  </p>
                </div>
                <Switch
                  checked={field.use_current_user || false}
                  onCheckedChange={(checked) => onUpdate({
                    use_current_user: checked,
                    default_value: checked ? undefined : field.default_value
                  })}
                />
              </div>
            )}

            {/* Special options for eo_reference */}
            {field.field_type === 'eo_reference' && (
              <div className="flex items-center justify-between rounded-md border p-2 bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">EO de l'utilisateur</Label>
                  <p className="text-xs text-muted-foreground">
                    Pr\u00e9remplir avec l'EO de l'utilisateur connect\u00e9
                  </p>
                </div>
                <Switch
                  checked={field.use_current_user_eo || false}
                  onCheckedChange={(checked) => onUpdate({
                    use_current_user_eo: checked,
                    default_value: checked ? undefined : field.default_value
                  })}
                />
              </div>
            )}

            {/* Default value - only if not using current user/eo */}
            {!field.use_current_user && !field.use_current_user_eo && (
              <div className="space-y-1.5">
                <Label className="text-xs">Valeur par d\u00e9faut</Label>
                <Input
                  value={field.default_value || ''}
                  onChange={(e) => onUpdate({ default_value: e.target.value || undefined })}
                  placeholder="Aucune"
                  className="h-8"
                />
              </div>
            )}

            <Separator />

            {/* Visibility conditions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Conditions d'affichage</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={handleAddCondition}
                  disabled={otherFields.length === 0}
                >
                  Ajouter
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {(field.visibility_conditions?.length || 0) === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Toujours visible
                </p>
              ) : (
                <div className="space-y-2">
                  {field.visibility_conditions?.map((condition, index) => {
                    const sourceFieldDef = fieldDefinitions.find(fd => fd.id === condition.source_field_id);
                    const operators = getOperatorsForFieldType(sourceFieldDef?.field_type || 'text');

                    return (
                      <div key={index} className="p-2 border rounded bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Si "{condition.source_field_name}"
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => handleRemoveCondition(index)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Select
                            value={condition.source_field_id}
                            onValueChange={(value) => handleUpdateCondition(index, { source_field_id: value })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {otherFields.map((f) => (
                                <SelectItem key={f.field_id} value={f.field_id}>
                                  {f.field_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={condition.operator}
                            onValueChange={(value) => handleUpdateCondition(index, { operator: value as FieldVisibilityCondition['operator'] })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((op) => (
                                <SelectItem key={op} value={op}>
                                  {OPERATOR_LABELS[op]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {needsValueInput(condition.operator) && (
                            <Input
                              className="h-7 text-xs"
                              value={condition.value?.toString() || ''}
                              onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                              placeholder="Valeur"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
