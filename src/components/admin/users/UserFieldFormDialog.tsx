import { useState, useMemo } from 'react';
import { z } from 'zod';
import { type UseFormReturn } from 'react-hook-form';
import { FormDialog } from '@/components/ui/form-dialog';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FloatingInput } from '@/components/ui/floating-input';
import { Switch } from '@/components/ui/switch';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  X as XIcon,
  Archive,
} from 'lucide-react';
import {
  useCreateUserFieldDefinition,
  useUpdateUserFieldDefinition,
  type UserFieldDefinition,
} from '@/hooks/useUserFieldDefinitions';
import { computeInitials, DEFAULT_INITIALS_CONFIG, type InitialsConfig } from '@/lib/user-initials';
import { generateUniqueFieldSlug } from '@/lib/csv-parser';
import { FIELD_TYPES } from '@/lib/field-type-registry';

// User field types — exclude BO-specific / special types
const USER_EXCLUDED = ['decimal', 'datetime', 'time', 'document', 'file', 'image', 'user_reference', 'eo_reference', 'object_reference', 'calculated', 'aggregation', 'section'];
const USER_FIELD_TYPES = FIELD_TYPES.filter((t) => !USER_EXCLUDED.includes(t.value));

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  description: z.string(),
  field_type: z.string(),
  is_required: z.boolean(),
  is_unique: z.boolean(),
  is_user_editable: z.boolean(),
  options: z.array(z.string()),
  default_value: z.string().nullable(),
  settings: z.record(z.unknown()),
});
type FormValues = z.infer<typeof schema>;

interface UserFieldFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  field?: UserFieldDefinition | null;
  fieldsCount: number;
  defaultUserEditable?: boolean;
  onArchive?: (field: UserFieldDefinition) => void;
}

export function UserFieldFormDialog({
  open,
  onOpenChange,
  clientId,
  field,
  fieldsCount,
  defaultUserEditable = false,
  onArchive,
}: UserFieldFormDialogProps) {
  const createField = useCreateUserFieldDefinition();
  const updateField = useUpdateUserFieldDefinition();
  const [optionInput, setOptionInput] = useState('');

  const isPending = createField.isPending || updateField.isPending;

  const defaultValues = useMemo<FormValues>(() => {
    if (field) {
      return {
        name: field.name,
        description: field.description || '',
        field_type: field.field_type,
        is_required: field.is_required,
        is_unique: field.is_unique,
        is_user_editable: field.is_user_editable,
        options: (field.options || []).map((o: unknown) =>
          typeof o === 'string' ? o : (o as { label?: string; value?: string }).label || (o as { label?: string; value?: string }).value || ''
        ),
        default_value: field.default_value != null ? String(field.default_value) : null,
        settings: field.settings || {},
      };
    }
    return {
      name: '',
      description: '',
      field_type: 'text',
      is_required: false,
      is_unique: false,
      is_user_editable: defaultUserEditable,
      options: [],
      default_value: null,
      settings: {},
    };
  }, [field, defaultUserEditable]);

  const handleSubmit = async (values: FormValues) => {
    const isInitials = values.field_type === 'initials';
    const showOptions = ['select', 'multiselect'].includes(values.field_type);
    const options = values.options.map((o) => ({ value: o, label: o }));
    const default_value = showOptions && values.default_value ? values.default_value : null;

    const payload: Record<string, unknown> = {
      name: values.name,
      description: values.description || null,
      field_type: values.field_type,
      is_required: isInitials ? false : values.is_required,
      is_unique: isInitials ? false : values.is_unique,
      is_user_editable: values.is_user_editable,
      options,
      default_value,
    };

    if (isInitials) {
      payload.settings = { initials_config: { ...DEFAULT_INITIALS_CONFIG, ...(values.settings?.initials_config || {}) } };
    }

    if (field) {
      await updateField.mutateAsync({ id: field.id, ...payload });
    } else {
      await createField.mutateAsync({
        ...payload,
        client_id: clientId,
        slug: generateUniqueFieldSlug(values.name),
        display_order: fieldsCount,
      });
    }
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setOptionInput('');
        onOpenChange(isOpen);
      }}
      title={field ? 'Modifier le champ' : 'Nouveau champ utilisateur'}
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={field ? 'Mettre à jour' : 'Créer'}
      className="sm:max-w-[480px] max-h-[85vh] flex flex-col"
      footerLeft={
        field && onArchive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => { onArchive(field); onOpenChange(false); }}
          >
            Archiver
            <Archive className="h-4 w-4" />
          </Button>
        ) : undefined
      }
    >
      {(form) => (
        <UserFieldFormFields
          form={form}
          optionInput={optionInput}
          setOptionInput={setOptionInput}
        />
      )}
    </FormDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner form fields component                                       */
