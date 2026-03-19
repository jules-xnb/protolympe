import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { FloatingInput } from '@/components/ui/floating-input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useListes } from '@/hooks/useListes';
import { useCreateFieldDefinition } from '@/hooks/useFieldDefinitions';
import { generateBaseSlug } from '@/lib/slug-utils';
import { toast } from 'sonner';
import type { TablesInsert } from '@/types/database';
import { FIELD_TYPES as ALL_FIELD_TYPES } from '@/lib/field-type-registry';
import { useT } from '@/hooks/useT';

const FIELD_TYPES = ALL_FIELD_TYPES;

const fieldSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  description: z.string().optional(),
  field_type: z.string().min(1, 'Le type est requis'),
  is_required: z.boolean(),
  referential_id: z.string().optional(),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface SurveyFieldCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectDefinitionId: string;
  onFieldCreated: (fieldId: string) => void;
}

export function SurveyFieldCreateDialog({
  open,
  onOpenChange,
  objectDefinitionId,
  onFieldCreated,
}: SurveyFieldCreateDialogProps) {
  const { t } = useT();
  const { data: listes = [] } = useListes();
  const createField = useCreateFieldDefinition();

  const form = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      name: '',
      description: '',
      field_type: 'text',
      is_required: false,
      referential_id: '',
    },
  });

  const fieldType = form.watch('field_type');
  const needsReferential = ['select', 'multiselect'].includes(fieldType);

  const handleSubmit = async (data: FieldFormData) => {
    try {
      const result = await createField.mutateAsync({
        object_definition_id: objectDefinitionId,
        name: data.name,
        slug: generateBaseSlug(data.name),
        description: data.description || null,
        field_type: data.field_type as TablesInsert<'field_definitions'>['field_type'],
        is_required: data.is_required,
        referential_id: needsReferential ? data.referential_id || null : null,
        display_order: 999,
      });

      toast.success(t('survey.field_created'));
      onFieldCreated(result.id);
      onOpenChange(false);
      form.reset();
    } catch {
      toast.error(t('survey.field_creation_error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle>{t('survey.create_new_field')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FloatingInput label={t('survey.field_name_label')} {...field} />
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
                  <FormLabel>{t('labels.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('survey.field_description_placeholder')}
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="field_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('survey.field_type_label')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialogs.select_type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {needsReferential && (
              <FormField
                control={form.control}
                name="referential_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('survey.referential_label')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('survey.select_referential')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {listes.map((ref: { id: string; name: string }) => (
                          <SelectItem key={ref.id} value={ref.id}>
                            {ref.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-required-field" className="text-sm font-normal">
                  {t('survey.required_field_toggle')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('survey.required_field_description')}
                </p>
              </div>
              <Switch
                id="is-required-field"
                checked={form.watch('is_required')}
                onCheckedChange={(checked) => form.setValue('is_required', checked)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('buttons.cancel')}
              </Button>
              <Button type="submit" disabled={createField.isPending}>
                {createField.isPending ? t('buttons.creating') : t('buttons.create_field')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
