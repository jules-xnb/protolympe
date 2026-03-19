import { useState } from 'react';
import { Plus, Trash2, Filter, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

interface PreFiltersConfigSectionProps {
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

// Get all available fields (direct + related)
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

  // Direct fields
  directFields.forEach(f => {
    result.push({
      field: f,
      displayName: f.name,
    });
  });

  // Related fields
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

export function PreFiltersConfigSection({
  prefilters,
  directFields,
  relatedBOs,
  onChange,
}: PreFiltersConfigSectionProps) {
  const [isOpen, setIsOpen] = useState(prefilters.length > 0);
  
  const allFields = getAllFields(directFields, relatedBOs);

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
    
    onChange([...prefilters, newPrefilter]);
    setIsOpen(true);
  };

  const handleUpdatePrefilter = (index: number, updates: Partial<PreFilterConfig>) => {
    const updated = prefilters.map((pf, i) => {
      if (i !== index) return pf;
      return { ...pf, ...updates };
    });
    onChange(updated);
  };

  const handleChangeField = (index: number, fieldKey: string) => {
    // fieldKey format: "field_id" or "source_field_id:field_id"
    const parts = fieldKey.split(':');
    let targetField: typeof allFields[0] | undefined;
    
    if (parts.length === 2) {
      // Related field
      targetField = allFields.find(f => f.sourceFieldId === parts[0] && f.field.id === parts[1]);
    } else {
      // Direct field
      targetField = allFields.find(f => !f.sourceFieldId && f.field.id === parts[0]);
    }
    
    if (!targetField) return;
    
    const operators = getOperatorsForFieldType(targetField.field.field_type);
    const currentOperator = prefilters[index].operator;
    
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
    onChange(prefilters.filter((_, i) => i !== index));
  };

  const getFieldKey = (pf: PreFilterConfig) => {
    return pf.source_field_id ? `${pf.source_field_id}:${pf.field_id}` : pf.field_id;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-sm font-normal cursor-pointer">Préfiltres</Label>
              {prefilters.length > 0 && (
                <Chip variant="default" className="text-xs px-1.5 py-0">
                  {prefilters.length}
                </Chip>
              )}
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            onClick={handleAddPrefilter}
            disabled={allFields.length === 0}
          >
            Ajouter
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Filtres fixes appliqués automatiquement. L'utilisateur ne peut pas les modifier.
        </p>

        <CollapsibleContent>
          {prefilters.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
              Aucun préfiltre configuré
            </p>
          ) : (
            <div className="space-y-3">
              {prefilters.map((pf, index) => {
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
                        <span className="text-xs font-medium">
                          {pf.source_field_name ? `${pf.source_field_name}.` : ''}{pf.field_name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemovePrefilter(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Champ</Label>
                        <Select
                          value={getFieldKey(pf)}
                          onValueChange={(value) => handleChangeField(index, value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Direct fields */}
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
                            
                            {/* Related fields */}
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
                          <SelectTrigger className="h-8">
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
                          <Label className="text-xs">Valeur</Label>
                          {pf.field_type === 'checkbox' ? (
                            <Select
                              value={pf.value?.toString() || 'true'}
                              onValueChange={(value) => handleUpdatePrefilter(index, { value: value === 'true' })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Oui</SelectItem>
                                <SelectItem value="false">Non</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              className="h-8"
                              value={pf.value?.toString() || ''}
                              onChange={(e) => handleUpdatePrefilter(index, { 
                                value: ['number', 'decimal', 'currency'].includes(pf.field_type) 
                                  ? parseFloat(e.target.value) || e.target.value
                                  : e.target.value 
                              })}
                              placeholder="Entrez une valeur"
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
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
