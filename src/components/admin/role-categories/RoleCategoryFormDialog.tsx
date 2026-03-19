import { useMemo } from 'react';
import { z } from 'zod';
import { FormDialog } from '@/components/ui/form-dialog';
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { FloatingInput } from '@/components/ui/floating-input';
import { useCreateRoleCategory, useUpdateRoleCategory, type RoleCategory } from '@/hooks/useRoleCategories';
import { useViewMode } from '@/contexts/ViewModeContext';
import { generateSlug } from '@/lib/csv-parser';

const schema = z.object({
  name: z.string().min(1, 'Requis'),
});
type FormValues = z.infer<typeof schema>;

interface RoleCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: RoleCategory | null;
  onCreated?: (category: RoleCategory) => void;
}

export function RoleCategoryFormDialog({ open, onOpenChange, category, onCreated }: RoleCategoryFormDialogProps) {
  const { selectedClient } = useViewMode();
  const createMutation = useCreateRoleCategory();
  const updateMutation = useUpdateRoleCategory();

  const isEditing = !!category;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const defaultValues = useMemo<FormValues>(() => {
    if (category) {
      return { name: category.name };
    }
    return { name: '' };
  }, [category]);

  const handleSubmit = async (values: FormValues) => {
    if (!selectedClient?.id) {
      return;
    }

    const slug = isEditing ? category.slug : generateSlug(values.name);

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: category.id,
          name: values.name,
          slug,
          description: category.description ?? null,
          is_required: category.is_required,
          display_order: category.display_order,
          is_active: category.is_active,
        });
      } else {
        await createMutation.mutateAsync({
          client_id: selectedClient.id,
          name: values.name,
          slug,
          description: null,
          is_required: true,
          display_order: 0,
          is_active: true,
        }).then((created) => {
          onCreated?.(created);
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled in mutation
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Modifier la catégorie' : 'Nouvelle catégorie de rôle'}
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
        </div>
      )}
    </FormDialog>
  );
}
