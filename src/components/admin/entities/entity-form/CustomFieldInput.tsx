import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

type CustomFieldValue = string | number | boolean | string[] | null;

interface CustomFieldInputProps {
  field: EoFieldDefinition;
  value: CustomFieldValue;
  onChange: (value: CustomFieldValue) => void;
  options: { value: string; label: string }[];
}

export type { CustomFieldValue };

export function CustomFieldInput({
  field,
  value,
  onChange,
  options,
}: CustomFieldInputProps) {
  switch (field.field_type) {
    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || ''}
          className="resize-none"
        />
      );
    case 'number':
      return (
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={field.description || ''}
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
          />
          <span className="text-sm text-muted-foreground">{field.description}</span>
        </div>
      );
    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'multiselect':
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                checked={(value || []).includes(opt.value)}
                onCheckedChange={(checked) => {
                  const current = value || [];
                  if (checked) {
                    onChange([...current, opt.value]);
                  } else {
                    onChange(current.filter((v: string) => v !== opt.value));
                  }
                }}
              />
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
        </div>
      );
    case 'email':
      return (
        <Input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || 'email@exemple.com'}
        />
      );
    case 'url':
      return (
        <Input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || 'https://...'}
        />
      );
    case 'text':
    default:
      return (
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || ''}
        />
      );
  }
}
