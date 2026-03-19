import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, XCircle, MessageSquare, AlertCircle, User, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useUpdateResponseStatus,
  useResponseFieldComments,
  useAddFieldComment,
  type SurveyResponseWithDetails
} from '@/hooks/useSurveyResponses';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

interface SurveyValidationDialogProps {
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
  display_order: number;
}

interface FieldValue {
  field_definition_id: string;
  value: unknown;
}

type FieldStatus = 'pending' | 'approved' | 'needs_correction';

export function SurveyValidationDialog({
  open,
  onOpenChange,
  response,
}: SurveyValidationDialogProps) {
  const { t } = useT();
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, FieldStatus>>({});
  // Comments kept in local state — only persisted on validate/reject
  const [fieldComments, setFieldComments] = useState<Record<string, string>>({});
  const [globalComment, setGlobalComment] = useState('');
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  const updateStatus = useUpdateResponseStatus();
  const addComment = useAddFieldComment();
  const { data: existingComments = [] } = useResponseFieldComments(response?.id);

  // Fetch field definitions
  const { data: fieldDefinitions = [] } = useQuery({
    queryKey: queryKeys.surveys.fieldsValidation(response?._survey?.bo_definition_id!),
    queryFn: async () => {
      if (!response?._survey?.bo_definition_id) return [];
      return api.get<FieldDefinition[]>(`/api/business-objects/definitions/${response._survey.bo_definition_id}/fields?is_active=true&order=display_order`);
    },
    enabled: !!response?._survey?.bo_definition_id,
  });

  // Fetch field values
  const { data: fieldValues = [] } = useQuery({
    queryKey: queryKeys.surveyResponses.valuesValidation(response?.business_object_id!),
    queryFn: async () => {
      if (!response?.business_object_id) return [];
      return api.get<FieldValue[]>(`/api/business-objects/${response.business_object_id}/field-values`);
    },
    enabled: !!response?.business_object_id,
  });

  // Map values for easy lookup
  const valuesMap = useMemo(() => {
    const map: Record<string, unknown> = {};
    fieldValues.forEach(v => {
      map[v.field_definition_id] = v.value;
    });
    return map;
  }, [fieldValues]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFieldStatuses({});
      setFieldComments({});
      setGlobalComment('');
      setExpandedFields(new Set());
    }
  }, [open]);

  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };

  const handleFieldStatus = (fieldId: string, status: FieldStatus) => {
    setFieldStatuses(prev => ({ ...prev, [fieldId]: status }));
    if (status === 'needs_correction') {
      setExpandedFields(prev => new Set([...prev, fieldId]));
    }
  };

  /** Persist all non-empty field comments to DB */
  const saveAllComments = async () => {
    if (!response) return;
    for (const [fieldId, comment] of Object.entries(fieldComments)) {
      if (comment?.trim()) {
        await addComment.mutateAsync({
          responseId: response.id,
          fieldDefinitionId: fieldId,
          comment: comment.trim(),
          commentType: 'correction_needed',
        });
      }
    }
  };

  const handleValidate = async () => {
    if (!response) return;

    const validationSteps = response._survey?.settings?.validation_steps || [];

    try {
      // Save comments before validating (if any)
      await saveAllComments();
      await updateStatus.mutateAsync({
        id: response.id,
        status: 'validated',
        validationSteps,
        currentStepId: response.current_step_id,
      });
      toast.success(t('toast.survey_validated'));
      onOpenChange(false);
    } catch {
      toast.error(t('errors.validation'));
    }
  };

  const handleReject = async () => {
    if (!response) return;

    // Check if there are any comments for rejection
    const hasCorrections = Object.values(fieldStatuses).some(s => s === 'needs_correction');
    const hasFieldComments = Object.values(fieldComments).some(c => c?.trim());

    if (!hasCorrections && !hasFieldComments && !globalComment.trim()) {
      toast.error(t('errors.rejection_comment_required'));
      return;
    }

    try {
      // Save all field comments
      await saveAllComments();

      await updateStatus.mutateAsync({
        id: response.id,
        status: 'rejected',
      });
      toast.success(t('survey.rejected_respondent_notified'));
      onOpenChange(false);
    } catch {
      toast.error(t('errors.rejection'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('survey.validation_title')}</DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {response?._eo?.name}
            </span>
            {response?._respondent && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {response._respondent.full_name || response._respondent.email}
              </span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 pr-4">
            {fieldDefinitions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('survey.no_data_to_validate')}</p>
              </div>
            ) : (
              fieldDefinitions.map((field, index) => {
                const value = valuesMap[field.id];
                const status = fieldStatuses[field.id];
                const isExpanded = expandedFields.has(field.id);
                const fieldExistingComments = existingComments.filter(c => c.field_definition_id === field.id);

                return (
                  <Collapsible
                    key={field.id}
                    open={isExpanded}
                    onOpenChange={() => toggleFieldExpanded(field.id)}
                  >
                    <div className="border rounded-lg">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{index + 1}.</span>
                              <Label className="font-medium">{field.name}</Label>
                              {field.is_required && (
                                <Chip variant="outline" className="text-xs">{t('labels.required_chip')}</Chip>
                              )}
                            </div>
                            <p className="mt-1 text-sm">
                              {formatValue(value, field.field_type)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant={status === 'approved' ? 'default' : 'outline'}
                              size="icon"
                              className={`h-8 w-8 ${status === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                              onClick={() => handleFieldStatus(field.id, 'approved')}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant={status === 'needs_correction' ? 'default' : 'outline'}
                                size="icon"
                                className={`h-8 w-8 ${status === 'needs_correction' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                                onClick={() => handleFieldStatus(field.id, 'needs_correction')}
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        {fieldExistingComments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {fieldExistingComments.map(comment => (
                              <div key={comment.id} className="text-xs bg-orange-50 border-orange-200 border rounded p-2">
                                <span className="text-orange-800">{comment.comment}</span>
                                <span className="text-muted-foreground ml-2">
                                  — {comment._commenter?.full_name || comment._commenter?.email}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-0">
                          <Separator className="mb-3" />
                          <Textarea
                            placeholder={t('survey.add_correction_comment')}
                            value={fieldComments[field.id] || ''}
                            onChange={(e) => setFieldComments(prev => ({ ...prev, [field.id]: e.target.value }))}
                            rows={2}
                          />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}

            <Separator />

            {/* Global comment */}
            <div className="space-y-2">
              <Label>{t('survey.global_comment_label')}</Label>
              <Textarea
                placeholder={t('survey.global_comment_placeholder')}
                value={globalComment}
                onChange={(e) => setGlobalComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('buttons.cancel')}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={updateStatus.isPending || addComment.isPending}
            >
              {t('buttons.reject')}
              <XCircle className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleValidate}
              disabled={updateStatus.isPending || addComment.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {t('buttons.validate')}
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
