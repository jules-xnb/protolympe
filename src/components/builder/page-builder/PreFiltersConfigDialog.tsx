import { useState } from 'react';
import { Plus, Trash2, Filter, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FloatingInput } from '@/components/ui/floating-input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PreFilterConfig, PreFilterOperator } from './types';

interface FieldDef {
  id: string;
  name: string;
  field_type: string;
}

interface RelatedBO {
  sourceFieldId: string;
  sourceFieldName: string;
  relatedBoId: string;
  relatedBoName: string;
  fields: FieldDef[];
}

interface PreFiltersConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilters: PreFilterConfig[];
  directFields: FieldDef[];
  relatedBOs: RelatedBO[];
  onChange: (prefilters: PreFilterConfig[]) => void;
}

const OPERATOR_LABELS: Record<PreFilterOperator, string> = {
  equals: 'Égal à',
  not_equals: 'Différent de',
  greater_than: 'Supérieur à',
  less_than: 'Inférieur à',
  greater_or_equal: 'Supérieur ou égal à',
  less_or_equal: 'Inférieur ou égal à',
  contains: 'Contient',
  not_contains: 'Ne contient pas',
  is_empty: 'Est vide',
  is_not_empty: 'N\'est pas vide',
};

const NUMERIC_OPERATORS: PreFilterOperator[] = [
  'equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'is_empty', 'is_not_empty'
];

const TEXT_OPERATORS: PreFilterOperator[] = [
  'equals', 'not_equals', 'contains', 'not_contains', 'is_empty', 'is_not_empty'
];

const BOOLEAN_OPERATORS: PreFilterOperator[] = [
  'equals', 'not_equals'
];

const SELECT_OPERATORS: PreFilterOperator[] = [
  'equals', 'not_equals', 'is_empty', 'is_not_empty'
];

function getOperatorsForFieldType(fieldType: string): PreFilterOperator[] {
  if (['number', 'decimal', 'currency', 'calculated'].includes(fieldType)) {
    return NUMERIC_OPERATORS;
  }
  if (['checkbox'].includes(fieldType)) {
    return BOOLEAN_OPERATORS;
  }
  if (['select', 'multiselect', 'referential', 'user', 'eo', 'object_reference'].includes(fieldType)) {
    return SELECT_OPERATORS;
  }
  return TEXT_OPERATORS;
}

function needsValueInput(operator: PreFilterOperator): boolean {
  return !['is_empty', 'is_not_empty'].includes(operator);
}

function getAllFields(directFields: FieldDef[], relatedBOs: RelatedBO[]): Array<{
  field: FieldDef;
  sourceFieldId?: string;
  sourceFieldName?: string;
  displayName: string;
}> {
  const result: Array<{
    field: FieldDef;
    sourceFieldId?: string;
    sourceFieldName?: string;
    displayName: string;
  }> = [];

  directFields.forEach(f => {
    result.push({
      field: f,
      displayName: f.name,
    });
  });

  relatedBOs.forEach(relatedBO => {
    relatedBO.fields.forEach(f => {
      result.push({
        field: f,
        sourceFieldId: relatedBO.sourceFieldId,
        sourceFieldName: relatedBO.sourceFieldName,
        displayName: `${relatedBO.sourceFieldName}.${f.name}`,
      });
    });
  });

  return result;
}

