import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FloatingInput } from '@/components/ui/floating-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCreateOrganizationalEntity,
} from '@/hooks/useOrganizationalEntities';
import { useEoFieldDefinitions, useUpsertEoFieldValue, useEoSystemNameField, useEoSystemIsActiveField, type EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { useResolvedEoOptions } from '@/hooks/useResolvedEoOptions';
import { generateEntityCode, generateBaseSlug } from '@/lib/slug-utils';
import { getAutoGenerateConfig, generateAutoValue } from '@/lib/eo/eo-auto-generate';
import { validateCrossFieldRules } from '@/lib/eo/eo-cross-field-validation';
import { checkEoFieldDuplicate, checkEoNameDuplicate } from '@/lib/eo/eo-unique-check';
import { validateActivation } from '@/lib/eo/eo-hierarchy-validation';
import { useT } from '@/hooks/useT';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  code: z.string().optional(),
  parent_id: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EoCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  /** Available parent entities the user can choose from */
  parentEntities: { id: string; name: string; path: string }[];
  /** Default parent ID (e.g. user's primary EO) */
  defaultParentId?: string | null;
}

function CustomFieldInput({ field, value, onChange, options }: { field: EoFieldDefinition; value: unknown; onChange: (v: unknown) => void; options: { value: string; label: string }[] }) {
  const { t } = useT();
  const maxLength = (field.validation_rules as Record<string, unknown> | null)?.max_length as number | undefined;
  const isTextType = ['text', 'textarea', 'email', 'phone', 'url'].includes(field.field_type);

  const charCounter = isTextType && maxLength ? (
    <p className="text-xs text-muted-foreground text-right">{(value || '').length} / {maxLength}</p>
  ) : null;

  switch (field.field_type) {
    case 'textarea':
      return <div className="space-y-1"><Textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.description || ''} className="resize-none" maxLength={maxLength} />{charCounter}</div>;
    case 'number':
      return <FloatingInput label={field.name} type="number" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} />;
    case 'date':
      return <FloatingInput label={field.name} type="date" value={value || ''} onChange={e => onChange(e.target.value)} />;
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox checked={value === true} onCheckedChange={checked => onChange(checked)} />
          <span className="text-sm text-muted-foreground">{field.description}</span>
        </div>
      );
    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={t('placeholders.select')} /></SelectTrigger>
          <SelectContent>
            {options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case 'multiselect':
      return (
        <div className="space-y-2">
          {options.map(opt => (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                checked={(value || []).includes(opt.value)}
                onCheckedChange={checked => {
                  const current = value || [];
                  onChange(checked ? [...current, opt.value] : current.filter((v: string) => v !== opt.value));
                }}
              />
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
        </div>
      );
    case 'email':
      return <div className="space-y-1"><FloatingInput label={field.name} type="email" value={value || ''} onChange={e => onChange(e.target.value)} maxLength={maxLength} />{charCounter}</div>;
    case 'url':
      return <div className="space-y-1"><FloatingInput label={field.name} type="url" value={value || ''} onChange={e => onChange(e.target.value)} maxLength={maxLength} />{charCounter}</div>;
    case 'phone':
      return <div className="space-y-1"><FloatingInput label={field.name} type="tel" value={value || ''} onChange={e => onChange(e.target.value)} maxLength={maxLength} />{charCounter}</div>;
    default:
      return <div className="space-y-1"><FloatingInput label={field.name} value={value || ''} onChange={e => onChange(e.target.value)} maxLength={maxLength} />{charCounter}</div>;
  }
}

export function EoCreateDialog({ open, onOpenChange, clientId, parentEntities, defaultParentId }: EoCreateDialogProps) {
  const { t } = useT();
  const { data: customFields = [] } = useEoFieldDefinitions(clientId);
  const { data: systemNameField } = useEoSystemNameField(clientId);
  const { data: systemIsActiveField } = useEoSystemIsActiveField(clientId);
  const createEntity = useCreateOrganizationalEntity();
  const upsertFieldValue = useUpsertEoFieldValue();

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      parent_id: defaultParentId || null,
    },
  });

  const activeCustomFields = customFields.filter(f => f.is_active);
  const { getOptions } = useResolvedEoOptions(activeCustomFields);

  /** Validate all custom fields. Returns true if valid. */
  const validateCustomFields = async (): Promise<boolean> => {
    const errors: Record<string, string> = {};

    for (const field of activeCustomFields) {
      const value = customFieldValues[field.id];
      const isEmpty = value === undefined || value === null || String(value).trim() === '';

      // Required check
      if (field.is_required && isEmpty) {
        errors[field.id] = t('eo.field_required', { name: field.name });
        continue;
      }

      // Uniqueness check
      if (field.is_unique && !isEmpty) {
        const isDuplicate = await checkEoFieldDuplicate(field.id, value);
        if (isDuplicate) {
          errors[field.id] = t('eo.field_duplicate', { name: field.name });
          continue;
        }
      }

      // Cross-field rules
      const crossError = validateCrossFieldRules(field, value, customFieldValues, activeCustomFields);
      if (crossError) {
        errors[field.id] = crossError;
      }
    }

    setCustomFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (values: FormValues) => {
    setNameError(null);

    // Check parent is active before creating
    if (values.parent_id) {
      const parentError = await validateActivation(values.parent_id);
      if (parentError) {
        toast.error(parentError);
        return;
      }
    }

    // Check name uniqueness if system field is configured as unique
    if (systemNameField?.is_unique) {
      const isDuplicate = await checkEoNameDuplicate(clientId, values.name);
      if (isDuplicate) {
        setNameError(t('errors.name_exists'));
        return;
      }
    }

    if (!(await validateCustomFields())) return;

    setIsSubmitting(true);
    try {
      const slug = generateBaseSlug(values.name);
      const code = values.code?.trim() || generateEntityCode();

      const newEntity = await createEntity.mutateAsync({
        name: values.name,
        slug,
        code,
        parent_id: values.parent_id || null,
        client_id: clientId,
        is_active: systemIsActiveField?.default_value === 'false' ? false : true,
      });

      // Save custom field values (user-provided + auto-generated)
      for (const field of activeCustomFields) {
        const userValue = customFieldValues[field.id];
        const hasValue = userValue !== undefined && userValue !== null && userValue !== '';

        if (hasValue) {
          await upsertFieldValue.mutateAsync({
            eo_id: newEntity.id,
            field_definition_id: field.id,
            value: userValue,
          });
        } else {
          // Try auto-generation
          const agConfig = getAutoGenerateConfig(field.settings);
          if (agConfig) {
            const generated = await generateAutoValue(field.id, agConfig);
            if (generated) {
              await upsertFieldValue.mutateAsync({
                eo_id: newEntity.id,
                field_definition_id: field.id,
                value: generated,
              });
            }
          }
        }
      }

      toast.success(t('eo.entity_created'));
      onOpenChange(false);
      form.reset({ name: '', code: '', parent_id: defaultParentId || null });
      setCustomFieldValues({});
      setCustomFieldErrors({});
      setNameError(null);
    } catch (error: unknown) {
      toast.error(`${t('errors.generic')}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('eo.new_entity')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingInput label={`${t('labels.name')} *`} {...field} onChange={(e) => { field.onChange(e); setNameError(null); }} />
                    </FormControl>
                    <FormMessage />
                    {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingInput label="ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => {
                const sortedParents = parentEntities.sort((a, b) => a.path.localeCompare(b.path));
                const selectedParent = sortedParents.find(p => p.id === field.value);
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('eo.parent_entity')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedParent
                              ? `${'—'.repeat(selectedParent.path.split('.').length - 1)} ${selectedParent.name}`
                              : t('eo.no_parent_root')}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('placeholders.search_entity')} />
                          <CommandList>
                            <CommandEmpty>{t('empty.no_entities')}</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="aucune-racine"
                                onSelect={() => field.onChange(null)}
                              >
                                <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                                {t('eo.no_parent_root')}
                              </CommandItem>
                              {sortedParents.map(parent => (
                                <CommandItem
                                  key={parent.id}
                                  value={parent.name}
                                  onSelect={() => field.onChange(parent.id)}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', field.value === parent.id ? 'opacity-100' : 'opacity-0')} />
                                  {'—'.repeat(parent.path.split('.').length - 1)} {parent.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Custom fields */}
            {activeCustomFields.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('eo.details')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeCustomFields.map(field => (
                      <div key={field.id} className={`space-y-1.5 ${field.field_type === 'textarea' || field.field_type === 'multiselect' ? 'sm:col-span-2' : ''}`}>
                        {(field.field_type === 'checkbox' || field.field_type === 'select' || field.field_type === 'multiselect' || field.field_type === 'textarea') && (
                          <label className="text-sm font-medium">
                            {field.name}
                            {field.is_required && <span className="text-destructive ml-1">*</span>}
                          </label>
                        )}
                        <CustomFieldInput
                          field={field}
                          value={customFieldValues[field.id]}
                          options={getOptions(field)}
                          onChange={v => {
                            setCustomFieldValues(prev => ({ ...prev, [field.id]: v }));
                            // Clear error on change
                            if (customFieldErrors[field.id]) {
                              setCustomFieldErrors(prev => { const n = { ...prev }; delete n[field.id]; return n; });
                            }
                          }}
                        />
                        {customFieldErrors[field.id] && (
                          <p className="text-xs text-destructive">{customFieldErrors[field.id]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('buttons.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('buttons.creating') : t('buttons.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
