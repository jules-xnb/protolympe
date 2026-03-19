import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { FieldTypeConfigFormData } from './FieldTypeConfig';

interface FieldBooleanConfigProps {
  formData: FieldTypeConfigFormData;
  onFormDataChange: (updater: (prev: FieldTypeConfigFormData) => FieldTypeConfigFormData) => void;
  /** Whether this is a system field (is_active) — uses slightly different labels */
  isSystemIsActive?: boolean;
}

export function FieldBooleanConfig({ formData, onFormDataChange, isSystemIsActive }: FieldBooleanConfigProps) {
  if (isSystemIsActive) {
    return (
      <>
        <Separator />
        <div className="space-y-2">
          <span className="text-xs font-medium">Labels des options</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valeur "Vrai"</Label>
              <Input
                value={formData.boolean_true_label}
                onChange={(e) => onFormDataChange((prev) => ({ ...prev, boolean_true_label: e.target.value }))}
                placeholder="Actif"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Valeur "Faux"</Label>
              <Input
                value={formData.boolean_false_label}
                onChange={(e) => onFormDataChange((prev) => ({ ...prev, boolean_false_label: e.target.value }))}
                placeholder="Inactif"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <span className="text-sm font-medium">Options du booléen</span>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Label "Vrai"</Label>
            <Input
              value={formData.boolean_true_label}
              onChange={(e) => onFormDataChange((prev) => ({ ...prev, boolean_true_label: e.target.value }))}
              placeholder="Oui"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Label "Faux"</Label>
            <Input
              value={formData.boolean_false_label}
              onChange={(e) => onFormDataChange((prev) => ({ ...prev, boolean_false_label: e.target.value }))}
              placeholder="Non"
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Valeur par défaut à la création</span>
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.default_value === 'true'}
              onCheckedChange={(checked) =>
                onFormDataChange((prev) => ({ ...prev, default_value: checked ? 'true' : 'false' }))
              }
            />
            <Label>{formData.default_value === 'true' ? `${formData.boolean_true_label || 'Oui'} par défaut` : `${formData.boolean_false_label || 'Non'} par défaut`}</Label>
          </div>
        </div>
      </div>
    </>
  );
}
