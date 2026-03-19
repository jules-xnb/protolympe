import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { STALE_TIME_LONG_MS } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldVisibilityCondition } from '@/components/builder/page-builder/types';
import { queryKeys } from '@/lib/query-keys';

const OPERATOR_LABELS: Record<FieldVisibilityCondition['operator'], string> = {
  equals: 'Égal à',
  not_equals: 'Différent de',
  greater_than: 'Supérieur à',
  less_than: 'Inférieur à',
  greater_or_equal: '≥',
  less_or_equal: '≤',
  contains: 'Contient',
  is_empty: 'Est vide',
  is_not_empty: "N'est pas vide",
};

function getOperatorsForFieldType(fieldType: string): FieldVisibilityCondition['operator'][] {
  if (['number', 'decimal', 'currency', 'calculated'].includes(fieldType)) {
    return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'];
  }
  if (['checkbox'].includes(fieldType)) {
    return ['equals', 'not_equals'];
  }
  return ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'];
}

function needsValueInput(operator: FieldVisibilityCondition['operator']): boolean {
  return !['is_empty', 'is_not_empty'].includes(operator);
}

interface SectionField {
  id: string;
  name: string;
  field_type: string;
  referential_id?: string | null;
}

interface VisibilityConditionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  conditions: FieldVisibilityCondition[];
  logic: 'AND' | 'OR';
  sectionFields: SectionField[];
  onSave: (conditions: FieldVisibilityCondition[], logic: 'AND' | 'OR') => void;
}

function ConditionValueInput({
  condition,
  sourceField,
  onChange,
}: {
  condition: FieldVisibilityCondition;
  sourceField: SectionField | undefined;
  onChange: (value: string) => void;
}) {
  const referentialId = sourceField?.referential_id;

  const { data: refValues } = useQuery({
    queryKey: queryKeys.referentialValues.byReferential(referentialId!),
    queryFn: async () => {
      return api.get<Array<{ id: string; label: string; code: string }>>(
        `/api/referentials/${referentialId}/values?is_active=true`
      );
    },
    enabled: !!referentialId,
    staleTime: STALE_TIME_LONG_MS,
  });

  if (!needsValueInput(condition.operator)) return null;

  // Boolean/checkbox field → true/false select
  if (sourceField?.field_type === 'checkbox') {
    return (
      <Select value={String(condition.value ?? '')} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Valeur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Oui</SelectItem>
          <SelectItem value="false">Non</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // Referential field → dropdown of referential values
  if (referentialId && refValues && refValues.length > 0) {
    return (
      <Select value={String(condition.value ?? '')} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Valeur" />
        </SelectTrigger>
        <SelectContent>
          {refValues.map((rv) => (
            <SelectItem key={rv.id} value={rv.label}>
              {rv.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Default → text/number input
  return (
    <Input
      className="h-8 text-xs"
      type={['number', 'decimal', 'currency', 'calculated'].includes(sourceField?.field_type || '') ? 'number' : 'text'}
      value={condition.value?.toString() || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Valeur"
    />
  );
}

export function VisibilityConditionDialog({
  open,
  onOpenChange,
  fieldName,
  conditions: initialConditions,
  logic: initialLogic,
  sectionFields,
  onSave,
}: VisibilityConditionDialogProps) {
  const [conditions, setConditions] = useState<FieldVisibilityCondition[]>(initialConditions);
  const [logic, setLogic] = useState<'AND' | 'OR'>(initialLogic);

  // Reset when dialog opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setConditions(initialConditions);
      setLogic(initialLogic);
    }
    onOpenChange(newOpen);
  };

  const handleAdd = () => {
    if (sectionFields.length === 0) return;
    const first = sectionFields[0];
    const operators = getOperatorsForFieldType(first.field_type);
    setConditions([
      ...conditions,
      {
        source_field_id: first.id,
        source_field_name: first.name,
        operator: operators[0],
        value: '',
      },
    ]);
  };

  const handleUpdate = (index: number, updates: Partial<FieldVisibilityCondition>) => {
    setConditions(prev =>
      prev.map((c, i) => {
        if (i !== index) return c;

        // When switching source field, reset operator and value
        if (updates.source_field_id && updates.source_field_id !== c.source_field_id) {
          const sf = sectionFields.find(f => f.id === updates.source_field_id);
          const operators = getOperatorsForFieldType(sf?.field_type || 'text');
          return {
            ...c,
            source_field_id: updates.source_field_id,
            source_field_name: sf?.name,
            operator: operators.includes(c.operator) ? c.operator : operators[0],
            value: '',
          };
        }

        return { ...c, ...updates };
      }),
    );
  };

  const handleRemove = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(conditions, logic);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle className="text-base">
            Conditions de visibilité — {fieldName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {conditions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune condition — le champ est toujours visible.
            </p>
          ) : (
            conditions.map((condition, index) => {
              const sourceField = sectionFields.find(f => f.id === condition.source_field_id);
              const operators = getOperatorsForFieldType(sourceField?.field_type || 'text');

              return (
                <div key={index}>
                  {index > 0 && (
                    <div className="flex justify-center py-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setLogic(logic === 'AND' ? 'OR' : 'AND')}
                        className="text-xs font-medium px-3 py-0.5 h-auto rounded-full border transition-colors hover:bg-muted"
                      >
                        {logic === 'AND' ? 'ET' : 'OU'}
                      </Button>
                    </div>
                  )}
                <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    {/* Source field */}
                    <Select
                      value={condition.source_field_id}
                      onValueChange={(v) => handleUpdate(index, { source_field_id: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionFields.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Operator */}
                    <Select
                      value={condition.operator}
                      onValueChange={(v) => handleUpdate(index, { operator: v as FieldVisibilityCondition['operator'] })}
                    >
                      <SelectTrigger className="h-8 text-xs w-[130px]">
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

                    {/* Value */}
                    <ConditionValueInput
                      condition={condition}
                      sourceField={sourceField}
                      onChange={(v) => handleUpdate(index, { value: v })}
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                </div>
              );
            })
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAdd}
            disabled={sectionFields.length === 0}
          >
            Ajouter une condition
            <Plus className="h-3.5 w-3.5" />
          </Button>

          {conditions.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">
              {logic === 'AND'
                ? 'Toutes les conditions doivent être remplies (ET).'
                : 'Au moins une condition doit être remplie (OU).'}
              {' '}
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="underline hover:text-foreground h-auto p-0"
                onClick={() => setLogic(logic === 'AND' ? 'OR' : 'AND')}
              >
                Passer en {logic === 'AND' ? 'OU' : 'ET'}
              </Button>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
