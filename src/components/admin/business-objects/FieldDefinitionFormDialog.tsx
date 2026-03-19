import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import {
  ChevronsUpDown,
  Check,
  ShieldCheck,
  X as XIcon,
  Plus,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreateFieldDefinition,
  useUpdateFieldDefinition,
  type FieldDefinitionWithRelations,
} from '@/hooks/useFieldDefinitions';
import { useListes } from '@/hooks/useListes';
import { useListeValues } from '@/hooks/useListeValues';
import { useBusinessObjectDefinitions } from '@/hooks/useBusinessObjectDefinitions';
import { useEoFieldDefinitions } from '@/hooks/useEoFieldDefinitions';
import { useUserFieldDefinitions } from '@/hooks/useUserFieldDefinitions';
import { useFieldDefinitions as useBoFieldDefs } from '@/hooks/useFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { toast } from 'sonner';
import type { Database } from '@/types/database';
import { FormulaEditor } from './FormulaEditor';
import {
  type CrossFieldRule,
  getCompatibleRuleTypes,
  getCompatibleTargetFields,
} from '@/lib/eo/eo-cross-field-validation';
import { getGroupedFieldTypes } from '@/lib/field-type-registry';
import { FieldTypeSelector } from './field-form/FieldTypeSelector';
import { FieldDateFormatConfig } from './field-form/FieldDateFormatConfig';
import { FieldDocumentConfig } from './field-form/FieldDocumentConfig';
import { FieldReferenceConfig } from './field-form/FieldReferenceConfig';
import { FieldAggregationConfig, type AggregationSourceOption } from './field-form/FieldAggregationConfig';

type FieldType = Database['public']['Enums']['field_type'];

// Filter to BO-relevant types and pre-group them
const BO_EXCLUDED = ['boolean', 'file', 'image', 'section', 'initials'];
const groupedFieldTypes = getGroupedFieldTypes((t) => !BO_EXCLUDED.includes(t.value));

interface FieldDefinitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectDefinitionId: string;
  field?: FieldDefinitionWithRelations | null;
  fields: FieldDefinitionWithRelations[];
}

