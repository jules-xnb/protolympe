import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type ClientUser } from '@/hooks/useClientUsers';
import { type UserFieldDefinition } from '@/hooks/useUserFieldDefinitions';
import { computeInitials, type InitialsConfig } from '@/lib/user-initials';
import { Separator } from '@/components/ui/separator';
import { FloatingLabelField } from './FloatingLabelField';

interface UserCustomFieldsSectionProps {
  user: ClientUser;
  fieldDefinitions: UserFieldDefinition[];
  fieldValues: Array<{ field_definition_id: string; value: unknown }>;
  onUpsertValue: (params: { user_id: string; field_definition_id: string; value: unknown }) => void;
}

export function UserCustomFieldsSection({
  user,
  fieldDefinitions,
  fieldValues,
  onUpsertValue,
}: UserCustomFieldsSectionProps) {
  if (fieldDefinitions.length === 0) return null;

  return (
    <>
      <Separator />
      <div className="space-y-3">
        {fieldDefinitions.map((fieldDef) => {
          const fv = fieldValues.find(v => v.field_definition_id === fieldDef.id);
          const rawValue = fv?.value ?? fieldDef.default_value ?? null;
          const isBooleanField = fieldDef.field_type === 'checkbox' || fieldDef.field_type === 'boolean';
          const displayVal = (rawValue != null && (isBooleanField || rawValue !== false)) ? String(rawValue) : '';

          const handleSave = (newValue: unknown) => {
            onUpsertValue({ user_id: user.user_id, field_definition_id: fieldDef.id, value: newValue });
          };

          // Initials: computed read-only
          if (fieldDef.field_type === 'initials') {
            const config = (fieldDef.settings?.initials_config || {}) as Partial<InitialsConfig>;
            const initials = computeInitials(user.profiles?.full_name || '', config);
            return (
              <FloatingLabelField
                key={fieldDef.id}
                label={fieldDef.name}
                value={initials || ''}
                readOnly
              />
            );
          }

          // Boolean / checkbox
          if (fieldDef.field_type === 'checkbox' || fieldDef.field_type === 'boolean') {
            const checked = displayVal === 'true' || displayVal === '1';
            return (
              <div key={fieldDef.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={checked}
                    onCheckedChange={(v) => handleSave(String(v))}
                  />
                  <span className="text-sm font-medium">{fieldDef.name}</span>
                </div>
              </div>
            );
          }

          // Select
          if (fieldDef.field_type === 'select') {
            const opts = (fieldDef.options || []) as Array<string | { value: string; label: string }>;
            return (
              <fieldset key={fieldDef.id} className="rounded-[8px] border px-3 pt-1 pb-2">
                <legend className="text-xs text-muted-foreground px-1">
                  {fieldDef.name}{fieldDef.is_required && <span className="text-destructive">*</span>}
                </legend>
                <Select value={displayVal} onValueChange={(v) => handleSave(v)}>
                  <SelectTrigger className="h-8 border-0 shadow-none p-0 text-sm focus:ring-0">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {opts.map((o, i) => {
                      const val = typeof o === 'string' ? o : o.value;
                      const label = typeof o === 'string' ? o : o.label;
                      return <SelectItem key={i} value={val}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </fieldset>
            );
          }

          // Text / number / email / date
          return (
            <FloatingLabelField
              key={fieldDef.id}
              label={fieldDef.name + (fieldDef.is_required ? ' *' : '')}
              value={displayVal}
              onSave={(v) => handleSave(v)}
            />
          );
        })}
      </div>
    </>
  );
}
