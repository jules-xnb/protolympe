import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chip } from '@/components/ui/chip';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Trash2, Filter } from 'lucide-react';
import type { EoPreFilterConfig, PreFilterOperator } from './types';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { useListeWithValues } from '@/hooks/useListes';

const FILTERABLE_FIELD_TYPES = ['text', 'number', 'select', 'boolean', 'date'];

// Native EO fields available for pre-filtering
const NATIVE_FILTERABLE_FIELDS: Array<{ id: string; name: string; field_type: string }> = [
  { id: 'name', name: 'Nom', field_type: 'text' },
  { id: 'code', name: 'Code', field_type: 'text' },
];

const OPERATORS: { value: PreFilterOperator; label: string; types: string[] }[] = [
  { value: 'equals', label: 'Égal à', types: ['text', 'number', 'select', 'boolean', 'date'] },
  { value: 'not_equals', label: 'Différent de', types: ['text', 'number', 'select', 'boolean', 'date'] },
  { value: 'contains', label: 'Contient', types: ['text'] },
  { value: 'not_contains', label: 'Ne contient pas', types: ['text'] },
  { value: 'greater_than', label: 'Supérieur à', types: ['number', 'date'] },
  { value: 'less_than', label: 'Inférieur à', types: ['number', 'date'] },
  { value: 'greater_or_equal', label: 'Supérieur ou égal', types: ['number', 'date'] },
  { value: 'less_or_equal', label: 'Inférieur ou égal', types: ['number', 'date'] },
  { value: 'is_empty', label: 'Est vide', types: ['text', 'number', 'select', 'date'] },
  { value: 'is_not_empty', label: 'N\'est pas vide', types: ['text', 'number', 'select', 'date'] },
];

