import {
  Plus,
  X as XIcon,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type CrossFieldRule,
  getCompatibleRuleTypes,
  getCompatibleTargetFields,
} from '@/lib/eo/eo-cross-field-validation';
import { type EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

interface FieldValidationRulesFormData {
  field_type: string;
  is_required: boolean;
  is_unique: boolean;
  cross_field_rules: CrossFieldRule[];
}

interface FieldValidationRulesProps {
  formData: FieldValidationRulesFormData;
  onFormDataChange: (updater: (prev: FieldValidationRulesFormData) => FieldValidationRulesFormData) => void;
  isSystemField: boolean;
  isSystemIsActive: boolean;
  fieldId: string | undefined;
  allFields: EoFieldDefinition[];
}

export function FieldValidationRules({
  formData,
  onFormDataChange,
  isSystemField,
  isSystemIsActive,
  fieldId,
  allFields,
}: FieldValidationRulesProps) {
  return (
    <>
      {!['checkbox', 'boolean'].includes(formData.field_type) && (
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.is_required}
            onCheckedChange={(checked) =>
              onFormDataChange((prev) => ({ ...prev, is_required: checked }))
            }
            disabled={isSystemField}
          />
          <Label>Champ obligatoire</Label>
          {isSystemField && <span className="text-xs text-muted-foreground">(toujours obligatoire)</span>}
        </div>
      )}

      {!isSystemIsActive && !['checkbox', 'boolean'].includes(formData.field_type) && (
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.is_unique}
          onCheckedChange={(checked) =>
            onFormDataChange((prev) => ({ ...prev, is_unique: checked }))
          }
        />
        <Label>Valeur unique</Label>
      </div>
      )}

      {/* Cross-field validation rules */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Règles de validation inter-champs</span>
        </div>

        {formData.cross_field_rules.map((rule, idx) => {
          const compatibleRules = getCompatibleRuleTypes(formData.field_type);
          const compatibleTargets = rule.type
            ? getCompatibleTargetFields(rule.type, fieldId || '', allFields)
            : [];

          return (
            <div key={idx} className="flex items-center gap-2 bg-muted/30 rounded-md p-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Select
                  value={rule.type}
                  onValueChange={(v) => {
                    const updated = [...formData.cross_field_rules];
                    updated[idx] = { ...updated[idx], type: v as CrossFieldRule['type'], target_field_id: '' };
                    onFormDataChange((prev) => ({ ...prev, cross_field_rules: updated }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Type de règle" />
                  </SelectTrigger>
                  <SelectContent>
                    {compatibleRules.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={rule.target_field_id}
                  onValueChange={(v) => {
                    const updated = [...formData.cross_field_rules];
                    updated[idx] = { ...updated[idx], target_field_id: v };
                    onFormDataChange((prev) => ({ ...prev, cross_field_rules: updated }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Champ cible" />
                  </SelectTrigger>
                  <SelectContent>
                    {compatibleTargets.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  onFormDataChange((prev) => ({
                    ...prev,
                    cross_field_rules: prev.cross_field_rules.filter((_, i) => i !== idx),
                  }));
                }}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() =>
            onFormDataChange((prev) => ({
              ...prev,
              cross_field_rules: [
                ...prev.cross_field_rules,
                { type: '' as CrossFieldRule['type'], target_field_id: '', message: '' },
              ],
            }))
          }
        >
          Ajouter une règle <Plus className="h-3 w-3" />
        </Button>

        {formData.cross_field_rules.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Les règles seront vérifiées à chaque modification de ce champ.
          </p>
        )}
      </div>
    </>
  );
}
