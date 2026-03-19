import { useState } from 'react';
import {
  X as XIcon,
  ChevronsUpDown,
  Check,
} from 'lucide-react';
import type { Liste } from '@/hooks/useListes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { FieldTypeConfigFormData } from './FieldTypeConfig';

interface FieldReferentialPickerProps {
  formData: FieldTypeConfigFormData;
  onFormDataChange: (updater: (prev: FieldTypeConfigFormData) => FieldTypeConfigFormData) => void;
  referentials: Liste[];
  referentialValues: Array<{ id: string; label: string }>;
}

export function FieldReferentialPicker({
  formData,
  onFormDataChange,
  referentials,
  referentialValues,
}: FieldReferentialPickerProps) {
  const [refPopoverOpen, setRefPopoverOpen] = useState(false);
  const [defaultValuePopoverOpen, setDefaultValuePopoverOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label>Liste</Label>
      <Popover open={refPopoverOpen} onOpenChange={setRefPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={refPopoverOpen}
            className="w-full justify-between font-normal"
          >
            {formData.referential_id
              ? referentials.find((r) => r.id === formData.referential_id)?.name || 'Sélectionner une liste'
              : 'Sélectionner une liste'}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher une liste..." />
            <CommandList>
              <CommandEmpty>Aucune liste trouvée</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onFormDataChange((prev) => ({ ...prev, referential_id: null, options: [], default_value: null }));
                    setRefPopoverOpen(false);
                  }}
                >
                  <Check className={cn('h-4 w-4 mr-2', !formData.referential_id ? 'opacity-100' : 'opacity-0')} />
                  Aucune
                </CommandItem>
                {referentials.map((ref) => (
                  <CommandItem
                    key={ref.id}
                    value={ref.name}
                    onSelect={() => {
                      onFormDataChange((prev) => ({ ...prev, referential_id: ref.id, options: [], default_value: null }));
                      setRefPopoverOpen(false);
                    }}
                  >
                    <Check className={cn('h-4 w-4 mr-2', formData.referential_id === ref.id ? 'opacity-100' : 'opacity-0')} />
                    {ref.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">Les valeurs seront issues de cette liste</p>

      {/* Default value picker for referential-based lists */}
      {formData.referential_id && referentialValues.length > 0 && (() => {
        const isMulti = formData.field_type === 'multiselect';
        const selectedIds = isMulti && formData.default_value ? formData.default_value.split(',').filter(Boolean) : [];
        const selectedLabels = isMulti
          ? selectedIds.map(id => referentialValues.find(rv => rv.id === id)?.label).filter(Boolean)
          : [];
        const displayLabel = isMulti
          ? (selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Aucune')
          : (formData.default_value ? referentialValues.find(rv => rv.id === formData.default_value)?.label || 'Aucune' : 'Aucune');
        return (
          <div className="space-y-2 mt-3">
            <Label>Valeur{isMulti ? 's' : ''} par défaut</Label>
            <Popover open={defaultValuePopoverOpen} onOpenChange={setDefaultValuePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={defaultValuePopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">{displayLabel}</span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher une valeur..." />
                  <CommandList>
                    <CommandEmpty>Aucune valeur trouvée</CommandEmpty>
                    <CommandGroup>
                      {!isMulti && (
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            onFormDataChange((prev) => ({ ...prev, default_value: null }));
                            setDefaultValuePopoverOpen(false);
                          }}
                        >
                          <Check className={cn('h-4 w-4 mr-2', !formData.default_value ? 'opacity-100' : 'opacity-0')} />
                          Aucune
                        </CommandItem>
                      )}
                      {referentialValues.map((rv) => {
                        const isSelected = isMulti ? selectedIds.includes(rv.id) : formData.default_value === rv.id;
                        return (
                          <CommandItem
                            key={rv.id}
                            value={rv.label}
                            onSelect={() => {
                              if (isMulti) {
                                onFormDataChange((prev) => {
                                  const ids = prev.default_value ? prev.default_value.split(',').filter(Boolean) : [];
                                  const next = ids.includes(rv.id) ? ids.filter(id => id !== rv.id) : [...ids, rv.id];
                                  return { ...prev, default_value: next.length > 0 ? next.join(',') : null };
                                });
                              } else {
                                onFormDataChange((prev) => ({ ...prev, default_value: rv.id }));
                                setDefaultValuePopoverOpen(false);
                              }
                            }}
                          >
                            <Check className={cn('h-4 w-4 mr-2', isSelected ? 'opacity-100' : 'opacity-0')} />
                            {rv.label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {isMulti && selectedIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => onFormDataChange((prev) => ({ ...prev, default_value: null }))}
              >
                Tout effacer <XIcon className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
