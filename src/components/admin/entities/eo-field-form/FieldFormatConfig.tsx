import { Hash } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

interface FieldFormatConfigProps {
  formData: FieldTypeConfigFormData;
  onFormDataChange: (updater: (prev: FieldTypeConfigFormData) => FieldTypeConfigFormData) => void;
}

export function FieldFormatConfig({ formData, onFormDataChange }: FieldFormatConfigProps) {
  return (
    <>
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Formatage d'affichage</span>
          </div>
          <Switch
            checked={formData.format_enabled}
            onCheckedChange={(v) => onFormDataChange((prev) => ({ ...prev, format_enabled: v }))}
          />
        </div>
        {formData.format_enabled && (
          <div className="space-y-2 pl-6">
            <div className="space-y-1">
              <Label className="text-xs">Type de formatage</Label>
              <Select
                value={formData.format_type}
                onValueChange={(v) => onFormDataChange((prev) => ({ ...prev, format_type: v as FieldTypeConfigFormData['format_type'] }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zero_pad">Zéros à gauche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.format_type === 'zero_pad' && (
              <div className="space-y-1">
                <Label className="text-xs">Longueur totale</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="h-8 text-xs"
                  value={formData.format_length}
                  onChange={(e) => onFormDataChange((prev) => ({ ...prev, format_length: parseInt(e.target.value, 10) || 5 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Aperçu : <span className="font-mono">{'0'.repeat(Math.max(0, (formData.format_length || 5) - 2))}42</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
