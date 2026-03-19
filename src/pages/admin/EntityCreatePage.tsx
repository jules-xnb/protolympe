import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FloatingInput } from '@/components/ui/floating-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  useOrganizationalEntities,
  useCreateOrganizationalEntity,
} from '@/hooks/useOrganizationalEntities';
import { useEoFieldDefinitions, useUpsertEoFieldValue, EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { useResolvedEoOptions } from '@/hooks/useResolvedEoOptions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { generateEntityCode, generateBaseSlug } from '@/lib/slug-utils';
import { toast } from 'sonner';

const coreFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  code: z.string().optional(),
  parent_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof coreFormSchema>;
type CustomFieldValue = string | number | boolean | string[] | null;

function CustomFieldInput({ field, value, onChange, options }: { field: EoFieldDefinition; value: CustomFieldValue; onChange: (value: CustomFieldValue) => void; options: { value: string; label: string }[] }) {

  switch (field.field_type) {
    case 'textarea':
      return <Textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.description || ''} className="resize-none" />;
    case 'number':
      return <Input type="number" value={value || ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} placeholder={field.description || ''} />;
    case 'date':
      return <Input type="date" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox checked={value === true} onCheckedChange={(checked) => onChange(checked)} />
          <span className="text-sm text-muted-foreground">{field.description}</span>
        </div>
      );
    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
          <SelectContent>
            {options.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case 'multiselect':
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                checked={(value || []).includes(opt.value)}
                onCheckedChange={(checked) => {
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
      return <Input type="email" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.description || 'email@exemple.com'} />;
    case 'url':
      return <Input type="url" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.description || 'https://...'} />;
    default:
      return <Input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.description || ''} />;
  }
}

export default function EntityCreatePage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const [searchParams] = useSearchParams();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id || '';

  const { data: entities = [] } = useOrganizationalEntities(clientId || undefined);
  const { data: customFields = [] } = useEoFieldDefinitions(clientId || undefined);
  const createEntity = useCreateOrganizationalEntity();
  const upsertFieldValue = useUpsertEoFieldValue();

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parentIdFromUrl = searchParams.get('parent');

  const form = useForm<FormValues>({
    resolver: zodResolver(coreFormSchema),
    defaultValues: {
      name: '',
      code: '',
      parent_id: parentIdFromUrl || null,
      is_active: true,
    },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!clientId) return;
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
        is_active: values.is_active,
      });

      for (const [fieldId, value] of Object.entries(customFieldValues)) {
        if (value !== undefined && value !== null && value !== '') {
          await upsertFieldValue.mutateAsync({
            eo_id: newEntity.id,
            field_definition_id: fieldId,
            value,
          });
        }
      }

      toast.success('Entité créée avec succès');
      navigate(cp(CLIENT_ROUTES.ENTITIES));
    } catch (error: unknown) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: CustomFieldValue) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const activeCustomFields = customFields.filter(f => f.is_active);
  const { getOptions } = useResolvedEoOptions(activeCustomFields);

  if (!selectedClient) {
    return (
      <EmptyState title="Sélectionnez un client pour créer une entité" />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Nouvelle entité"
        description="Créez une nouvelle entité organisationnelle"
        backAction={{ onClick: () => navigate(cp(CLIENT_ROUTES.ENTITIES)) }}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-2xl space-y-8">
          {/* Core fields */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informations générales
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingInput label="Nom *" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FloatingInput label="Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entité parente</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Aucune (racine)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune (racine)</SelectItem>
                      {entities.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel className="text-sm font-medium">Active</FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">Désactivez pour masquer l'entité</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Custom fields */}
          {activeCustomFields.length > 0 && (
            <>
              <Separator />
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Détails
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeCustomFields.map((field) => (
                    <div key={field.id} className={`space-y-1.5 ${field.field_type === 'textarea' || field.field_type === 'multiselect' ? 'sm:col-span-2' : ''}`}>
                      <label className="text-sm font-medium">
                        {field.name}
                        {field.is_required && <span className="text-destructive ml-1">*</span>}
                      </label>
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
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex justify-end gap-3 pb-4">
            <Button type="button" variant="outline" onClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES))} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer l\'entité'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
