import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useAuth } from '@/hooks/useAuth';
import { useViewMode } from '@/contexts/ViewModeContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useT } from '@/hooks/useT';
import type { CreateFormFieldConfig, FieldVisibilityCondition } from '@/components/builder/page-builder/types';
import { queryKeys } from '@/lib/query-keys';

type FormValue = string | number | boolean | null | undefined;

interface ReferentialValueWithGroup extends ReferentialValue {
  referential_id: string;
}

interface CreateBusinessObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boDefinitionId: string;
  formFields: CreateFormFieldConfig[];
  onSuccess?: () => void;
}

interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  field_type: string;
  is_required: boolean;
  referential_id: string | null;
  reference_object_definition_id: string | null;
}

interface ReferentialValue {
  id: string;
  label: string;
  code: string;
}

// Check if a visibility condition is met
function isConditionMet(
  condition: FieldVisibilityCondition,
  formValues: Record<string, FormValue>
): boolean {
  const sourceValue = formValues[condition.source_field_id];
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return String(sourceValue) === String(targetValue);
    case 'not_equals':
      return String(sourceValue) !== String(targetValue);
    case 'greater_than':
      return Number(sourceValue) > Number(targetValue);
    case 'less_than':
      return Number(sourceValue) < Number(targetValue);
    case 'greater_or_equal':
      return Number(sourceValue) >= Number(targetValue);
    case 'less_or_equal':
      return Number(sourceValue) <= Number(targetValue);
    case 'contains':
      return String(sourceValue || '').includes(String(targetValue));
    case 'is_empty':
      return sourceValue === null || sourceValue === undefined || sourceValue === '';
    case 'is_not_empty':
      return sourceValue !== null && sourceValue !== undefined && sourceValue !== '';
    default:
      return true;
  }
}

// Check if field should be visible based on all conditions
function isFieldVisible(
  field: CreateFormFieldConfig,
  formValues: Record<string, FormValue>
): boolean {
  if (!field.visibility_conditions || field.visibility_conditions.length === 0) {
    return true;
  }
  // All conditions must be met (AND logic)
  return field.visibility_conditions.every(c => isConditionMet(c, formValues));
}