// Extracted as a separate component to ensure hooks work correctly
function SelectOptionsForField({ 
  referentialId,
  inlineOptions,
  value, 
  onChange 
}: { 
  referentialId?: string;
  inlineOptions?: Array<{ label: string; value: string }>;
  value: string; 
  onChange: (val: string) => void;
}) {
  const { data, isLoading } = useListeWithValues(referentialId);
  
  // Use referential values if available, otherwise use inline options
  const options = referentialId && data?.values 
    ? data.values.map(v => ({ label: v.label, value: v.code }))
    : inlineOptions || [];
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={isLoading ? "Chargement..." : "Sélectionner..."} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 && !isLoading ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Aucune valeur disponible
          </div>
        ) : (
          options.map((opt, idx) => (
            <SelectItem key={opt.value || idx} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

interface EoPreFiltersConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilters: EoPreFilterConfig[];
  customFields: EoFieldDefinition[];
  onSave: (prefilters: EoPreFilterConfig[]) => void;
}

export function EoPreFiltersConfigDialog({
  open,
  onOpenChange,
  prefilters: initialPrefilters,
  customFields,
  onSave,
}: EoPreFiltersConfigDialogProps) {
  const [prefilters, setPrefilters] = useState<EoPreFilterConfig[]>(initialPrefilters);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPrefilters(initialPrefilters);
    }
  }, [open, initialPrefilters]);

  // Auto-save when closing the dialog
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onSave(prefilters);
    }
    onOpenChange(newOpen);
  };

  // Only show filterable custom fields
  const filterableFields = customFields.filter(field => 
    field.is_active && FILTERABLE_FIELD_TYPES.includes(field.field_type)
  );

  // Combined list: native + custom filterable fields
  const allFilterableFields = [
    ...NATIVE_FILTERABLE_FIELDS.map(f => ({
      id: f.id,
      name: f.name,
      field_type: f.field_type,
      is_native: true as const,
      options: null as unknown,
    })),
    ...filterableFields.map(f => ({
      id: f.id,
      name: f.name,
      field_type: f.field_type,
      is_native: false as const,
      options: f.options,
      referential_id: (f.settings as Record<string, unknown> | null)?.referential_id as string | undefined,
    })),
  ];

  const addPrefilter = () => {
    if (allFilterableFields.length === 0) return;
    
    const field = allFilterableFields[0];
    const newPrefilter: EoPreFilterConfig = {
      field_id: field.id,
      field_name: field.name,
      field_type: field.field_type,
      operator: 'equals',
      value: '',
      is_native: field.is_native || undefined,
    };
    setPrefilters([...prefilters, newPrefilter]);
  };

  const updatePrefilter = (index: number, updates: Partial<EoPreFilterConfig>) => {
    const newPrefilters = [...prefilters];
    newPrefilters[index] = { ...newPrefilters[index], ...updates };
    setPrefilters(newPrefilters);
  };

  const removePrefilter = (index: number) => {
    setPrefilters(prefilters.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, fieldId: string) => {
    const field = allFilterableFields.find(f => f.id === fieldId);
    if (field) {
      updatePrefilter(index, {
        field_id: field.id,
        field_name: field.name,
        field_type: field.field_type,
        operator: 'equals',
        value: '',
        is_native: field.is_native || undefined,
      });
    }
  };

  const getOperatorsForType = (fieldType: string) => {
    return OPERATORS.filter(op => op.types.includes(fieldType));
  };

  const renderValueInput = (prefilter: EoPreFilterConfig, index: number) => {
    const field = allFilterableFields.find(f => f.id === prefilter.field_id);
    if (!field) return null;

    // No value needed for is_empty/is_not_empty operators
    if (prefilter.operator === 'is_empty' || prefilter.operator === 'is_not_empty') {
      return null;
    }

    if (field.field_type === 'select') {
      // Use referential_id from settings (new pattern) or fallback to inline options
      const referentialId = 'referential_id' in field ? (field.referential_id as string | undefined) : undefined;
      const fieldOptions = field.options as Array<{ label: string; value: string }> | null;
      const inlineOptions = Array.isArray(fieldOptions) ? fieldOptions : undefined;

      return (
        <SelectOptionsForField
          referentialId={referentialId}
          inlineOptions={!referentialId ? inlineOptions : undefined}
          value={String(prefilter.value || '')}
          onChange={(value) => updatePrefilter(index, { value })}
        />
      );
    }

    if (field.field_type === 'boolean') {
      return (
        <Select
          value={String(prefilter.value || '')}
          onValueChange={(value) => updatePrefilter(index, { value: value === 'true' })}
        >
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

    if (field.field_type === 'number') {
      return (
        <Input
          type="number"
          className="h-8 text-xs"
          value={String(prefilter.value || '')}
          onChange={(e) => updatePrefilter(index, { value: e.target.valueAsNumber || 0 })}
          placeholder="Valeur"
        />
      );
    }

    if (field.field_type === 'date') {
      return (
        <Input
          type="date"
          className="h-8 text-xs"
          value={String(prefilter.value || '')}
          onChange={(e) => updatePrefilter(index, { value: e.target.value })}
        />
      );
    }

    return (
      <Input
        className="h-8 text-xs"
        value={String(prefilter.value || '')}
        onChange={(e) => updatePrefilter(index, { value: e.target.value })}
        placeholder="Valeur"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres par défaut
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          <p className="text-xs text-muted-foreground">
            Configurez les filtres appliqués par défaut. Vous pouvez autoriser l'utilisateur à les modifier.
          </p>

          {allFilterableFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun champ filtrable disponible</p>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 max-h-[300px] border rounded-lg">
                <div className="p-3 space-y-3">
                  {prefilters.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Aucun filtre par défaut configuré
                    </p>
                  ) : (
                    prefilters.map((prefilter, index) => (
                      <div 
                        key={index} 
                        className="p-3 bg-muted/30 rounded-lg space-y-2"
                      >
                        <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-center">
                          {/* Field selector */}
                          <Select
                            value={prefilter.field_id}
                            onValueChange={(value) => handleFieldChange(index, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Champ" />
                            </SelectTrigger>
                            <SelectContent>
                              {allFilterableFields.map(field => (
                                <SelectItem key={field.id} value={field.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{field.name}</span>
                                    <Chip variant="outline" className="text-xs">
                                      {field.field_type}
                                    </Chip>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Operator selector */}
                          <Select
                            value={prefilter.operator}
                            onValueChange={(value) => updatePrefilter(index, { operator: value as PreFilterOperator })}
                          >
                            <SelectTrigger className="h-8 text-xs w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getOperatorsForType(prefilter.field_type).map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Value input */}
                          <div className="min-w-0">
                            {renderValueInput(prefilter, index)}
                          </div>

                          {/* Delete button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => removePrefilter(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* User editable toggle */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/50">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground cursor-help">
                                Modifiable par l'utilisateur
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px]">
                              <p className="text-xs">
                                Si activé, l'utilisateur pourra modifier ou supprimer ce filtre par défaut.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                          <Switch
                            checked={prefilter.is_user_editable === true}
                            onCheckedChange={(checked) => updatePrefilter(index, { is_user_editable: checked })}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addPrefilter}
              >
                Ajouter un filtre par défaut
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
