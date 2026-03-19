import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldTypeEntry } from '@/lib/field-type-registry';

interface FieldTypeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  groupedFieldTypes: Record<string, FieldTypeEntry[]>;
}

export function FieldTypeSelector({ value, onValueChange, groupedFieldTypes }: FieldTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Type de champ</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedFieldTypes).map(([group, types]) => (
            <div key={group}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {group}
              </div>
              {types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
