import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEoFieldDefinitions,
} from '@/hooks/useEoFieldDefinitions';
import { api } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useCreateEoFieldDefinition,
  useUpdateEoFieldDefinition,
  type EoFieldDefinition,
} from '@/hooks/useEoFieldDefinitions';
import {
  type CrossFieldRule,
  getCrossFieldRules,
} from '@/lib/eo/eo-cross-field-validation';
import { buildFieldPayload, buildViewFieldUpdates } from '@/lib/eo/eo-field-payload-builder';
import { toast } from 'sonner';
import { useReferentials } from '@/hooks/useReferentials';
import { generateUniqueFieldSlug } from '@/lib/csv-parser';
import { FieldTypeConfig } from './FieldTypeConfig';
import { FieldValidationRules } from './FieldValidationRules';
import { ViewSelectionStep } from './ViewSelectionStep';
import { useEoCardViews } from './useEoCardViews';
import { queryKeys } from '@/lib/query-keys';

interface EoFieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  field?: EoFieldDefinition | null;
  fieldsCount: number;
  showAddToViews?: boolean;
}

export function EoFieldFormDialog({
  open,
  onOpenChange,
  clientId,
  field,
  fieldsCount,
  showAddToViews = false,
}: EoFieldFormDialogProps) {
  const queryClient = useQueryClient();
  const createField = useCreateEoFieldDefinition();
  const updateField = useUpdateEoFieldDefinition();
  const { data: allFields = [] } = useEoFieldDefinitions(open ? clientId : undefined);

  // Step management
  type DialogStep = 'form' | 'views';
  const [step, setStep] = useState<DialogStep>('form');
  const [savingViews, setSavingViews] = useState(false);
  const [hasEoCardViews, setHasEoCardViews] = useState<boolean | null>(null);

  const { data: referentials = [] } = useReferentials();

  // View selection (step 2)
  const {
    views,
    viewsLoading,
    selections,
    toggleSelection,
    allColumnsChecked,
    allVisibilityChecked,
    toggleAllColumns,
    toggleAllVisibility,
    hasAnySelection,
    reset: resetViews,
  } = useEoCardViews(clientId, step === 'views');

  // Pre-check: are there any views with eo_card blocks?
  useEffect(() => {
    if (!open || !clientId || !showAddToViews) return;
    const check = async () => {
      const data = await api.get<Array<{ id: string; config: Record<string, unknown> }>>(
        `/api/view-configs?client_id=${clientId}&is_active=true`
      );
      const count = (data || []).filter((vc) => {
        const blocks = (vc.config as Record<string, unknown>)?.blocks;
        return Array.isArray(blocks) && blocks.some((b: Record<string, unknown>) => b.type === 'eo_card');
      }).length;
      setHasEoCardViews(count > 0);
    };
    check();
  }, [open, clientId, showAddToViews]);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    field_type: 'text',
    is_required: false,
    is_unique: false,
    options: [] as string[],
    default_value: null as string | null,
    referential_id: null as string | null,
    max_length: null as number | null,
    comment_enabled: false,
    comment_required: false,
    comment_transitions: [] as { from: string; to: string }[],
    auto_generate_enabled: false,
    auto_generate_mode: 'counter' as 'counter' | 'prefix_counter' | 'uuid' | 'date' | 'fixed_value',
    auto_generate_prefix: '',
    auto_generate_padding: 5,
    auto_generate_date_format: 'yyyy-MM-dd',
    auto_generate_fixed_value: '',
    cross_field_rules: [] as CrossFieldRule[],
    format_enabled: false,
    format_type: 'zero_pad' as const,
    format_length: 5,
    boolean_true_label: 'Actif',
    boolean_false_label: 'Inactif',
  });
  const [optionInput, setOptionInput] = useState('');

  useEffect(() => {
    if (open) {
      setStep('form');
      resetViews();
      if (field) {
        const commentRules = field.settings?.comment_rules;
        const autoGen = field.settings?.auto_generate;
        const fmt = field.settings?.format;
        const boolLabels = field.settings?.boolean_labels;
        setFormData({
          name: field.name,
          slug: field.slug,
          description: field.description || '',
          field_type: field.field_type,
          is_required: field.is_required,
          is_unique: field.is_unique,
          options: (field.options || []).map((o) =>
            typeof o === 'string' ? o : o.label || o.value
          ),
          default_value: field.default_value != null ? String(field.default_value) : null,
          referential_id: field.settings?.referential_id ?? null,
          max_length: (field.validation_rules?.max_length as number) ?? null,
          comment_enabled: commentRules?.enabled ?? false,
          comment_required: commentRules?.required ?? false,
          comment_transitions: commentRules?.transitions ?? [],
          auto_generate_enabled: autoGen?.enabled ?? false,
          auto_generate_mode: (autoGen?.mode as 'counter' | 'prefix_counter' | 'uuid' | 'date' | 'fixed_value') ?? 'counter',
          auto_generate_prefix: (autoGen?.config?.prefix as string) ?? '',
          auto_generate_padding: (autoGen?.config?.padding as number) ?? 5,
          auto_generate_date_format: (autoGen?.config?.date_format as string) ?? 'yyyy-MM-dd',
          auto_generate_fixed_value: (autoGen?.config?.fixed_value as string) ?? '',
          cross_field_rules: getCrossFieldRules(field),
          format_enabled: !!fmt?.type,
          format_type: (fmt?.type as 'zero_pad') ?? 'zero_pad',
          format_length: fmt?.length ?? 5,
          boolean_true_label: boolLabels?.true_label ?? 'Actif',
          boolean_false_label: boolLabels?.false_label ?? 'Inactif',
        });
      } else {
        setFormData({
          name: '',
          slug: '',
          description: '',
          field_type: 'text',
          is_required: false,
          is_unique: false,
          options: [],
          default_value: null,
          referential_id: null,
          max_length: null,
          comment_enabled: false,
          comment_required: false,
          comment_transitions: [],
          auto_generate_enabled: false,
          auto_generate_mode: 'counter',
          auto_generate_prefix: '',
          auto_generate_padding: 5,
          auto_generate_date_format: 'yyyy-MM-dd',
          auto_generate_fixed_value: '',
          cross_field_rules: [],
          format_enabled: false,
          format_type: 'zero_pad',
          format_length: 5,
          boolean_true_label: 'Actif',
          boolean_false_label: 'Inactif',
        });
      }
      setOptionInput('');
    }
  }, [open, field]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: field ? prev.slug : generateUniqueFieldSlug(name),
    }));
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        options: [...prev.options, optionInput.trim()],
      }));
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData((prev) => {
      const removed = prev.options[index];
      return {
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
        default_value: prev.default_value === removed ? null : prev.default_value,
      };
    });
  };

  const showOptions = ['select', 'multiselect'].includes(formData.field_type);
  const isSystemField = !!field?.settings?.is_system_field;
  const isSystemIsActive = field?.slug === '__system_is_active';
  const isTextType = ['text', 'textarea', 'email', 'phone', 'url'].includes(formData.field_type);
  const isPending = createField.isPending || updateField.isPending;

  const buildPayload = () => buildFieldPayload(formData, field, showOptions, isSystemIsActive);

  const handleSubmit = async () => {
    const { options, validation_rules, settings, default_value } = buildPayload();

    if (field) {
      await updateField.mutateAsync({
        id: field.id,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        field_type: formData.field_type,
        is_required: formData.is_required,
        is_unique: formData.is_unique,
        options,
        default_value,
        validation_rules,
        settings,
      });
      onOpenChange(false);
    } else if (showAddToViews && hasEoCardViews && step === 'form') {
      setStep('views');
    } else {
      await createField.mutateAsync({
        client_id: clientId,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        field_type: formData.field_type,
        is_required: formData.is_required,
        is_unique: formData.is_unique,
        options,
        default_value,
        display_order: fieldsCount,
        validation_rules,
        settings,
      });
      onOpenChange(false);
    }
  };

  /** Create field + update selected views in one go */
  const handleCreateAndAddToViews = async () => {
    setSavingViews(true);
    try {
      const { options, validation_rules, settings, default_value } = buildPayload();

      const created = await createField.mutateAsync({
        client_id: clientId,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        field_type: formData.field_type,
        is_required: formData.is_required,
        is_unique: formData.is_unique,
        options,
        default_value,
        display_order: fieldsCount,
        validation_rules,
        settings,
      });

      if (!created) throw new Error('Échec de la création du champ');

      const selectedColumns = new Set(
        Object.entries(selections).filter(([, s]) => s.columns).map(([id]) => id)
      );
      const selectedVisibility = new Set(
        Object.entries(selections).filter(([, s]) => s.visibility).map(([id]) => id)
      );
      const viewUpdates = buildViewFieldUpdates(
        views.map(v => ({ id: v.id, config: v.config })),
        created,
        selectedColumns,
        selectedVisibility,
      );

      let updatedCount = 0;
      for (const update of viewUpdates) {
        await api.patch(`/api/view-configs/${update.viewId}`, {
          config: update.config,
          updated_at: new Date().toISOString(),
        });
        updatedCount++;
      }

      if (updatedCount > 0) {
        toast.success(`Champ créé et ajouté à ${updatedCount} vue${updatedCount > 1 ? 's' : ''}`);
        queryClient.invalidateQueries({ queryKey: queryKeys.viewConfigs.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.roleUsages.all() });
      }

      onOpenChange(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('Failed to create field and update views:', e);
      toast.error(`Erreur: ${message}`);
    } finally {
      setSavingViews(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'views'
              ? `Ajouter \u00AB ${formData.name} \u00BB aux vues`
              : field ? 'Modifier le champ' : 'Nouveau champ'}
          </DialogTitle>
          {step === 'views' && (
            <DialogDescription>
              Sélectionnez les vues où ajouter ce champ, ou passez cette étape
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'form' ? (
        <>
        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          <FieldTypeConfig
            formData={formData}
            onFormDataChange={(updater) => setFormData(prev => ({ ...prev, ...updater(prev) }))}
            optionInput={optionInput}
            onOptionInputChange={setOptionInput}
            onNameChange={handleNameChange}
            onAddOption={handleAddOption}
            onRemoveOption={handleRemoveOption}
            isSystemField={isSystemField}
            isSystemIsActive={isSystemIsActive}
            showOptions={showOptions}
            isTextType={isTextType}
            referentials={referentials}
          />

          <FieldValidationRules
            formData={formData}
            onFormDataChange={(updater) => setFormData(prev => ({ ...prev, ...updater(prev) }))}
            isSystemField={isSystemField}
            isSystemIsActive={isSystemIsActive}
            fieldId={field?.id}
            allFields={allFields}
          />
        </div>

        {/* Step 1 footer */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || isPending}
          >
            {field ? 'Enregistrer' : showAddToViews ? 'Suivant' : 'Créer'}
          </Button>
        </DialogFooter>
        </>
        ) : (
        /* Step 2: View selection */
        <ViewSelectionStep
          views={views}
          viewsLoading={viewsLoading}
          selections={selections}
          onToggleSelection={toggleSelection}
          onToggleAllColumns={toggleAllColumns}
          onToggleAllVisibility={toggleAllVisibility}
          allColumnsChecked={allColumnsChecked}
          allVisibilityChecked={allVisibilityChecked}
          hasAnySelection={hasAnySelection}
          savingViews={savingViews}
          isPending={isPending}
          onBack={() => setStep('form')}
          onSkip={handleSubmit}
          onCreateAndAdd={handleCreateAndAddToViews}
        />
        )}
      </DialogContent>
    </Dialog>
  );
}
