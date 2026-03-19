import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, MessageSquare, ChevronLeft, ChevronRight, History, Send, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FloatingInput } from '@/components/ui/floating-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useUpdateResponseStatus, 
  useResponseFieldComments,
  useResolveFieldComment,
  type SurveyResponseWithDetails 
} from '@/hooks/useSurveyResponses';
import { useSaveResponseValues } from '@/hooks/useSaveResponseValues';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

interface SurveyResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  response: SurveyResponseWithDetails | null;
}

interface FieldDefinition {
  id: string;
  name: string;
  slug: string;
  field_type: string;
  is_required: boolean;
  description?: string;
  display_order: number;
  referential_id?: string;
}

export function SurveyResponseDialog({
  open,
  onOpenChange,
  response,
}: SurveyResponseDialogProps) {
  const { t, td } = useT();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const updateStatus = useUpdateResponseStatus();
  const saveValues = useSaveResponseValues();
  const { data: fieldComments = [] } = useResponseFieldComments(response?.id);
  const resolveComment = useResolveFieldComment();

  // Fetch field definitions for the survey's BO definition
  const { data: fieldDefinitions = [] } = useQuery({
    queryKey: queryKeys.surveys.fields(response?._survey?.bo_definition_id!),
    queryFn: async () => {
      if (!response?._survey?.bo_definition_id) return [];
      return api.get<FieldDefinition[]>(`/api/business-objects/definitions/${response._survey.bo_definition_id}/fields?is_active=true&order=display_order`);
    },
    enabled: !!response?._survey?.bo_definition_id,
  });

  // Fetch existing field values if editing
  const { data: existingValues = [] } = useQuery({
    queryKey: queryKeys.surveyResponses.values(response?.business_object_id!),
    queryFn: async () => {
      if (!response?.business_object_id) return [];
      return api.get<Array<{ field_definition_id: string; value: unknown }>>(`/api/business-objects/${response.business_object_id}/field-values`);
    },
    enabled: !!response?.business_object_id,
  });

  // Fetch previous campaign values if configured
  const { data: previousValues = [] } = useQuery({
    queryKey: queryKeys.surveyResponses.previousCampaignValues(response?.campaign_id, response?.respondent_eo_id),
    queryFn: async () => {
      if (!response?._campaign?.previous_campaign_id || !response?.respondent_eo_id) return [];
      return api.get<Array<{ field_definition_id: string; value: unknown }>>(`/api/surveys/responses/previous-values?campaign_id=${response._campaign.previous_campaign_id}&eo_id=${response.respondent_eo_id}`);
    },
    enabled: !!response?._campaign?.previous_campaign_id && !!response?.respondent_eo_id,
  });

  // Initialize values from existing data when dialog opens or data loads
  const existingValuesKey = existingValues.map(v => v.field_definition_id + ':' + JSON.stringify(v.value)).join('|');
  useEffect(() => {
    if (!open) return;
    if (existingValues.length > 0) {
      const valuesMap: Record<string, unknown> = {};
      existingValues.forEach(v => {
        valuesMap[v.field_definition_id] = v.value;
      });
      setValues(valuesMap);
    } else {
      setValues({});
    }
    setCurrentQuestionIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, response?.id, existingValuesKey]);

  // Map previous values for easy lookup
  const previousValuesMap = useMemo(() => {
    const map: Record<string, unknown> = {};
    previousValues.forEach(v => {
      map[v.field_definition_id] = v.value;
    });
    return map;
  }, [previousValues]);

  // Get comments for current field
  const currentField = fieldDefinitions[currentQuestionIndex];
  const currentFieldComments = fieldComments.filter(
    c => c.field_definition_id === currentField?.id && !c.is_resolved
  );

  // Calculate progress
  const filledCount = Object.keys(values).filter(k => values[k] !== null && values[k] !== undefined && values[k] !== '').length;
  const progress = fieldDefinitions.length > 0 
    ? Math.round((filledCount / fieldDefinitions.length) * 100) 
    : 0;

  const handleValueChange = (fieldId: string, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveDraft = async () => {
    if (!response?.business_object_id) {
      toast.error(t('errors.no_bo_linked'));
      return;
    }

    try {
      await saveValues.mutateAsync({
        businessObjectId: response.business_object_id,
        values,
      });
      await updateStatus.mutateAsync({
        id: response.id,
        status: 'in_progress',
      });
      toast.success(t('toast.saved'));
    } catch {
      toast.error(t('errors.save'));
    }
  };

  const handleSubmit = async () => {
    if (!response?.business_object_id) {
      toast.error(t('errors.no_bo_linked'));
      return;
    }

    // Validate required fields
    const missingRequired = fieldDefinitions.filter(
      f => f.is_required && (values[f.id] === undefined || values[f.id] === null || values[f.id] === '')
    );

    if (missingRequired.length > 0) {
      toast.error(`${missingRequired.length} ${t('survey.required_missing')}`);
      return;
    }

    try {
      await saveValues.mutateAsync({
        businessObjectId: response.business_object_id,
        values,
      });
      await updateStatus.mutateAsync({
        id: response.id,
        status: 'submitted',
      });
      toast.success(t('toast.survey_submitted'));
      onOpenChange(false);
    } catch {
      toast.error(t('errors.submit'));
    }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await resolveComment.mutateAsync(commentId);
      toast.success(t('toast.comment_resolved'));
    } catch {
      toast.error(t('errors.generic'));
    }
  };

  const renderFieldInput = (field: FieldDefinition) => {
    const value = values[field.id];
    const previousValue = previousValuesMap[field.id];

    return (
      <div className="space-y-3">
        {/* Previous value display */}
        {previousValue !== undefined && (
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <History className="h-3 w-3" />
              {t('survey.previous_value')}
            </div>
            <p className="text-sm">
              {typeof previousValue === 'boolean' 
                ? (previousValue ? t('boolean.yes') : t('boolean.no'))
                : String(previousValue || '-')}
            </p>
          </div>
        )}

        {/* Field comments */}
        {currentFieldComments.map(comment => (
          <Alert key={comment.id} variant="warning">
            <MessageSquare className="h-4 w-4" />
            <AlertDescription className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm">{comment.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  — {comment._commenter?.full_name || comment._commenter?.email}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleResolveComment(comment.id)}
              >
                {t('survey.resolved')}
              </Button>
            </AlertDescription>
          </Alert>
        ))}

        {/* Input based on field type */}
        <div className="space-y-2">
          {!['text', 'number', 'date'].includes(field.field_type) && (
            <Label className="flex items-center gap-1">
              {field.name}
              {field.is_required && <span className="text-destructive">*</span>}
            </Label>
          )}

          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}

          {field.field_type === 'text' && (
            <FloatingInput
              label={`${field.name}${field.is_required ? ' *' : ''}`}
              value={String(value || '')}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
            />
          )}

          {field.field_type === 'textarea' && (
            <Textarea
              value={value || ''}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
              placeholder={t('placeholders.your_answer')}
              rows={4}
            />
          )}

          {field.field_type === 'number' && (
            <FloatingInput
              label={`${field.name}${field.is_required ? ' *' : ''}`}
              type="number"
              value={String(value || '')}
              onChange={(e) => handleValueChange(field.id, e.target.valueAsNumber)}
            />
          )}

          {field.field_type === 'date' && (
            <FloatingInput
              label={`${field.name}${field.is_required ? ' *' : ''}`}
              type="date"
              value={String(value || '')}
              onChange={(e) => handleValueChange(field.id, e.target.value)}
            />
          )}

          {field.field_type === 'checkbox' && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={value || false}
                onCheckedChange={(checked) => handleValueChange(field.id, checked)}
              />
              <span className="text-sm">{t('boolean.yes')}</span>
            </div>
          )}

          {(field.field_type === 'select' || field.field_type === 'multiselect') && (
            <Select
              value={value || ''}
              onValueChange={(v) => handleValueChange(field.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.select')} />
              </SelectTrigger>
              <SelectContent>
                {/* TODO: Load referential values */}
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    );
  };

  const isReadOnly = response?.status === 'validated' || response?.status === 'submitted';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{td('surveys', response?._survey?.id, 'name', response?._survey?.name)}</span>
            {response?.status === 'rejected' && (
              <Chip variant="error">{t('survey.corrections_requested')}</Chip>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {response?._campaign?.name} • {response?._eo?.name}
          </p>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {progress}% {t('survey.completed')}
          </span>
        </div>

        <ScrollArea className="flex-1">
          {fieldDefinitions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('survey.no_questions')}</p>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              <div className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} / {fieldDefinitions.length}
              </div>
              
              {currentField && renderFieldInput(currentField)}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex-row justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(i => i - 1)}
            >
              {t('buttons.previous')}
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentQuestionIndex >= fieldDefinitions.length - 1}
              onClick={() => setCurrentQuestionIndex(i => i + 1)}
            >
              {t('buttons.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={updateStatus.isPending}
                >
                  {t('status.draft')}
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateStatus.isPending}
                >
                  {t('buttons.submit')}
                  <Send className="h-4 w-4" />
                </Button>
              </>
            )}
            {isReadOnly && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('buttons.close')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
