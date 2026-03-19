import { Label } from '@/components/ui/label';
import { SearchableSelect, type SearchableSelectGroup } from '@/components/ui/searchable-select';
import type { FieldTypeEntry } from '@/lib/field-type-registry';

interface FieldTypeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  groupedFieldTypes: Record<string, FieldTypeEntry[]>;
}

export function FieldTypeSelector({ value, onValueChange, groupedFieldTypes }: FieldTypeSelectorProps) {
  const groups: SearchableSelectGroup[] = Object.entries(groupedFieldTypes).map(([group, types]) => ({
    label: group,
    options: types.map((type) => ({
      value: type.value,
      label: type.label,
      icon: type.icon,
      secondaryLabel: type.group,
    })),
  }));

  return (
    <div className="space-y-2">
      <Label>Type de champ</Label>
      <SearchableSelect
        value={value}
        onValueChange={onValueChange}
        groups={groups}
        placeholder="Sélectionner un type..."
        searchPlaceholder="Rechercher un type..."
      />
    </div>
  );
}