export function CreateBusinessObjectDialog({
  open,
  onOpenChange,
  boDefinitionId,
  formFields,
  onSuccess,
}: CreateBusinessObjectDialogProps) {
  const { t } = useT();
  const { user } = useAuth();
  const { userSimulationConfig, selectedClient } = useViewMode();
  const [formValues, setFormValues] = useState<Record<string, FormValue>>({});

  // Get field definitions for the BO
  const { data: fieldDefinitions = [] } = useQuery<FieldDefinition[]>({
    queryKey: queryKeys.fieldDefinitions.byObject(boDefinitionId!),
    queryFn: async () => {
      return api.get<FieldDefinition[]>(`/api/business-objects/definitions/${boDefinitionId}/fields?is_active=true`);
    },
    enabled: open && !!boDefinitionId,
  });

  // Get referential values for select fields
  const referentialIds = useMemo(() => {
    const ids: string[] = [];
    formFields.forEach(field => {
      const fieldDef = fieldDefinitions.find(fd => fd.id === field.field_id);
      if (fieldDef?.referential_id) {
        ids.push(fieldDef.referential_id);
      }
    });
    return [...new Set(ids)];
  }, [formFields, fieldDefinitions]);

  const { data: referentialValues = {} } = useQuery<Record<string, ReferentialValue[]>>({
    queryKey: queryKeys.listeValues.forBo(referentialIds),
    queryFn: async () => {
      if (referentialIds.length === 0) return {};
      const data = await api.get<ReferentialValueWithGroup[]>(`/api/referentials/values?referential_ids=${referentialIds.join(',')}&is_active=true`);
      const grouped: Record<string, ReferentialValue[]> = {};
      data.forEach((rv) => {
        if (!grouped[rv.referential_id]) {
          grouped[rv.referential_id] = [];
        }
        grouped[rv.referential_id].push(rv);
      });
      return grouped;
    },
    enabled: open && referentialIds.length > 0,
  });

  // Get users for user_reference fields
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.usersForSelect.all(),
    queryFn: async () => {
      return api.get<Array<{ id: string; full_name: string | null; email: string }>>('/api/profiles?order=full_name');
    },
    enabled: open && formFields.some(f => f.field_type === 'user_reference'),
  });

  // Get EOs for eo_reference fields (filtered by current client)
  const { data: eos = [] } = useQuery({
    queryKey: [...queryKeys.eosForSelect.all(), selectedClient?.id],
    queryFn: async () => {
      return api.get<Array<{ id: string; name: string; code: string }>>(`/api/organizational-entities?client_id=${selectedClient!.id}&is_active=true&is_archived=false&order=name`);
    },
    enabled: open && !!selectedClient?.id && formFields.some(f => f.field_type === 'eo_reference'),
  });

  // Initialize form values when dialog opens
  useEffect(() => {
    if (open) {
      const initialValues: Record<string, FormValue> = {};
      formFields.forEach(field => {
        // Set default value
        if (field.default_value) {
          initialValues[field.field_id] = field.default_value;
        }
        // Use current user for user_reference
        if (field.use_current_user && user?.id) {
          initialValues[field.field_id] = user.id;
        }
        // Use current user's EO for eo_reference
        if (field.use_current_user_eo && userSimulationConfig?.selectedEoIds?.[0]) {
          initialValues[field.field_id] = userSimulationConfig.selectedEoIds[0];
        }
      });
      setFormValues(initialValues);
    }
  }, [open, formFields, user, userSimulationConfig]);

  // Create business object mutation
  const createMutation = useMutationWithToast({
    mutationFn: async () => {
      if (!user?.id) throw new Error(t('views.user_not_connected'));

      const eoId = userSimulationConfig?.selectedEoIds?.[0];
      if (!eoId) throw new Error(t('errors.no_eo_selected'));

      const fieldValues = formFields
        .filter(field => !field.is_hidden && formValues[field.field_id] !== undefined)
        .map(field => ({
          field_definition_id: field.field_id,
          value: formValues[field.field_id],
        }));

      const bo = await api.post<{ id: string }>('/api/business-objects', {
        definition_id: boDefinitionId,
        eo_id: eoId,
        title: formValues[formFields.find(f => f.field_name?.toLowerCase().includes('titre') || f.field_name?.toLowerCase().includes('intitulé'))?.field_id || ''] || null,
        field_values: fieldValues,
      });

      return bo;
    },
    invalidateKeys: [queryKeys.businessObjects.list(), queryKeys.businessObjects.count()],
    successMessage: t('toast.item_created'),
    errorMessage: t('errors.creation'),
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  // Get visible fields (not hidden and conditions met)
  const visibleFields = useMemo(() => {
    return formFields.filter(field => {
      if (field.is_hidden) return false;
      return isFieldVisible(field, formValues);
    });
  }, [formFields, formValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const missingRequired = visibleFields.filter(field => {
      if (!field.is_required) return false;
      const value = formValues[field.field_id];
      return value === undefined || value === null || value === '';
    });

    if (missingRequired.length > 0) {
      toast.error(t('views.missing_required_fields'), {
        description: missingRequired.map(f => f.field_name).join(', '),
      });
      return;
    }

    createMutation.mutate();
  };

  const renderField = (field: CreateFormFieldConfig) => {
    const fieldDef = fieldDefinitions.find(fd => fd.id === field.field_id);
    const isDisabled = field.is_readonly || createMutation.isPending;
    const value = formValues[field.field_id] ?? '';

    const commonProps = {
      id: field.field_id,
      disabled: isDisabled,
      className: isDisabled ? 'bg-muted' : '',
    };

    switch (field.field_type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value }))}
            rows={3}
          />
        );

      case 'number':
      case 'decimal':
      case 'currency':
        return (
          <Input
            {...commonProps}
            type="number"
            step={field.field_type === 'decimal' || field.field_type === 'currency' ? '0.01' : '1'}
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value ? Number(e.target.value) : '' }))}
          />
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value }))}
          />
        );

      case 'datetime':
        return (
          <Input
            {...commonProps}
            type="datetime-local"
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value }))}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id={field.field_id}
              checked={!!value}
              onCheckedChange={(checked) => setFormValues(prev => ({ ...prev, [field.field_id]: checked }))}
              disabled={isDisabled}
            />
            <Label htmlFor={field.field_id} className="font-normal">{t('boolean.yes')}</Label>
          </div>
        );

      case 'select': {
        const refId = fieldDef?.referential_id;
        const options = refId ? (referentialValues[refId] || []) : [];
        return (
          <Select
            value={value}
            onValueChange={(v) => setFormValues(prev => ({ ...prev, [field.field_id]: v }))}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('placeholders.select')} />
            </SelectTrigger>
            <SelectContent>
              {options.map(opt => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case 'user_reference':
        return (
          <Select
            value={value}
            onValueChange={(v) => setFormValues(prev => ({ ...prev, [field.field_id]: v }))}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('views.select_user')} />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'eo_reference':
        return (
          <Select
            value={value}
            onValueChange={(v) => setFormValues(prev => ({ ...prev, [field.field_id]: v }))}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('placeholders.select_entity')} />
            </SelectTrigger>
            <SelectContent>
              {eos.map((eo: { id: string; name: string; code: string }) => (
                <SelectItem key={eo.id} value={eo.id}>
                  {eo.name} ({eo.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'email':
        return (
          <Input
            {...commonProps}
            type="email"
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value }))}
          />
        );

      case 'url':
        return (
          <Input
            {...commonProps}
            type="url"
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value }))}
          />
        );

      case 'phone':
        return (
          <Input
            {...commonProps}
            type="tel"
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value }))}
          />
        );

      default: // text and others
        return (
          <Input
            {...commonProps}
            type="text"
            value={value}
            onChange={(e) => setFormValues(prev => ({ ...prev, [field.field_id]: e.target.value }))}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('views.new_item')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-4">
          {visibleFields.map(field => (
            <div key={field.field_id} className="space-y-2">
              <Label htmlFor={field.field_id} className="flex items-center gap-1">
                {field.field_name}
                {field.is_required && <span className="text-destructive">*</span>}
                {field.is_readonly && (
                  <span className="text-xs text-muted-foreground">({t('views.readonly')})</span>
                )}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </form>

        <DialogFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {t('buttons.create')}
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
