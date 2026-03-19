import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FloatingInput } from '@/components/ui/floating-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateRole, useUpdateRole, type RoleWithCategory } from '@/hooks/useRoles';
import { useRoleCategories } from '@/hooks/useRoleCategories';
import { useDuplicateNavPermissions } from '@/hooks/useNavPermissions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PRESET_COLORS } from '@/lib/constants';

interface RoleFormDialogProps {
  open: boolean;
  preselectedCategoryId?: string | null;
  onOpenChange: (open: boolean) => void;
  role?: RoleWithCategory | null;
  duplicateFrom?: RoleWithCategory | null;
  onCreated?: (roleId: string) => void;
}

const roleFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  slug: z.string().min(1, 'Le slug est requis'),
  description: z.string().optional(),
  color: z.string().default('#3b82f6'),
  category_id: z.string().min(1, 'La catégorie est requise'),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

export function RoleFormDialog({ open, onOpenChange, role, preselectedCategoryId, duplicateFrom, onCreated }: RoleFormDialogProps) {
  const { selectedClient } = useViewMode();
  const { data: categories = [] } = useRoleCategories();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const duplicateNavPermsMutation = useDuplicateNavPermissions();

  const isEditing = !!role;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      color: '#3b82f6',
      category_id: '',
    },
  });

  // Reset form when dialog opens/closes or source changes
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        slug: role.slug,
        description: role.description || '',
        color: role.color || '#3b82f6',
        category_id: role.category_id || '',
      });
    } else if (duplicateFrom) {
      form.reset({
        name: `${duplicateFrom.name} (copie)`,
        slug: '',
        description: duplicateFrom.description || '',
        color: duplicateFrom.color || '#3b82f6',
        category_id: duplicateFrom.category_id || '',
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        description: '',
        color: '#3b82f6',
        category_id: preselectedCategoryId || '',
      });
    }
  }, [role, duplicateFrom, open, preselectedCategoryId, form]);

  // Auto-generate slug from name
  const watchedName = form.watch('name');
  useEffect(() => {
    if (!isEditing && watchedName) {
      const generatedSlug = watchedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      form.setValue('slug', generatedSlug);
    }
  }, [watchedName, isEditing, form]);

  const onSubmit = async (values: RoleFormValues) => {
    if (!selectedClient?.id) {
      toast.error('Aucun client sélectionné');
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: role.id,
          name: values.name,
          slug: values.slug,
          description: values.description || null,
          color: values.color,
          category_id: values.category_id || null,
        });
        toast.success('Rôle mis à jour');
      } else {
        const created = await createMutation.mutateAsync({
          name: values.name,
          slug: values.slug,
          description: values.description || null,
          color: values.color,
          client_id: selectedClient.id,
          category_id: values.category_id || null,
        });

        // Copy nav_permissions from source role when duplicating
        if (duplicateFrom) {
          await duplicateNavPermsMutation.mutateAsync({
            sourceRoleId: duplicateFrom.id,
            targetRoleId: created.id,
          });
        }

        toast.success(duplicateFrom ? 'Rôle dupliqué' : 'Rôle créé');
        onCreated?.(created.id);
      }
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? 'Modifier le rôle' : 'Nouveau rôle'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Modifiez les informations du rôle.'
                  : 'Créez un nouveau rôle métier.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
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
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category: { id: string; name: string }) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description du rôle..." rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleur</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((c) => (
                        <Button
                          key={c}
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 p-0",
                            field.value === c ? "border-foreground scale-110" : "border-transparent"
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => field.onChange(c)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
