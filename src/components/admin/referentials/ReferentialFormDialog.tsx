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
import { useCreateReferential, useUpdateReferential, type Referential } from '@/hooks/useReferentials';
import { toast } from 'sonner';
import { generateSlug } from '@/lib/csv-parser';

const schema = z.object({
  name: z.string().min(1, 'Requis'),
  tag: z.string(),
  description: z.string(),
});
type FormValues = z.infer<typeof schema>;

interface ReferentialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referential?: Referential | null;
}

export function ReferentialFormDialog({ open, onOpenChange, referential }: ReferentialFormDialogProps) {
  const createMutation = useCreateReferential();
  const updateMutation = useUpdateReferential();

  const isEditing = !!referential;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const defaultValues = useMemo<FormValues>(() => {
    if (referential) {
      return {
        name: referential.name,
        tag: referential.tag || '',
        description: referential.description || '',
      };
    }
    return { name: '', tag: '', description: '' };
  }, [referential]);

  const handleSubmit = async (values: FormValues) => {
    const slug = isEditing ? referential.slug : generateSlug(values.name);

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: referential.id,
          name: values.name,
          slug,
          description: values.description || null,
          tag: values.tag || null,
        });
        toast.success('Référentiel mis à jour');
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          slug,
          description: values.description || null,
          tag: values.tag || null,
        });
        toast.success('Référentiel créé');
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Modifier le référentiel' : 'Nouvelle liste'}
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={isEditing ? 'Mettre à jour' : 'Créer'}
    >
      {(form) => (
        <div className="space-y-4">
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
            name="tag"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <FloatingInput label="Tag" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Utilisez un tag pour regrouper vos listes par catégorie
                </p>
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
                    placeholder="Description optionnelle..."
                    rows={3}
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