export function PreFiltersConfigDialog({
  open,
  onOpenChange,
  prefilters,
  directFields,
  relatedBOs,
  onChange,
}: PreFiltersConfigDialogProps) {
  const [localPrefilters, setLocalPrefilters] = useState<PreFilterConfig[]>(prefilters);
  
  const allFields = getAllFields(directFields, relatedBOs);

  // Reset local state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalPrefilters(prefilters);
    }
    onOpenChange(isOpen);
  };

  const handleAddPrefilter = () => {
    if (allFields.length === 0) return;
    
    const firstField = allFields[0];
    const operators = getOperatorsForFieldType(firstField.field.field_type);
    
    const newPrefilter: PreFilterConfig = {
      field_id: firstField.field.id,
      field_name: firstField.field.name,
      field_type: firstField.field.field_type,
      operator: operators[0],
      value: '',
      source_field_id: firstField.sourceFieldId,
      source_field_name: firstField.sourceFieldName,
    };
    
    setLocalPrefilters([...localPrefilters, newPrefilter]);
  };

  const handleUpdatePrefilter = (index: number, updates: Partial<PreFilterConfig>) => {
    const updated = localPrefilters.map((pf, i) => {
      if (i !== index) return pf;
      return { ...pf, ...updates };
    });
    setLocalPrefilters(updated);
  };

  const handleChangeField = (index: number, fieldKey: string) => {
    const parts = fieldKey.split(':');
    let targetField: typeof allFields[0] | undefined;
    
    if (parts.length === 2) {
      targetField = allFields.find(f => f.sourceFieldId === parts[0] && f.field.id === parts[1]);
    } else {
      targetField = allFields.find(f => !f.sourceFieldId && f.field.id === parts[0]);
    }
    
    if (!targetField) return;
    
    const operators = getOperatorsForFieldType(targetField.field.field_type);
    const currentOperator = localPrefilters[index].operator;
    
    handleUpdatePrefilter(index, {
      field_id: targetField.field.id,
      field_name: targetField.field.name,
      field_type: targetField.field.field_type,
      source_field_id: targetField.sourceFieldId,
      source_field_name: targetField.sourceFieldName,
      operator: operators.includes(currentOperator) ? currentOperator : operators[0],
      value: '',
    });
  };

  const handleRemovePrefilter = (index: number) => {
    setLocalPrefilters(localPrefilters.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onChange(localPrefilters);
    onOpenChange(false);
  };

  const getFieldKey = (pf: PreFilterConfig) => {
    return pf.source_field_id ? `${pf.source_field_id}:${pf.field_id}` : pf.field_id;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width)] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Préfiltres
          </DialogTitle>
          <DialogDescription>
            Filtres fixes appliqués automatiquement. L'utilisateur ne peut pas les modifier.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {localPrefilters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun préfiltre configuré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localPrefilters.map((pf, index) => {
                const operators = getOperatorsForFieldType(pf.field_type);
                
                return (
                  <div 
                    key={index}
                    className="p-3 border rounded-lg bg-muted/20 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pf.source_field_id && (
                          <Link2 className="h-3 w-3 text-primary" />
                        )}
                        <span className="text-sm font-medium">
                          {pf.source_field_name ? `${pf.source_field_name}.` : ''}{pf.field_name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemovePrefilter(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Champ</Label>
                        <Select
                          value={getFieldKey(pf)}
                          onValueChange={(value) => handleChangeField(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {directFields.length > 0 && (
                              <>
                                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                  Champs directs
                                </div>
                                {directFields.map((f) => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.name}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                            
                            {relatedBOs.map((relatedBO) => (
                              relatedBO.fields.length > 0 && (
                                <div key={relatedBO.sourceFieldId}>
                                  <Separator className="my-1" />
                                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <Link2 className="h-3 w-3" />
                                    {relatedBO.sourceFieldName}
                                  </div>
                                  {relatedBO.fields.map((f) => (
                                    <SelectItem 
                                      key={`${relatedBO.sourceFieldId}:${f.id}`} 
                                      value={`${relatedBO.sourceFieldId}:${f.id}`}
                                    >
                                      {f.name}
                                    </SelectItem>
                                  ))}
                                </div>
                              )
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Opérateur</Label>
                        <Select
                          value={pf.operator}
                          onValueChange={(value) => handleUpdatePrefilter(index, { operator: value as PreFilterOperator })}
                        >
                          <SelectTrigger>
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
                      </div>

                      {needsValueInput(pf.operator) && (
                        <div className="space-y-1.5">
                          {pf.field_type === 'checkbox' ? (
                            <>
                              <Label className="text-xs">Valeur</Label>
                              <Select
                                value={pf.value?.toString() || 'true'}
                                onValueChange={(value) => handleUpdatePrefilter(index, { value: value === 'true' })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Oui</SelectItem>
                                  <SelectItem value="false">Non</SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          ) : (
                            <FloatingInput
                              label="Valeur"
                              value={pf.value?.toString() || ''}
                              onChange={(e) => handleUpdatePrefilter(index, {
                                value: ['number', 'decimal', 'currency'].includes(pf.field_type)
                                  ? parseFloat(e.target.value) || e.target.value
                                  : e.target.value
                              })}
                              type={['number', 'decimal', 'currency'].includes(pf.field_type) ? 'number' : 'text'}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handleAddPrefilter}
            disabled={allFields.length === 0}
          >
            Ajouter un filtre
            <Plus className="h-4 w-4" />
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
