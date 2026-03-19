import { useEffect } from 'react';
import { generateUniqueSlug } from '@/lib/slug-utils';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FloatingInput } from '@/components/ui/floating-input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, icons } from 'lucide-react';
import {
  useCreateNavigationConfig,
  useUpdateNavigationConfig,
  type NavigationConfigWithRelations,
} from '@/hooks/useNavigationConfigs';
import { useViewMode } from '@/contexts/ViewModeContext';

const ICON_OPTIONS = [
  'home', 'file-text', 'folder', 'settings', 'users', 'bar-chart',
  'calendar', 'check-square', 'clipboard', 'database', 'globe',
  'layers', 'list', 'map', 'package', 'shield', 'tag', 'wrench',
  'trending-up', 'zap', 'triangle-alert', 'archive', 'book',
];

const formSchema = z.object({
  label: z.string().min(1, 'Le libellé est requis').max(100, 'Le libellé doit faire moins de 100 caractères'),
  display_label: z.string().min(1, 'Le nom d\'affichage est requis').max(100, 'Le nom d\'affichage doit faire moins de 100 caractères'),
  icon: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  display_order: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface ModuleItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: NavigationConfigWithRelations | null;
  parentItems: NavigationConfigWithRelations[];
  defaultParentId?: string | null;
}

export function ModuleItemFormDialog({
  open,
  onOpenChange,
  item,
  parentItems,
  defaultParentId,
}: ModuleItemFormDialogProps) {
  const { selectedClient } = useViewMode();
  const createMutation = useCreateNavigationConfig();
  const updateMutation = useUpdateNavigationConfig();
  const isEditing = !!item;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      display_label: '',
      icon: null,
      parent_id: null,
      display_order: 0,
      is_active: true,
    },
  });

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        form.reset({
          label: item.label,
          display_label: item.display_label || '',
          icon: item.icon,
          parent_id: item.parent_id,
          display_order: item.display_order,
          is_active: item.is_active,
        });
      } else {
        form.reset({
          label: '',
          display_label: undefined,
          icon: null,
          parent_id: defaultParentId || null,
          display_order: parentItems.length,
          is_active: false,
        });
      }
    }
  }, [open, item, form, parentItems.length, defaultParentId]);

  const onSubmit = async (values: FormValues) => {
    if (!selectedClient) return;

    // Generate unique slug from label for new items, keep existing for edits
    const slug = isEditing ? item.slug : generateUniqueSlug(values.label);

    // Preserve view_config_id when editing (don't turn views into modules)
    const data = {
      client_id: selectedClient.id,
      label: values.label,
      display_label: values.display_label || null,
      slug,
      icon: values.icon || null,
      parent_id: values.parent_id || null,
      view_config_id: isEditing ? item.view_config_id : null,
      url: null,
      display_order: values.display_order,
      is_active: values.is_active,
    };

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: item.id, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Filter out item and its descendants from parent options
  const getDescendantIds = (itemId: string): string[] => {
    const ids = [itemId];
    const children = parentItems.filter((i) => i.parent_id === itemId);
    children.forEach((child) => {
      ids.push(...getDescendantIds(child.id));
    });
    return ids;
  };

  const excludedIds = item ? getDescendantIds(item.id) : [];
  // Only show modules (items without view_config_id) as potential parents
  const availableParents = parentItems.filter((i) => !excludedIds.includes(i.id) && !i.view_config_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier le groupe' : 'Nouveau groupe'}
          </DialogTitle>
          {!isEditing && (
            <DialogDescription>
              Les groupes permettent d'organiser vos vues
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingInput label="Nom interne *" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Visible uniquement par les intégrateurs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_label"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingInput
                      label="Nom d'affichage *"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Affiché aux utilisateurs finaux
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icône</FormLabel>
                  <Select
                    value={field.value || '__none__'}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Aucune icône">
                          {field.value && field.value !== '__none__' ? (() => {
                            const iconName = field.value.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                            const LucideIcon = icons[iconName as keyof typeof icons];
                            return LucideIcon ? (
                              <span className="flex items-center gap-2">
                                <LucideIcon className="h-4 w-4" />
                                {field.value}
                              </span>
                            ) : field.value;
                          })() : 'Aucune icône'}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Aucune</SelectItem>
                      {ICON_OPTIONS.map((icon) => {
                        const iconName = icon.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
                        const LucideIcon = icons[iconName as keyof typeof icons];
                        return (
                          <SelectItem key={icon} value={icon}>
                            <span className="flex items-center gap-2">
                              {LucideIcon && <LucideIcon className="h-4 w-4" />}
                              {icon}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show additional fields when creating a new module */}
            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="parent_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Groupe parent</FormLabel>
                      <Select
                        value={field.value || '__none__'}
                        onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Racine" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Racine (niveau 1)</SelectItem>
                          {availableParents.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.label}
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Actif</FormLabel>
                        <FormDescription className="text-xs">
                          Visible dans le menu
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
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? 'Enregistrer' : 'Créer'}
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
