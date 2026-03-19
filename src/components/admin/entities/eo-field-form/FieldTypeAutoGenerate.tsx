import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import type { FieldTypeConfigFormData } from './FieldTypeConfig';

interface FieldTypeAutoGenerateProps {
  formData: FieldTypeConfigFormData;
  onFormDataChange: (updater: (prev: FieldTypeConfigFormData) => FieldTypeConfigFormData) => void;
  isSelectType: boolean;
  selectAutoGenOptions: string[];
}

export function FieldTypeAutoGenerate({
  formData,
  onFormDataChange,
  isSelectType,
  selectAutoGenOptions,
}: FieldTypeAutoGenerateProps) {
  const autoGenerateModes = useMemo(() => {
    const ft = formData.field_type;
    const modes: { value: string; label: string }[] = [];
    modes.push({ value: 'fixed_value', label: 'Valeur fixe' });
    if (['text', 'textarea', 'number', 'decimal'].includes(ft)) {
      modes.unshift({ value: 'counter', label: 'Compteur' });
    }
    if (['text', 'textarea'].includes(ft)) {
      modes.push({ value: 'uuid', label: 'UUID' });
    }
    if (['text', 'textarea', 'date', 'datetime'].includes(ft)) {
      modes.push({ value: 'date', label: 'Date du jour' });
    }
    return modes;
  }, [formData.field_type]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Génération automatique</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.auto_generate_enabled}
            onCheckedChange={(checked) =>
              onFormDataChange((prev) => ({ ...prev, auto_generate_enabled: checked }))
            }
          />
          <Label>Générer automatiquement si le champ est vide</Label>
        </div>
        {formData.auto_generate_enabled && (
          <div className="ml-6 space-y-3">
            {isSelectType ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Mode : valeur fixe (seul mode disponible pour les listes déroulantes)
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Valeur</Label>
                  {selectAutoGenOptions.length > 0 ? (
                    <Select
                      value={formData.auto_generate_fixed_value}
                      onValueChange={(v) =>
                        onFormDataChange((prev) => ({ ...prev, auto_generate_fixed_value: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une valeur" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectAutoGenOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {formData.referential_id
                        ? 'Aucune valeur dans le référentiel sélectionné'
                        : 'Ajoutez des options ci-dessus ou sélectionnez un référentiel'}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Mode de génération</Label>
                  <Select
                    value={formData.auto_generate_mode}
                    onValueChange={(v) =>
                      onFormDataChange((prev) => ({ ...prev, auto_generate_mode: v as FieldTypeConfigFormData['auto_generate_mode'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {autoGenerateModes.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formData.auto_generate_mode === 'counter' || formData.auto_generate_mode === 'prefix_counter') && (
                  <p className="text-xs text-muted-foreground">
                    Génère un numéro incrémental (1, 2, 3…). Utilisez le formatage d'affichage pour ajouter des préfixes ou des zéros.
                  </p>
                )}

                {formData.auto_generate_mode === 'date' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Format de date</Label>
                    <Select
                      value={formData.auto_generate_date_format}
                      onValueChange={(v) =>
                        onFormDataChange((prev) => ({ ...prev, auto_generate_date_format: v }))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2026-02-23)</SelectItem>
                        <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (23/02/2026)</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (02/23/2026)</SelectItem>
                        <SelectItem value="dd-MM-yyyy">dd-MM-yyyy (23-02-2026)</SelectItem>
                        <SelectItem value="yyyy/MM/dd">yyyy/MM/dd (2026/02/23)</SelectItem>
                        <SelectItem value="dd.MM.yyyy">dd.MM.yyyy (23.02.2026)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.auto_generate_mode === 'fixed_value' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Valeur</Label>
                    <Input
                      value={formData.auto_generate_fixed_value}
                      onChange={(e) =>
                        onFormDataChange((prev) => ({ ...prev, auto_generate_fixed_value: e.target.value }))
                      }
                      placeholder="Valeur par défaut"
                    />
                  </div>
                )}

                {formData.auto_generate_mode === 'uuid' && (
                  <p className="text-xs text-muted-foreground">
                    Un identifiant unique (UUID) sera généré automatiquement.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
