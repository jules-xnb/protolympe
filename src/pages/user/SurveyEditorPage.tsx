import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, GripVertical, Trash2, Lock, ArrowLeft, Save } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useSurvey, 
  useCreateSurvey, 
  useUpdateSurvey 
} from '@/hooks/useSurveys';
import { useBusinessObjectDefinitions } from '@/hooks/useBusinessObjectDefinitions';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { SurveyFieldSelector, type SurveyField } from '@/components/user/views/SurveyFieldSelector';
import { SurveyFieldCreateDialog } from '@/components/user/views/SurveyFieldCreateDialog';
import { toast } from 'sonner';
import { useT } from '@/hooks/useT';

const surveySchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(200),
  description: z.string().optional(),
  bo_definition_id: z.string().min(1, 'La source est requise'),
});

type SurveyFormData = z.infer<typeof surveySchema>;

export default function SurveyEditorPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const { surveyId } = useParams<{ surveyId?: string }>();
  const { selectedClient } = useViewMode();
  
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [fieldSelectorOpen, setFieldSelectorOpen] = useState(false);
  const [fieldCreateOpen, setFieldCreateOpen] = useState(false);
  const [selectedBoId, setSelectedBoId] = useState<string | undefined>();

  const isEditMode = !!surveyId;
  const { data: existingSurvey, isLoading: isLoadingSurvey } = useSurvey(surveyId);
  const { data: businessObjects = [], isLoading: isLoadingBOs } = useBusinessObjectDefinitions();
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

  // Watch BO selection
  const watchedBoId = form.watch('bo_definition_id');

  useEffect(() => {
    if (watchedBoId && watchedBoId !== selectedBoId) {
      setSelectedBoId(watchedBoId);
    }
  }, [watchedBoId, selectedBoId]);

  // Auto-add required fields when BO fields are loaded (only in create mode)
  useEffect(() => {
    if (boFields.length > 0 && selectedBoId && !isEditMode) {
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
        const additionalFields = prev.filter(q => !q.is_from_bo);
        return [...newRequiredFields, ...additionalFields];
      });
    }
  }, [boFields, selectedBoId, isEditMode]);

  // Load existing survey data
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

  const handleFieldCreated = async (_fieldId: string) => {
    // Refetch BO fields to include the new one
    await refetchBoFields();
    // The new field will be available in the selector
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
          allow_partial_save: true,
        },
        fields,
      };

      if (surveyId) {
        await updateSurvey.mutateAsync({ id: surveyId, ...surveyData });
        toast.success(t('survey.survey_updated'));
      } else {
        await createSurvey.mutateAsync(surveyData);
        toast.success(t('survey.survey_created'));
      }
      navigate(-1);
    } catch {
      toast.error(t('errors.save'));
    }
  };

  const isSubmitting = createSurvey.isPending || updateSurvey.isPending;

  if (isEditMode && isLoadingSurvey) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isEditMode ? t('survey.edit_survey') : t('survey.new_survey')}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? t('survey.edit_survey_description')
              : t('survey.new_survey_description')
            }
          </p>
        </div>
        <Button 
          onClick={form.handleSubmit(handleSubmit)} 
          disabled={isSubmitting}
        >
          {isSubmitting ? t('buttons.saving_draft') : t('buttons.save')}
          <Save className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('survey.general_info')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('survey.survey_name_label')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('placeholders.survey_name')} 
                            {...field} 
                          />
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
                        <FormLabel>{t('survey.source_label')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isEditMode}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('placeholders.select_source')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingBOs ? (
                              <SelectItem value="loading" disabled>{t('buttons.loading')}</SelectItem>
                            ) : (
                              businessObjects.filter(bo => bo.is_active).map((bo) => (
                                <SelectItem key={bo.id} value={bo.id}>
                                  {bo.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {t('survey.source_auto_add')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Fields Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{t('survey.fields_to_display')}</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddField}
                      disabled={!selectedBoId}
                    >
                      {t('survey.add_field')}
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedBoId ? (
                    <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
                      <p className="font-medium">{t('survey.select_source')}</p>
                      <p className="text-sm mt-1">{t('survey.auto_add_required')}</p>
                    </div>
                  ) : fields.length === 0 ? (
                    <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
                      <p className="font-medium">{t('survey.no_fields')}</p>
                      <p className="text-sm mt-1">{t('survey.click_add_field')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.field_definition_id || index}
                          className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
                            field.is_from_bo 
                              ? 'border-primary/30 bg-primary/5' 
                              : 'bg-background hover:bg-muted/50'
                          }`}
                        >
                          {field.is_from_bo ? (
                            <Lock className="h-4 w-4 text-primary/50 shrink-0" />
                          ) : (
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium truncate">{field.label}</span>
                              {field.is_required && (
                                <Chip variant="default" className="text-xs">
                                  {t('labels.required_chip')}
                                </Chip>
                              )}
                              {field.is_from_bo && (
                                <Chip variant="outline" className="text-xs text-primary border-primary/30">
                                  {t('labels.locked')}
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
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteField(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Options */}
            <div className="space-y-6">
              {/* Summary Card */}
              {selectedBoId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('survey.summary')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('survey.total_fields')}</span>
                        <span className="font-medium">{fields.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('survey.locked_fields')}</span>
                        <span className="font-medium">{fields.filter(f => f.is_from_bo).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('survey.added_fields')}</span>
                        <span className="font-medium">{fields.filter(f => !f.is_from_bo).length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </form>
      </Form>

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
    </div>
  );
}
