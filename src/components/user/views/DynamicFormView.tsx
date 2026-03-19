import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useBoFieldDefinitions } from '@/hooks/useBoFieldDefinitions';
import { useBusinessObject } from '@/hooks/useBusinessObjectsWithFields';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormInput, Save, Loader2 } from 'lucide-react';
import { useT } from '@/hooks/useT';
import type { ViewConfig } from '@/hooks/useViewConfigs';
import type { Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

interface FieldFormConfig {
  field_id: string;
  field_name: string;
  width: 'full' | 'half' | 'third';
  required_override?: boolean;
  readonly_override?: boolean;
  hidden?: boolean;
  default_value?: string;
}

interface FormSectionConfig {
  id: string;
  title: string;
  description?: string;
  fields: FieldFormConfig[];
}

interface FormConfig {
  sections?: FormSectionConfig[];
  submit_button_label?: string;
  cancel_button_label?: string;
  show_required_indicator?: boolean;
  validate_on_blur?: boolean;
  redirect_after_submit?: string;
  success_message?: string;
}

function getConfig(json: Json | undefined): FormConfig {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    return json as FormConfig;
  }
  return {};
}

interface DynamicFormViewProps {
  viewConfig: ViewConfig;
  itemId?: string; // If editing existing item
  onSubmit?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}

export function DynamicFormView({
  viewConfig,
  itemId,
  onSubmit,
  onCancel,
}: DynamicFormViewProps) {
  const { t } = useT();
  const config = getConfig(viewConfig.config);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch field definitions
  const { data: allFieldDefinitions = [], isLoading: isLoadingFields } = useBoFieldDefinitions(viewConfig.bo_definition_id);
  const fieldDefinitions = allFieldDefinitions;

  // Fetch existing values if editing
  const { data: existingItem } = useBusinessObject(itemId);

  // Initialize form data
  useEffect(() => {
    const initialData: Record<string, unknown> = {};
    
    if (existingItem) {
      // no base fields to initialize
    }

    // Set default values from config
    (config.sections || []).forEach(section => {
      section.fields.forEach(field => {
        if (field.default_value && !initialData[field.field_id]) {
          initialData[field.field_id] = field.default_value;
        }
      });
    });

    setFormData(initialData);
  }, [existingItem, config.sections]);

  // Create field map
  const fieldMap = new Map<string, typeof fieldDefinitions[0]>();
  fieldDefinitions.forEach(fd => fieldMap.set(fd.id, fd));

  const submitMutation = useMutationWithToast({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!viewConfig.bo_definition_id) throw new Error('No BO definition');

      if (itemId) {
        await api.patch(`/api/business-objects/${itemId}`, { title: data.title as string });
        return { id: itemId };
      } else {
        const boData = await api.post<{ id: string }>('/api/business-objects', {
          definition_id: viewConfig.bo_definition_id,
          title: data.title as string || null,
          eo_id: '',
        });
        return boData;
      }
    },
    invalidateKeys: [queryKeys.businessObjects.all()],
    successMessage: config.success_message || t('toast.save_success'),
    errorMessage: t('errors.save'),
    onSuccess: () => {
      onSubmit?.(formData);
    },
  });

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error on change
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    (config.sections || []).forEach(section => {
      section.fields.forEach(fieldConfig => {
        const field = fieldMap.get(fieldConfig.field_id);
        if (!field) return;

        const isRequired = fieldConfig.required_override ?? field.is_required;
        const value = formData[fieldConfig.field_id];

        if (isRequired && (value === undefined || value === null || value === '')) {
          newErrors[fieldConfig.field_id] = t('errors.required_field');
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    submitMutation.mutate(formData);
  };

  const renderField = (fieldConfig: FieldFormConfig) => {
    const field = fieldMap.get(fieldConfig.field_id);
    if (!field || fieldConfig.hidden) return null;

    const isReadonly = fieldConfig.readonly_override ?? field.is_readonly;
    const isRequired = fieldConfig.required_override ?? field.is_required;
    const value = formData[fieldConfig.field_id];
    const error = errors[fieldConfig.field_id];

    const widthClass = {
      full: 'w-full',
      half: 'w-full sm:w-[calc(50%-0.5rem)]',
      third: 'w-full sm:w-[calc(33.333%-0.5rem)]',
    }[fieldConfig.width];

    const labelElement = (
      <Label htmlFor={fieldConfig.field_id} className="flex items-center gap-1">
        {fieldConfig.field_name}
        {isRequired && config.show_required_indicator !== false && (
          <span className="text-destructive">*</span>
        )}
      </Label>
    );

    const floatingLabel = isRequired && config.show_required_indicator !== false
      ? `${fieldConfig.field_name} *`
      : fieldConfig.field_name;

    const renderInput = () => {
      switch (field.field_type) {
        case 'textarea':
          return (
            <Textarea
              id={fieldConfig.field_id}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(fieldConfig.field_id, e.target.value)}
              disabled={isReadonly}
              className={error ? 'border-destructive' : ''}
            />
          );

        case 'checkbox':
          return (
            <div className="flex items-center gap-2 pt-2">
              <Switch
                id={fieldConfig.field_id}
                checked={Boolean(value)}
                onCheckedChange={(v) => handleFieldChange(fieldConfig.field_id, v)}
                disabled={isReadonly}
              />
            </div>
          );

        case 'select':
          return (
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => handleFieldChange(fieldConfig.field_id, v)}
              disabled={isReadonly}
            >
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={t('placeholders.select')} />
              </SelectTrigger>
              <SelectContent>
                {/* Would load from referential */}
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          );

        case 'date':
          return (
            <FloatingInput
              label={floatingLabel}
              type="date"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(fieldConfig.field_id, e.target.value)}
              disabled={isReadonly}
              error={!!error}
            />
          );

        case 'number':
        case 'decimal':
          return (
            <FloatingInput
              label={floatingLabel}
              type="number"
              value={String((value as number) ?? '')}
              onChange={(e) => handleFieldChange(fieldConfig.field_id, parseFloat(e.target.value) || null)}
              disabled={isReadonly}
              error={!!error}
            />
          );

        default:
          return (
            <FloatingInput
              label={floatingLabel}
              type="text"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(fieldConfig.field_id, e.target.value)}
              disabled={isReadonly}
              error={!!error}
            />
          );
      }
    };

    return (
      <div key={fieldConfig.field_id} className={`space-y-2 ${widthClass}`}>
        {['textarea', 'checkbox', 'select'].includes(field.field_type) && labelElement}
        {renderInput()}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  };

  if (!viewConfig.bo_definition_id) {
    return (
      <Card className="flex items-center justify-center h-64">
        <CardContent className="text-center py-8">
          <FormInput className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">{t('views.no_bo_configured')}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingFields) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Use configured sections or create default
  const sections = config.sections?.length
    ? config.sections
    : [
        {
          id: 'default',
          title: t('labels.information'),
          description: undefined,
          fields: fieldDefinitions.map(f => ({
            field_id: f.id,
            field_name: f.name,
            width: 'full' as const,
            required_override: f.is_required,
            readonly_override: f.is_readonly,
          })),
        },
      ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
            {section.description && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {section.fields.map(renderField)}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {config.cancel_button_label || t('buttons.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={submitMutation.isPending}>
          {config.submit_button_label || t('buttons.save')}
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