/* ------------------------------------------------------------------ */

function UserFieldFormFields({
  form,
  optionInput,
  setOptionInput,
}: {
  form: UseFormReturn<FormValues>;
  optionInput: string;
  setOptionInput: (v: string) => void;
}) {
  const fieldType = form.watch('field_type');
  const options = form.watch('options');
  const settings = form.watch('settings');
  const defaultValue = form.watch('default_value');

  const showOptions = ['select', 'multiselect'].includes(fieldType);
  const isInitials = fieldType === 'initials';

  const initialsConfig: InitialsConfig = {
    ...DEFAULT_INITIALS_CONFIG,
    ...(settings?.initials_config || {}),
  };
  const previewInitials = isInitials ? computeInitials('Jean-Pierre Dupont', initialsConfig) : '';

  const handleAddOption = () => {
    if (optionInput.trim()) {
      form.setValue('options', [...options, optionInput.trim()]);
      setOptionInput('');
    }
  };

  const handleRemoveOption = (index: number) => {
    const removed = options[index];
    form.setValue('options', options.filter((_, i) => i !== index));
    if (defaultValue === removed) {
      form.setValue('default_value', null);
    }
  };

  const updateInitialsConfig = (key: keyof InitialsConfig, value: InitialsConfig[keyof InitialsConfig]) => {
    form.setValue('settings', {
      ...settings,
      initials_config: {
        ...DEFAULT_INITIALS_CONFIG,
        ...(settings?.initials_config || {}),
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-4 overflow-y-auto flex-1 pr-1">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FloatingInput label="Nom du champ *" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <FloatingInput label="Description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="field_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type de champ</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {USER_FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Options for select/multiselect */}
      {showOptions && (
        <div className="space-y-2">
          <FormLabel>Options</FormLabel>
          <div className="flex gap-2">
            <Input
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              placeholder="Nouvelle option"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleAddOption}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {options.map((opt, i) => (
                <Chip key={i} variant="default" className="gap-1">
                  {opt}
                  <Button type="button" variant="ghost" size="icon" className="h-4 w-4 p-0" onClick={() => handleRemoveOption(i)}>
                    <XIcon className="h-3 w-3" />
                  </Button>
                </Chip>
              ))}
            </div>
          )}
          {options.length > 0 && (
            <div className="space-y-1">
              <FormLabel className="text-xs text-muted-foreground">Valeur par défaut</FormLabel>
              <Select
                value={defaultValue || '__none__'}
                onValueChange={(v) => form.setValue('default_value', v === '__none__' ? null : v)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune</SelectItem>
                  {options.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Initials configuration */}
      {isInitials && (
        <div className="space-y-4 p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <FormLabel className="text-sm font-medium">Configuration des initiales</FormLabel>
            <Chip variant="outline" className="text-base font-semibold tracking-wider px-3">
              {previewInitials || '??'}
            </Chip>
          </div>
          <p className="text-xs text-muted-foreground">
            Aperçu pour « Jean-Pierre Dupont »
          </p>

          <div className="space-y-2">
            <FormLabel className="text-xs">Source</FormLabel>
            <Select
              value={initialsConfig.source}
              onValueChange={(v) => updateInitialsConfig('source', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first_last">Prénom + Nom</SelectItem>
                <SelectItem value="first_only">Prénom seul</SelectItem>
                <SelectItem value="last_only">Nom seul</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FormLabel className="text-xs">Caractères par mot</FormLabel>
            <Input
              type="number"
              min={1}
              max={5}
              className="h-8 text-sm"
              value={initialsConfig.chars_per_part}
              onChange={(e) => updateInitialsConfig('chars_per_part', Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
            />
          </div>

          <div className="space-y-2">
            <FormLabel className="text-xs">Casse</FormLabel>
            <Select
              value={initialsConfig.case_style}
              onValueChange={(v) => updateInitialsConfig('case_style', v)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upper">MAJUSCULES</SelectItem>
                <SelectItem value="lower">minuscules</SelectItem>
                <SelectItem value="capitalize">Capitalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FormLabel className="text-xs">Séparateur</FormLabel>
            <Input
              className="h-8 text-sm"
              value={initialsConfig.separator}
              onChange={(e) => updateInitialsConfig('separator', e.target.value)}
              placeholder="Aucun"
              maxLength={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <FormLabel className="text-xs">Inclure les prénoms composés</FormLabel>
            <Switch
              checked={initialsConfig.include_compound}
              onCheckedChange={(v) => updateInitialsConfig('include_compound', v)}
            />
          </div>
        </div>
      )}

      {/* Toggles — hidden for initials type */}
      {!isInitials && (
        <>
          <FormField
            control={form.control}
            name="is_required"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Obligatoire</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="is_unique"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Valeur unique</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </>
      )}

    </div>
  );
}