export function FieldDefinitionFormDialog({
  open,
  onOpenChange,
  objectDefinitionId,
  field,
  fields,
}: FieldDefinitionFormDialogProps) {
  const createMutation = useCreateFieldDefinition();
  const updateMutation = useUpdateFieldDefinition();
  const { data: listes = [] } = useListes();
  const { data: businessObjects = [] } = useBusinessObjectDefinitions();
  const { selectedClient } = useViewMode();
  const { data: eoFieldDefs = [] } = useEoFieldDefinitions(selectedClient?.id);
  const { data: userFieldDefs = [] } = useUserFieldDefinitions(selectedClient?.id);

  const [refPopoverOpen, setRefPopoverOpen] = useState(false);
  const [defaultValuePopoverOpen, setDefaultValuePopoverOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    field_type: 'text' as string,
    is_required: false,
    is_unique: false,
    is_readonly: false,
    is_hidden: false,
    placeholder: '',
    parent_field_id: null as string | null,
    referential_id: null as string | null,
    reference_object_definition_id: null as string | null,
    calculation_formula: '',
    doc_multiple: true,
    doc_max_size_mb: null as number | null,
    doc_accepted_formats: 'pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png, csv, txt, zip, rar',
    aggregation_source_field: null as string | null,
    aggregation_target_field_id: null as string | null,
    aggregation_editable: false,
    date_format: 'dd/MM/yyyy',
    ref_display_field_id: null as string | null,
    ref_secondary_field_id: null as string | null,
    default_value: null as string | null,
    max_length: null as number | null,
    cross_field_rules: [] as CrossFieldRule[],
    auto_generate_enabled: false,
    auto_generate_mode: 'counter' as 'counter' | 'prefix_counter' | 'uuid' | 'date' | 'fixed_value',
    auto_generate_prefix: '',
    auto_generate_padding: 5,
    auto_generate_date_format: 'yyyy-MM-dd',
    auto_generate_fixed_value: '',
  });

  const showReferential = ['select', 'multiselect'].includes(formData.field_type);
  const { data: listeValues = [] } = useListeValues(showReferential ? formData.referential_id : undefined);
  const showObjectReference = formData.field_type === 'object_reference';
  const showFormula = formData.field_type === 'calculated';
  const showDocumentConfig = formData.field_type === 'document';
  const showAggregation = formData.field_type === 'aggregation';
  const showDateFormat = ['date', 'datetime', 'time'].includes(formData.field_type);
  const isTextType = ['text', 'textarea', 'email', 'phone', 'url'].includes(formData.field_type);

  // Auto-generate modes available per field type
  const autoGenerateModes = useMemo(() => {
    const ft = formData.field_type;
    const modes: { value: string; label: string }[] = [];
    modes.push({ value: 'fixed_value', label: 'Valeur fixe' });
    // Counter for text and number types
    if (['text', 'textarea', 'number', 'decimal'].includes(ft)) {
      modes.unshift({ value: 'counter', label: 'Compteur' });
    }
    // UUID only for text types (not number, date, email, phone, url)
    if (['text', 'textarea'].includes(ft)) {
      modes.push({ value: 'uuid', label: 'UUID' });
    }
    // Date mode for date-like or text fields
    if (['text', 'textarea', 'date', 'datetime'].includes(ft)) {
      modes.push({ value: 'date', label: 'Date du jour' });
    }
    return modes;
  }, [formData.field_type]);

  // Fetch referenced BO fields for object_reference display config
  const { data: refBoFields = [] } = useBoFieldDefs(showObjectReference ? (formData.reference_object_definition_id || undefined) : undefined);

  // Build list of available source reference fields for aggregation
  const aggregationSourceOptions = useMemo(() => {
    const options: AggregationSourceOption[] = [
      { value: '__system_eo_id', label: 'Entité organisationnelle (système)', sourceType: 'eo' },
    ];
    fields.forEach(f => {
      if (f.field_type === 'eo_reference') {
        options.push({ value: f.id, label: `${f.name} (réf. EO)`, sourceType: 'eo' });
      } else if (f.field_type === 'user_reference') {
        options.push({ value: f.id, label: `${f.name} (réf. utilisateur)`, sourceType: 'user' });
      } else if (f.field_type === 'object_reference') {
        options.push({ value: f.id, label: `${f.name} (réf. objet)`, sourceType: 'object', refDefId: f.reference_object_definition_id || undefined });
      }
    });
    return options;
  }, [fields]);

  const selectedSourceOption = aggregationSourceOptions.find(o => o.value === formData.aggregation_source_field);
  const { data: targetBoFields = [] } = useBoFieldDefs(selectedSourceOption?.refDefId);

  const aggregationTargetOptions = useMemo(() => {
    if (!selectedSourceOption) return [];
    switch (selectedSourceOption.sourceType) {
      case 'eo':
        return eoFieldDefs.filter(f => f.is_active).map(f => ({ value: f.id, label: f.name }));
      case 'user':
        return userFieldDefs.filter(f => f.is_active).map(f => ({ value: f.id, label: f.name }));
      case 'object':
        return targetBoFields.filter(f => f.is_active && f.field_type !== 'aggregation').map(f => ({ value: f.id, label: f.name }));
      default:
        return [];
    }
  }, [selectedSourceOption, eoFieldDefs, userFieldDefs, targetBoFields]);

  useEffect(() => {
    if (!open) return;
    if (field) {
      const s = (field.settings || {}) as Record<string, unknown>;
      setFormData({
        name: field.name,
        slug: field.slug,
        description: field.description || '',
        field_type: field.field_type,
        is_required: field.is_required,
        is_unique: (s.is_unique as boolean) ?? false,
        is_readonly: field.is_readonly,
        is_hidden: field.is_hidden,
        placeholder: field.placeholder || '',
        parent_field_id: field.parent_field_id,
        referential_id: field.referential_id,
        reference_object_definition_id: field.reference_object_definition_id,
        calculation_formula: field.calculation_formula || '',
        doc_multiple: (s.doc_multiple as boolean) || false,
        doc_max_size_mb: (s.doc_max_size_mb as number) || null,
        doc_accepted_formats: (s.doc_accepted_formats as string) || '',
        aggregation_source_field: (s.aggregation_source_field as string) || null,
        aggregation_target_field_id: (s.aggregation_target_field_id as string) || null,
        aggregation_editable: (s.aggregation_editable as boolean) || false,
        date_format: (s.date_format as string) || 'dd/MM/yyyy',
        ref_display_field_id: (s.ref_display_field_id as string) || null,
        ref_secondary_field_id: (s.ref_secondary_field_id as string) || null,
        default_value: field.default_value != null ? String(field.default_value) : null,
        max_length: ((field.validation_rules as Record<string, unknown>)?.max_length as number) ?? null,
        cross_field_rules: (() => {
          const rules = (field.validation_rules as Record<string, unknown>)?.cross_field_rules;
          return Array.isArray(rules) ? (rules as CrossFieldRule[]) : [];
        })(),
        auto_generate_enabled: (s.auto_generate as Record<string, unknown>)?.enabled as boolean ?? false,
        auto_generate_mode: ((s.auto_generate as Record<string, unknown>)?.mode as string ?? 'counter') as 'counter' | 'prefix_counter' | 'uuid' | 'date' | 'fixed_value',
        auto_generate_prefix: ((s.auto_generate as Record<string, unknown>)?.config as Record<string, unknown>)?.prefix as string ?? '',
        auto_generate_padding: ((s.auto_generate as Record<string, unknown>)?.config as Record<string, unknown>)?.padding as number ?? 5,
        auto_generate_date_format: ((s.auto_generate as Record<string, unknown>)?.config as Record<string, unknown>)?.date_format as string ?? 'yyyy-MM-dd',
        auto_generate_fixed_value: ((s.auto_generate as Record<string, unknown>)?.config as Record<string, unknown>)?.fixed_value as string ?? '',
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        field_type: 'text',
        is_required: false,
        is_unique: false,
        is_readonly: false,
        is_hidden: false,
        placeholder: '',
        parent_field_id: null,
        referential_id: null,
        reference_object_definition_id: null,
        calculation_formula: '',
        doc_multiple: true,
        doc_max_size_mb: null,
        doc_accepted_formats: 'pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, jpeg, png, csv, txt, zip, rar',
        aggregation_source_field: null,
        aggregation_target_field_id: null,
        aggregation_editable: false,
        date_format: 'dd/MM/yyyy',
        ref_display_field_id: null,
        ref_secondary_field_id: null,
        default_value: null,
        max_length: null,
        cross_field_rules: [],
        auto_generate_enabled: false,
        auto_generate_mode: 'counter',
        auto_generate_prefix: '',
        auto_generate_padding: 5,
        auto_generate_date_format: 'yyyy-MM-dd',
        auto_generate_fixed_value: '',
      });
    }
  }, [open, field]);

  const handleNameChange = (name: string) => {
    const slug = field ? formData.slug : name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    setFormData(prev => ({ ...prev, name, slug }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      const maxOrder = fields.length > 0
        ? Math.max(...fields.map(f => f.display_order))
        : 0;

      const docSettings = showDocumentConfig ? {
        doc_multiple: formData.doc_multiple || false,
        ...(formData.doc_max_size_mb ? { doc_max_size_mb: formData.doc_max_size_mb } : {}),
        ...(formData.doc_accepted_formats ? { doc_accepted_formats: formData.doc_accepted_formats } : {}),
      } : {};

      const dateSettings = showDateFormat && formData.date_format && formData.date_format !== 'dd/MM/yyyy' ? {
        date_format: formData.date_format,
      } : {};

      const refDisplaySettings = showObjectReference ? {
        ...(formData.ref_display_field_id ? { ref_display_field_id: formData.ref_display_field_id } : {}),
        ...(formData.ref_secondary_field_id ? { ref_secondary_field_id: formData.ref_secondary_field_id } : {}),
      } : {};

      const aggregationSettings = showAggregation ? {
        aggregation_source_field: formData.aggregation_source_field || null,
        aggregation_source_type: selectedSourceOption?.sourceType || null,
        aggregation_target_field_id: formData.aggregation_target_field_id || null,
        aggregation_editable: formData.aggregation_editable || false,
      } : {};

      const validationRulesObj: Record<string, unknown> = {};
      if (isTextType && formData.max_length) validationRulesObj.max_length = formData.max_length;
      if (formData.cross_field_rules.length > 0) validationRulesObj.cross_field_rules = formData.cross_field_rules;
      const validationRules = Object.keys(validationRulesObj).length > 0 ? validationRulesObj : null;

      const autoGenerateSettings = formData.auto_generate_enabled ? {
        auto_generate: {
          enabled: true,
          mode: formData.auto_generate_mode,
          config: {
            ...(formData.auto_generate_mode === 'counter' || formData.auto_generate_mode === 'prefix_counter'
              ? { padding: formData.auto_generate_padding, ...(formData.auto_generate_prefix ? { prefix: formData.auto_generate_prefix } : {}) }
              : {}),
            ...(formData.auto_generate_mode === 'date' ? { date_format: formData.auto_generate_date_format } : {}),
            ...(formData.auto_generate_mode === 'fixed_value' ? { fixed_value: formData.auto_generate_fixed_value } : {}),
          },
        },
      } : { auto_generate: { enabled: false } };

      const existingSettings = field ? ((field.settings || {}) as Record<string, unknown>) : {};
      const mergedSettings = {
        ...existingSettings,
        ...docSettings,
        ...dateSettings,
        ...refDisplaySettings,
        ...aggregationSettings,
        ...autoGenerateSettings,
        is_unique: formData.is_unique,
      };
      const hasSettings = Object.keys(mergedSettings).length > 0;

      if (field) {
        await updateMutation.mutateAsync({
          id: field.id,
          name: formData.name,
          description: formData.description || null,
          field_type: formData.field_type as FieldType,
          is_required: formData.is_required,
          is_readonly: formData.field_type === 'calculated' ? true : formData.is_readonly,
          is_hidden: formData.is_hidden,
          placeholder: formData.placeholder || null,
          parent_field_id: formData.parent_field_id || null,
          referential_id: showReferential ? formData.referential_id || null : null,
          reference_object_definition_id: showObjectReference ? formData.reference_object_definition_id || null : null,
          calculation_formula: showFormula ? formData.calculation_formula || null : null,
          default_value: showReferential || formData.field_type === 'checkbox' ? formData.default_value || null : null,
          ...(validationRules ? { validation_rules: validationRules } : { validation_rules: null }),
          ...(hasSettings ? { settings: mergedSettings } : {}),
        });
        toast.success('Champ modifié');
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          field_type: formData.field_type as FieldType,
          is_required: formData.is_required,
          is_readonly: formData.field_type === 'calculated' ? true : formData.is_readonly,
          is_hidden: formData.is_hidden,
          placeholder: formData.placeholder || null,
          parent_field_id: formData.parent_field_id || null,
          object_definition_id: objectDefinitionId,
          display_order: maxOrder + 1,
          referential_id: showReferential ? formData.referential_id || null : null,
          reference_object_definition_id: showObjectReference ? formData.reference_object_definition_id || null : null,
          calculation_formula: showFormula ? formData.calculation_formula || null : null,
          default_value: showReferential || formData.field_type === 'checkbox' ? formData.default_value || null : null,
          ...(validationRules ? { validation_rules: validationRules } : {}),
          ...(hasSettings ? { settings: mergedSettings } : {}),
        });
        toast.success('Champ créé');
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {field ? 'Modifier le champ' : 'Nouveau champ'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          {/* Name + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du champ *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Numéro SIRET"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Aide pour les utilisateurs"
              />
            </div>
          </div>

          {/* Field type */}
          <FieldTypeSelector
            value={formData.field_type}
            onValueChange={(value) => setFormData(prev => {
              const updates: Record<string, unknown> = { field_type: value };
              if (value === 'calculated') updates.is_readonly = true;
              const validModes = ['fixed_value'];
              if (['text', 'textarea', 'number', 'decimal'].includes(value)) validModes.push('counter');
              if (['text', 'textarea'].includes(value)) validModes.push('uuid');
              if (['text', 'textarea', 'date', 'datetime'].includes(value)) validModes.push('date');
              if (!validModes.includes(prev.auto_generate_mode)) updates.auto_generate_mode = 'fixed_value';
              return { ...prev, ...updates } as typeof prev;
            })}
            groupedFieldTypes={groupedFieldTypes}
          />

          {/* Date format */}
          {showDateFormat && (
            <FieldDateFormatConfig
              fieldType={formData.field_type}
              dateFormat={formData.date_format}
              onDateFormatChange={(v) => setFormData(prev => ({ ...prev, date_format: v }))}
            />
          )}

          {/* Max length for text fields */}
          {isTextType && (
            <div className="space-y-2">
              <Label>Longueur maximale</Label>
              <Input
                type="number"
                min={1}
                value={formData.max_length ?? ''}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    max_length: e.target.value ? parseInt(e.target.value, 10) : null,
                  }))
                }
                placeholder="Aucune limite"
              />
              <p className="text-xs text-muted-foreground">Laisser vide pour aucune limite</p>
            </div>
          )}

          {/* Referential for select/multiselect */}
          {showReferential && (
            <div className="space-y-2">
              <Label>Liste</Label>
              <Popover open={refPopoverOpen} onOpenChange={setRefPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={refPopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.referential_id
                      ? listes.find((r: { id: string; name: string }) => r.id === formData.referential_id)?.name || 'Sélectionner une liste'
                      : 'Sélectionner une liste'}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher une liste..." />
                    <CommandList>
                      <CommandEmpty>Aucune liste trouvée</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            setFormData(prev => ({ ...prev, referential_id: null, default_value: null }));
                            setRefPopoverOpen(false);
                          }}
                        >
                          <Check className={cn('h-4 w-4 mr-2', !formData.referential_id ? 'opacity-100' : 'opacity-0')} />
                          Aucune
                        </CommandItem>
                        {listes.map((ref: { id: string; name: string }) => (
                          <CommandItem
                            key={ref.id}
                            value={ref.name}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, referential_id: ref.id, default_value: null }));
                              setRefPopoverOpen(false);
                            }}
                          >
                            <Check className={cn('h-4 w-4 mr-2', formData.referential_id === ref.id ? 'opacity-100' : 'opacity-0')} />
                            {ref.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Les valeurs seront issues de cette liste</p>

              {/* Default value picker */}
              {formData.referential_id && listeValues.length > 0 && (() => {
                const isMulti = formData.field_type === 'multiselect';
                const selectedIds = isMulti && formData.default_value ? formData.default_value.split(',').filter(Boolean) : [];
                const selectedLabels = isMulti
                  ? selectedIds.map(id => listeValues.find(rv => rv.id === id)?.label).filter(Boolean)
                  : [];
                const displayLabel = isMulti
                  ? (selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Aucune')
                  : (formData.default_value ? listeValues.find(rv => rv.id === formData.default_value)?.label || 'Aucune' : 'Aucune');
                return (
                <div className="space-y-2 mt-3">
                  <Label>Valeur{isMulti ? 's' : ''} par défaut</Label>
                  <Popover open={defaultValuePopoverOpen} onOpenChange={setDefaultValuePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={defaultValuePopoverOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">{displayLabel}</span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher une valeur..." />
                        <CommandList>
                          <CommandEmpty>Aucune valeur trouvée</CommandEmpty>
                          <CommandGroup>
                            {!isMulti && (
                              <CommandItem
                                value="__none__"
                                onSelect={() => {
                                  setFormData(prev => ({ ...prev, default_value: null }));
                                  setDefaultValuePopoverOpen(false);
                                }}
                              >
                                <Check className={cn('h-4 w-4 mr-2', !formData.default_value ? 'opacity-100' : 'opacity-0')} />
                                Aucune
                              </CommandItem>
                            )}
                            {listeValues.map((rv) => {
                              const isSelected = isMulti ? selectedIds.includes(rv.id) : formData.default_value === rv.id;
                              return (
                                <CommandItem
                                  key={rv.id}
                                  value={rv.label}
                                  onSelect={() => {
                                    if (isMulti) {
                                      setFormData(prev => {
                                        const ids = prev.default_value ? prev.default_value.split(',').filter(Boolean) : [];
                                        const next = ids.includes(rv.id) ? ids.filter(id => id !== rv.id) : [...ids, rv.id];
                                        return { ...prev, default_value: next.length > 0 ? next.join(',') : null };
                                      });
                                    } else {
                                      setFormData(prev => ({ ...prev, default_value: rv.id }));
                                      setDefaultValuePopoverOpen(false);
                                    }
                                  }}
                                >
                                  <Check className={cn('h-4 w-4 mr-2', isSelected ? 'opacity-100' : 'opacity-0')} />
                                  {rv.label}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {isMulti && selectedIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setFormData(prev => ({ ...prev, default_value: null }))}
                    >
                      Tout effacer <XIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                );
              })()}
            </div>
          )}

          {/* Object reference */}
          {showObjectReference && (
            <FieldReferenceConfig
              referenceObjectDefinitionId={formData.reference_object_definition_id}
              refDisplayFieldId={formData.ref_display_field_id}
              refSecondaryFieldId={formData.ref_secondary_field_id}
              objectDefinitionId={objectDefinitionId}
              businessObjects={businessObjects}
              refBoFields={refBoFields}
              onReferenceObjectChange={(v) => setFormData(prev => ({ ...prev, reference_object_definition_id: v }))}
              onDisplayFieldChange={(v) => setFormData(prev => ({ ...prev, ref_display_field_id: v }))}
              onSecondaryFieldChange={(v) => setFormData(prev => ({ ...prev, ref_secondary_field_id: v }))}
            />
          )}

          {/* Formula */}
          {showFormula && (
            <div className="space-y-2">
              <Label>Formule de calcul</Label>
              <FormulaEditor
                value={formData.calculation_formula}
                onChange={(v) => setFormData(prev => ({ ...prev, calculation_formula: v }))}
                fields={fields}
                currentFieldId={field?.id}
              />
            </div>
          )}

          {/* Document config */}
          {showDocumentConfig && (
            <FieldDocumentConfig
              docMultiple={formData.doc_multiple}
              docMaxSizeMb={formData.doc_max_size_mb}
              docAcceptedFormats={formData.doc_accepted_formats}
              onMultipleChange={(v) => setFormData(prev => ({ ...prev, doc_multiple: v }))}
              onMaxSizeChange={(v) => setFormData(prev => ({ ...prev, doc_max_size_mb: v }))}
              onFormatsChange={(v) => setFormData(prev => ({ ...prev, doc_accepted_formats: v }))}
            />
          )}

          {/* Checkbox default value */}
          {formData.field_type === 'checkbox' && (
            <div className="space-y-2">
              <Label>Valeur par défaut</Label>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.default_value === 'true'}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, default_value: checked ? 'true' : 'false' }))
                  }
                />
                <span className="text-sm">{formData.default_value === 'true' ? 'Coché' : 'Non coché'}</span>
              </div>
            </div>
          )}

          {/* Aggregation config */}
          {showAggregation && (
            <FieldAggregationConfig
              aggregationSourceField={formData.aggregation_source_field}
              aggregationTargetFieldId={formData.aggregation_target_field_id}
              aggregationEditable={formData.aggregation_editable}
              aggregationSourceOptions={aggregationSourceOptions}
              aggregationTargetOptions={aggregationTargetOptions}
              onSourceChange={(v) => setFormData(prev => ({ ...prev, aggregation_source_field: v, aggregation_target_field_id: null }))}
              onTargetChange={(v) => setFormData(prev => ({ ...prev, aggregation_target_field_id: v }))}
              onEditableChange={(v) => setFormData(prev => ({ ...prev, aggregation_editable: v }))}
            />
          )}

          {/* Validation toggles */}
          <Separator />

          {!showAggregation && !showFormula && formData.field_type !== 'checkbox' && (
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_required}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_required: v }))}
              />
              <Label>Champ obligatoire</Label>
            </div>
          )}

          {!showAggregation && !showFormula && !['checkbox', 'document'].includes(formData.field_type) && (
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_unique}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_unique: v }))}
              />
              <Label>Valeur unique</Label>
            </div>
          )}

          {/* Auto-generate */}
          {!showAggregation && !showFormula && !['checkbox', 'document'].includes(formData.field_type) && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Génération automatique</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.auto_generate_enabled}
                    onCheckedChange={(v) => setFormData(prev => ({ ...prev, auto_generate_enabled: v }))}
                  />
                  <Label>Générer automatiquement si le champ est vide</Label>
                </div>
                {formData.auto_generate_enabled && (
                  <div className="ml-6 space-y-3">
                    <div className="space-y-2">
                      <Label>Mode de génération</Label>
                      <Select
                        value={formData.auto_generate_mode}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, auto_generate_mode: v as typeof formData.auto_generate_mode }))}
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
                        Génère un numéro incrémental (1, 2, 3…).
                      </p>
                    )}

                    {formData.auto_generate_mode === 'date' && (
                      <div className="space-y-1">
                        <Label className="text-xs">Format de date</Label>
                        <Select
                          value={formData.auto_generate_date_format}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, auto_generate_date_format: v }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (2026-02-23)</SelectItem>
                            <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (23/02/2026)</SelectItem>
                            <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (02/23/2026)</SelectItem>
                            <SelectItem value="dd-MM-yyyy">dd-MM-yyyy (23-02-2026)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.auto_generate_mode === 'fixed_value' && (
                      <div className="space-y-1">
                        <Label className="text-xs">Valeur</Label>
                        <Input
                          value={formData.auto_generate_fixed_value}
                          onChange={(e) => setFormData(prev => ({ ...prev, auto_generate_fixed_value: e.target.value }))}
                          placeholder="Valeur par défaut"
                        />
                      </div>
                    )}

                    {formData.auto_generate_mode === 'uuid' && (
                      <p className="text-xs text-muted-foreground">
                        Un identifiant unique (UUID) sera généré automatiquement.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Cross-field validation rules */}
          {['text', 'textarea', 'email', 'phone', 'url', 'date', 'datetime', 'number', 'decimal', 'select', 'multiselect', 'checkbox'].includes(formData.field_type) && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Règles de validation inter-champs</span>
                </div>

                {formData.cross_field_rules.map((rule, idx) => {
                  const compatibleRules = getCompatibleRuleTypes(formData.field_type);
                  const compatibleTargets = rule.type
                    ? getCompatibleTargetFields(rule.type, field?.id || '', fields as import('@/hooks/useEoFieldDefinitions').EoFieldDefinition[])
                    : [];

                  return (
                    <div key={idx} className="flex items-center gap-2 bg-muted/30 rounded-md p-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Select
                          value={rule.type}
                          onValueChange={(v) => {
                            const updated = [...formData.cross_field_rules];
                            updated[idx] = { ...updated[idx], type: v as CrossFieldRule['type'], target_field_id: '' };
                            setFormData(prev => ({ ...prev, cross_field_rules: updated }));
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
                            setFormData(prev => ({ ...prev, cross_field_rules: updated }));
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
                          setFormData(prev => ({
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
                    setFormData(prev => ({
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
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || isPending}
          >
            {field ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
