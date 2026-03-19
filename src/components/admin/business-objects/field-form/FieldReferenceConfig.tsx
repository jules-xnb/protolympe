import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';

interface BusinessObjectOption {
  id: string;
  name: string;
}

interface FieldReferenceConfigProps {
  referenceObjectDefinitionId: string | null;
  refDisplayFieldId: string | null;
  refSecondaryFieldId: string | null;
  objectDefinitionId: string;
  businessObjects: BusinessObjectOption[];
  refBoFields: FieldDefinitionWithRelations[];
  onReferenceObjectChange: (value: string | null) => void;
  onDisplayFieldChange: (value: string | null) => void;
  onSecondaryFieldChange: (value: string | null) => void;
}

export function FieldReferenceConfig({
  referenceObjectDefinitionId,
  refDisplayFieldId,
  refSecondaryFieldId,
  objectDefinitionId,
  businessObjects,
  refBoFields,
  onReferenceObjectChange,
  onDisplayFieldChange,
  onSecondaryFieldChange,
}: FieldReferenceConfigProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>Objet métier référencé</Label>
        <Select
          value={referenceObjectDefinitionId || 'none'}
          onValueChange={(value) => onReferenceObjectChange(value === 'none' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un objet métier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Aucun</SelectItem>
            {businessObjects
              .filter(bo => bo.id !== objectDefinitionId)
              .map((bo) => (
                <SelectItem key={bo.id} value={bo.id}>
                  {bo.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Ce champ référencera une instance de cet objet métier</p>
      </div>

      {referenceObjectDefinitionId && refBoFields.length > 0 && (
        <div className="space-y-3 rounded-lg border p-4">
          <h4 className="text-sm font-medium">Configuration d'affichage</h4>
          <div className="space-y-2">
            <Label className="text-sm">Champ d'affichage principal</Label>
            <Select
              value={refDisplayFieldId || 'none'}
              onValueChange={(v) => onDisplayFieldChange(v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nom (par défaut)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nom (par défaut)</SelectItem>
                {refBoFields.filter(f => f.is_active).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Le champ affiché comme label dans la liste de sélection</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Champ distinctif (optionnel)</Label>
            <Select
              value={refSecondaryFieldId || 'none'}
              onValueChange={(v) => onSecondaryFieldChange(v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                <SelectItem value="__reference_number">Numéro de référence</SelectItem>
                {refBoFields.filter(f => f.is_active).map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Affiché à côté du champ principal pour distinguer les homonymes</p>
          </div>
        </div>
      )}
    </>
  );
}
