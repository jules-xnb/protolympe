import { useMemo } from 'react';
import { z } from 'zod';
import { FormDialog } from '@/components/ui/form-dialog';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { FloatingInput } from '@/components/ui/floating-input';
import { useViewMode } from '@/contexts/ViewModeContext';
import {
  useCreateBusinessObjectDefinition,
  useUpdateBusinessObjectDefinition,
  type BusinessObjectDefinitionWithRelations,
} from '@/hooks/useBusinessObjectDefinitions';
import { useDuplicateFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { toast } from 'sonner';
import { generateSlug } from '@/lib/csv-parser';

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface BusinessObjectDefinitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition?: BusinessObjectDefinitionWithRelations | null;
  duplicateFrom?: BusinessObjectDefinitionWithRelations | null;
}

export function BusinessObjectDefinitionFormDialog({
  open,
  onOpenChange,
  definition,
  duplicateFrom,
}: BusinessObjectDefinitionFormDialogProps) {
  const { selectedClient } = useViewMode();
  const createMutation = useCreateBusinessObjectDefinition();
  const updateMutation = useUpdateBusinessObjectDefinition();
  const duplicateFieldsMutation = useDuplicateFieldDefinitions();

  const isEditing = !!definition;
  const isDuplicating = !!duplicateFrom && !isEditing;

  const defaultValues = useMemo<FormValues>(() => {
    if (definition) {
      return {
        name: definition.name,
        description: definition.description || '',
      };
    }
    if (duplicateFrom) {
      return {
        name: `${duplicateFrom.name} (copie)`,
        description: duplicateFrom.description || '',
      };
    }
    return { name: '', description: '' };
  }, [definition, duplicateFrom]);

  const handleSubmit = async (values: FormValues) => {
    if (!selectedClient) {
      toast.error('Veuillez sélectionner un client');
      return;
    }

    const slug = isEditing ? definition.slug : generateSlug(values.name);

    try {
      if (isEditing && definition) {
        await updateMutation.mutateAsync({
          id: definition.id,
          name: values.name,
          slug,
          description: values.description || null,
        });
        toast.success('Objet métier mis à jour');
      } else {
        const created = await createMutation.mutateAsync({
          name: values.name,
          slug,
          description: values.description || null,
          client_id: selectedClient.id,
        });

        // Copy field definitions when duplicating
        if (isDuplicating && duplicateFrom && created) {
          await duplicateFieldsMutation.mutateAsync({
            sourceDefId: duplicateFrom.id,
            targetDefId: created.id,
          });
          toast.success('Objet métier dupliqué');
        } else {
          toast.success('Objet métier créé');
        }
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const title = isEditing
    ? 'Modifier l\'objet métier'
    : isDuplicating
      ? 'Dupliquer l\'objet métier'
      : 'Nouvel objet métier';

  const submitLabel = isEditing ? 'Mettre à jour' : isDuplicating ? 'Dupliquer' : 'Créer';

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={submitLabel}
      className="sm:max-w-[500px]"
    >
      {(form) => (
        <div className="grid gap-4">
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Description de l'objet métier..."
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </FormDialog>
  );
}
