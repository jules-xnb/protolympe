import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useFieldDefinitions, type FieldDefinitionWithRelations } from '@/hooks/useFieldDefinitions';
import { useAllReferentialValues } from '@/hooks/useReferentialValues';
import { useCreateBusinessObject } from '@/hooks/useBusinessObjects';
import type { Json } from '@/types/database';

const SYSTEM_SLUGS = ['reference_number', 'name', 'eo_id', 'status', 'created_by_user_id', 'created_at', 'updated_at'];

type CustomFieldValue = string | number | boolean | string[] | null;

function CustomFieldInput({
  field,
  value,
  onChange,
  options,
}: {
  field: FieldDefinitionWithRelations;
  value: CustomFieldValue;
  onChange: (value: CustomFieldValue) => void;
  options: Array<{ id: string; label: string }>;
}) {
  switch (field.field_type) {
    case 'textarea':
      return (
        <Textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || ''}
          className="resize-none"
        />
      );
    case 'number':
    case 'decimal':
      return (
        <Input
          type="number"
          step={field.field_type === 'decimal' ? '0.01' : '1'}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder={field.description || ''}
        />
      );
    case 'date':
      return (
        <Input
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(!!checked)}
          />
          <span className="text-sm text-muted-foreground">{field.description}</span>
        </div>
      );
    case 'select':
      return (
        <Select value={(value as string) || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
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
            <div key={opt.id} className="flex items-center gap-2">
              <Checkbox
                checked={Array.isArray(value) && value.includes(opt.id)}
                onCheckedChange={(checked) => {
                  const current = Array.isArray(value) ? value : [];
                  if (checked) {
                    onChange([...current, opt.id]);
                  } else {
                    onChange(current.filter((v: string) => v !== opt.id));
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
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || 'email@exemple.com'}
        />
      );
    case 'url':
      return (
        <Input
          type="url"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || 'https://...'}
        />
      );
    case 'phone':
      return (
        <Input
          type="tel"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || '+33...'}
        />
      );
    case 'text':
    default:
      return (
        <Input
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.description || ''}
        />
      );
  }
}

interface BusinessObjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definitionId: string;
}

export function BusinessObjectFormDialog({
  open,
  onOpenChange,
  definitionId,
}: BusinessObjectFormDialogProps) {
  const { user } = useAuth();
  const { selectedClient } = useViewMode();
  const { data: allEos = [] } = useOrganizationalEntities(selectedClient?.id);
  const { data: allFields = [] } = useFieldDefinitions(definitionId);
  const createMutation = useCreateBusinessObject();

  const customFields = useMemo(
    () => allFields
      .filter(f => !SYSTEM_SLUGS.includes(f.slug))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    [allFields],
  );

  const { data: refValuesMap } = useAllReferentialValues(customFields);

  const [eoId, setEoId] = useState('');
  const [name, setName] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValue>>({});

  useEffect(() => {
    if (open) {
      setEoId('');
      setName('');
      setCustomFieldValues({});
    }
  }, [open]);

  const handleCustomFieldChange = (fieldId: string, value: CustomFieldValue) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const getOptions = (field: FieldDefinitionWithRelations) => {
    if (!field.referential_id || !refValuesMap) return [];
    return refValuesMap.get(field.referential_id) || [];
  };

  const handleSubmit = async () => {
    if (!eoId) {
      toast.error('Veuillez sélectionner une entité organisationnelle');
      return;
    }
    if (!name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    // Validate required custom fields
    const missingRequired = customFields.filter(f => {
      if (!f.is_required) return false;
      const val = customFieldValues[f.id];
      return val === undefined || val === null || val === '';
    });
    if (missingRequired.length > 0) {
      toast.error('Champs obligatoires manquants', {
        description: missingRequired.map(f => f.name).join(', '),
      });
      return;
    }

    const fieldValuesToSave: Array<{ field_definition_id: string; value: Json }> = [];
    for (const [fieldId, val] of Object.entries(customFieldValues)) {
      if (val !== undefined && val !== null && val !== '') {
        fieldValuesToSave.push({ field_definition_id: fieldId, value: val as Json });
      }
    }

    try {
      await createMutation.mutateAsync({
        definition_id: definitionId,
        eo_id: eoId,
        created_by_user_id: user!.id,
        name: name.trim(),
        fieldValues: fieldValuesToSave,
      });
      onOpenChange(false);
    } catch {
      // Erreur gérée par useMutationWithToast
    }
  };

  const isPending = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Ajouter un élément</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          <div className="space-y-2">
            <Label>Entité organisationnelle <span className="text-destructive">*</span></Label>
            <Select value={eoId} onValueChange={setEoId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une entité..." />
              </SelectTrigger>
              <SelectContent>
                {allEos.map((eo: { id: string; name: string; code: string }) => (
                  <SelectItem key={eo.id} value={eo.id}>
                    {eo.name} ({eo.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <FloatingInput
            label="Nom *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.name}
                {field.is_required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <CustomFieldInput
                field={field}
                value={customFieldValues[field.id]}
                onChange={(value) => handleCustomFieldChange(field.id, value)}
                options={getOptions(field)}
              />
              {field.description && field.field_type !== 'checkbox' && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !eoId || isPending}
          >
            {isPending ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
