import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrganizationalEntityWithClient } from '@/hooks/useOrganizationalEntities';
import { Client } from '@/hooks/useClients';
import { useEoFieldDefinitions, useEoFieldValues, type EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { useResolvedEoOptions } from '@/hooks/useResolvedEoOptions';
import { generateEntityCode, generateBaseSlug } from '@/lib/slug-utils';
import { CustomFieldInput, type CustomFieldValue } from './entity-form/CustomFieldInput';

// Core form schema - only essential database columns
const coreFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  code: z.string().optional(),
  client_id: z.string().min(1, 'Veuillez sélectionner un client'),
  parent_id: z.string().nullable().optional(),
  
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof coreFormSchema>;
type SubmitValues = FormValues & { slug: string };

export interface EntityFormSubmitData {
  coreData: SubmitValues;
  customFieldValues: Record<string, CustomFieldValue>;
}

interface EntityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: OrganizationalEntityWithClient | null;
  clients: Client[];
  entities: OrganizationalEntityWithClient[];
  onSubmit: (data: EntityFormSubmitData) => Promise<void>;
  isSubmitting: boolean;
}

export function EntityFormDialog({
  open,
  onOpenChange,
  entity,
  clients,
  entities,
  onSubmit,
  isSubmitting,
}: EntityFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(coreFormSchema),
    defaultValues: {
      name: '',
      description: '',
      code: '',
      client_id: '',
      parent_id: null,
      is_active: true,
    },
  });

  const selectedClientId = form.watch('client_id');

  // Fetch custom field definitions for the selected client (now includes all fields like address, phone, etc.)
  const { data: customFields = [] } = useEoFieldDefinitions(open && selectedClientId ? selectedClientId : undefined);

  // Fetch existing field values when editing
  const fieldValuesQuery = useEoFieldValues(open && entity?.id ? entity.id : undefined);
  const fieldValues = fieldValuesQuery.data;

  // Custom field values state
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValue>>({});

  // Initialize custom field values from DB
  useEffect(() => {
    if (!open) return;

    const list = fieldValues ?? [];
    if (list.length > 0) {
      const values: Record<string, CustomFieldValue> = {};
      list.forEach((fv) => {
        values[fv.field_definition_id] = fv.value as CustomFieldValue;
      });
      setCustomFieldValues(values);
    } else {
      setCustomFieldValues((prev) => (Object.keys(prev).length ? {} : prev));
    }
  }, [open, fieldValues]);

  // Filter entities by selected client for parent selection
  const availableParents = entities.filter(
    (e) => e.client_id === selectedClientId && e.id !== entity?.id
  );

  const clientsKey = useMemo(() => clients.map((c) => c.id).join('|'), [clients]);

  useEffect(() => {
    if (!open) return;

    if (entity) {
      form.reset({
        name: entity.name,
        description: entity.description || '',
        code: entity.code || '',
        client_id: entity.client_id,
        parent_id: entity.parent_id,
        
        is_active: entity.is_active,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        code: '',
        client_id: clients.length === 1 ? clients[0].id : '',
        parent_id: null,
        
        is_active: true,
      });
      setCustomFieldValues({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity?.id, clientsKey]);

  const handleSubmit = async (values: FormValues) => {
    const slug = entity?.slug || generateBaseSlug(values.name);
    
    // Generate code if not provided
    const code = values.code?.trim() || generateEntityCode();
    
    // Clean up values
    const cleanedValues = {
      ...values,
      slug,
      code,
      parent_id: values.parent_id || null,
    };
    
    // Submit both core data and custom field values
    await onSubmit({
      coreData: cleanedValues as SubmitValues,
      customFieldValues,
    });
  };

  const handleCustomFieldChange = (fieldId: string, value: CustomFieldValue) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const activeCustomFields = customFields.filter(f => f.is_active);
  const { getOptions } = useResolvedEoOptions(activeCustomFields);
  const hasCustomFields = activeCustomFields.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {entity ? 'Modifier l\'entité' : 'Créer une entité'}
          </DialogTitle>
          <DialogDescription>
            {entity
              ? 'Modifiez les informations de l\'entité organisationnelle.'
              : 'Ajoutez une nouvelle entité organisationnelle.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full justify-start px-6">
                <TabsTrigger value="general">Général</TabsTrigger>
                {hasCustomFields && (
                  <TabsTrigger value="details">Détails</TabsTrigger>
                )}
              </TabsList>

              <ScrollArea className="h-[400px] px-6">
                {/* General Tab - Core fields only */}
                <TabsContent value="general" className="mt-4 space-y-4">
                  {/* Client selector */}
                  {clients.length > 1 && (
                    <FormField
                      control={form.control}
                      name="client_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('parent_id', null);
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                            {availableParents.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          L'entité parente dans la hiérarchie
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                        <FormDescription>
                          Code unique de l'entité (généré automatiquement si vide)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Description de l'entité..." 
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Désactivez pour masquer l'entité
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Details Tab - All custom fields (including migrated template fields) */}
                {hasCustomFields && (
                  <TabsContent value="details" className="mt-4 space-y-4">
                    {activeCustomFields.map((field) => (
                      <div key={field.id} className="space-y-2">
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
                  </TabsContent>
                )}
              </ScrollArea>
            </Tabs>

            <DialogFooter className="px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Enregistrement...'
                  : entity
                  ? 'Mettre à jour'
                  : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
