import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, GripVertical, Trash2, Lock } from 'lucide-react';
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
  FormDescription,
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chip } from '@/components/ui/chip';
import { 
  useSurvey, 
  useCreateSurvey, 
  useUpdateSurvey 
} from '@/hooks/useSurveys';
import { useBusinessObjectDefinitions } from '@/hooks/useBusinessObjectDefinitions';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { SurveyFieldSelector, type SurveyField } from './SurveyFieldSelector';
import { SurveyFieldCreateDialog } from './SurveyFieldCreateDialog';
import type { SurveyCreatorBlockConfig } from '@/components/builder/page-builder/types';
import { useT } from '@/hooks/useT';
import { toast } from 'sonner';

const surveySchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  description: z.string().optional(),
  bo_definition_id: z.string().min(1, 'L\'objet métier est requis'),
});

type SurveyFormData = z.infer<typeof surveySchema>;

interface SurveyEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId?: string;
  defaultConfig?: SurveyCreatorBlockConfig;
}

export function SurveyEditorDialog({
  open,
  onOpenChange,
  surveyId,
  defaultConfig,
}: SurveyEditorDialogProps) {
  const { t } = useT();
  const { selectedClient } = useViewMode();
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [enableValidation, setEnableValidation] = useState(
    defaultConfig?.enable_validation_workflow ?? true
  );
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState(false);
  const [fieldCreateOpen, setFieldCreateOpen] = useState(false);
  const [selectedBoId, setSelectedBoId] = useState<string | undefined>();

  const { data: existingSurvey, isLoading: _isLoading } = useSurvey(surveyId);
  const { data: businessObjects = [] } = useBusinessObjectDefinitions();
  const { data: boFields = [], refetch: refetchBoFields } = useFieldDefinitions(selectedBoId);
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      name: '',
      description: '',
      bo_definition_id: '',
    },
  });

  // Watch BO selection to auto-add required fields
  const watchedBoId = form.watch('bo_definition_id');

  useEffect(() => {
    if (watchedBoId && watchedBoId !== selectedBoId) {
      setSelectedBoId(watchedBoId);
    }
  }, [watchedBoId, selectedBoId]);

  // Auto-add required fields when BO fields are loaded (only when BO changes)
  useEffect(() => {
    if (boFields.length > 0 && selectedBoId && !surveyId) {
      const requiredFields = boFields.filter(f => f.is_required);
      
      const newRequiredFields: SurveyField[] = requiredFields.map(field => ({
        field_definition_id: field.id,
        label: field.name,
        description: field.description || '',
        field_type: field.field_type,
        is_required: true,
        is_from_bo: true,
        referential_id: field.referential_id || undefined,
      }));

      setFields(prev => {
        const additionalFields = prev.filter(f => !f.is_from_bo);
        return [...newRequiredFields, ...additionalFields];
      });
    }
  }, [boFields, selectedBoId, surveyId]);

  useEffect(() => {
    if (existingSurvey) {
      form.reset({
        name: existingSurvey.name,
        description: existingSurvey.description || '',
        bo_definition_id: existingSurvey.bo_definition_id || '',
      });
      if (existingSurvey.bo_definition_id) {
        setSelectedBoId(existingSurvey.bo_definition_id);
      }
      setEnableValidation(existingSurvey.settings?.require_validation ?? true);
      setFields([]);
    } else {
      form.reset({ name: '', description: '', bo_definition_id: '' });
      setSelectedBoId(undefined);
      setFields([]);
    }
  }, [existingSurvey, form]);

  const handleAddField = () => {
    setFieldSelectorOpen(true);
  };

  const handleSelectField = (field: SurveyField) => {
    setFields(prev => [...prev, field]);
    setFieldSelectorOpen(false);
  };

  const handleDeleteField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleFieldCreated = async () => {
    await refetchBoFields();
    setFieldSelectorOpen(true);
  };

  const handleSubmit = async (data: SurveyFormData) => {
    if (!selectedClient?.id) {
      toast.error(t('survey.client_not_selected'));
      return;
    }

    try {
      const surveyData = {
        name: data.name,
        description: data.description || undefined,
        client_id: selectedClient.id,
        bo_definition_id: data.bo_definition_id,
        settings: {
          require_validation: enableValidation,
          allow_partial_save: true,
        },
        fields,
      };

      if (surveyId) {
        await updateSurvey.mutateAsync({ id: surveyId, ...surveyData });
        toast.success(t('toast.survey_updated'));
      } else {
        await createSurvey.mutateAsync(surveyData);
        toast.success(t('toast.survey_created'));
      }
      onOpenChange(false);
    } catch {
      toast.error(t('errors.save'));
    }
  };

  const isSubmitting = createSurvey.isPending || updateSurvey.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[var(--modal-width-lg)] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {surveyId ? t('dialogs.edit_survey') : t('dialogs.new_survey')}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 pb-4">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <FloatingInput label={t('survey.name_label')} {...field} />
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
                              placeholder={t('placeholders.survey_description')}
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bo_definition_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('survey.bo_label')}</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!!surveyId} // Disable on edit mode
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('survey.select_bo')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {businessObjects.filter(bo => bo.is_active).map((bo) => (
                                <SelectItem key={bo.id} value={bo.id}>
                                  {bo.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {t('survey.bo_description')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{t('survey.fields_to_display')}</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleAddField}
                        disabled={!selectedBoId}
                      >
                        {t('buttons.add')}
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {!selectedBoId ? (
                      <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                        <p>{t('survey.select_source')}</p>
                        <p className="text-sm">{t('survey.required_fields_auto_added')}</p>
                      </div>
                    ) : fields.length === 0 ? (
                      <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                        <p>{t('survey.no_field_added')}</p>
                        <p className="text-sm">{t('survey.click_add_field')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fields.map((field, index) => (
                          <div
                            key={field.field_definition_id || index}
                            className={`flex items-center gap-2 p-3 border rounded-lg bg-background ${
                              field.is_from_bo ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                          >
                            {field.is_from_bo ? (
                              <Lock className="h-4 w-4 text-primary/50" />
                            ) : (
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm truncate">{field.label}</span>
                                {field.is_required && (
                                  <Chip variant="default" className="text-xs">
                                    {t('labels.required')}
                                  </Chip>
                                )}
                                {field.is_from_bo && (
                                  <Chip variant="outline" className="text-xs text-primary border-primary/30">
                                    {t('survey.locked')}
                                  </Chip>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {field.field_type}
                              </span>
                            </div>
                            {!field.is_from_bo && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteField(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Options */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">{t('survey.options')}</Label>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="enable-validation" className="text-sm font-normal">
                          {t('survey.enable_validation')}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {t('survey.enable_validation_desc')}
                        </p>
                      </div>
                      <Switch
                        id="enable-validation"
                        checked={enableValidation}
                        onCheckedChange={setEnableValidation}
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  {t('buttons.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('buttons.saving_draft') : (surveyId ? t('buttons.update') : t('buttons.create'))}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <SurveyFieldSelector
        open={fieldSelectorOpen}
        onOpenChange={setFieldSelectorOpen}
        onSelectField={handleSelectField}
        onCreateField={() => setFieldCreateOpen(true)}
        availableFields={boFields}
        existingFieldIds={fields.map(f => f.field_definition_id).filter(Boolean) as string[]}
      />

      {selectedBoId && (
        <SurveyFieldCreateDialog
          open={fieldCreateOpen}
          onOpenChange={setFieldCreateOpen}
          objectDefinitionId={selectedBoId}
          onFieldCreated={handleFieldCreated}
        />
      )}
    </>
  );
}
