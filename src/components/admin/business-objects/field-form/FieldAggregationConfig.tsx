import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AggregationSourceOption {
  value: string;
  label: string;
  sourceType: 'eo' | 'user' | 'object';
  refDefId?: string;
}

interface AggregationTargetOption {
  value: string;
  label: string;
}

interface FieldAggregationConfigProps {
  aggregationSourceField: string | null;
  aggregationTargetFieldId: string | null;
  aggregationEditable: boolean;
  aggregationSourceOptions: AggregationSourceOption[];
  aggregationTargetOptions: AggregationTargetOption[];
  onSourceChange: (value: string | null) => void;
  onTargetChange: (value: string | null) => void;
  onEditableChange: (value: boolean) => void;
}

export function FieldAggregationConfig({
  aggregationSourceField,
  aggregationTargetFieldId,
  aggregationEditable,
  aggregationSourceOptions,
  aggregationTargetOptions,
  onSourceChange,
  onTargetChange,
  onEditableChange,
}: FieldAggregationConfigProps) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-sm font-medium">Configuration de la référence</h4>
      <div className="space-y-2">
        <Label>Champ source (référence)</Label>
        <Select
          value={aggregationSourceField || 'none'}
          onValueChange={(value) => onSourceChange(value === 'none' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le champ de référence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {aggregationSourceOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Le champ de référence dont vous souhaitez afficher une valeur</p>
      </div>
      {aggregationSourceField && aggregationSourceField !== 'none' && (
        <>
          <div className="space-y-2">
            <Label>Champ à afficher</Label>
            <Select
              value={aggregationTargetFieldId || 'none'}
              onValueChange={(value) => onTargetChange(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le champ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {aggregationTargetOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">La valeur de ce champ sera affichée dans l'objet métier</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={aggregationEditable}
              onCheckedChange={onEditableChange}
            />
            <Label>Éditable</Label>
          </div>
        </>
      )}
    </div>
  );
}
