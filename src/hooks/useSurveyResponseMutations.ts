import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { api } from '@/lib/api-client';
import type {
  ResponseStatus,
  ValidationStepInfo,
} from '@/types/survey-responses';
import { queryKeys } from '@/lib/query-keys';

// Create or update response
export function useUpsertResponse() {
  return useMutationWithToast({
    mutationFn: async ({
      campaignId,
      eoId,
      status
    }: {
      campaignId: string;
      eoId: string;
      status?: ResponseStatus;
    }) => {
      const data = await api.post('/api/surveys/responses', {
        campaign_id: campaignId,
        respondent_eo_id: eoId,
        status: status || 'in_progress',
      });

      return data;
    },
    invalidateKeys: [queryKeys.surveyResponses.byCampaign(""), queryKeys.surveyResponses.myPending([], [], [], false)],
  });
}

// Update response status with workflow step progression
export function useUpdateResponseStatus() {
  return useMutationWithToast({
    mutationFn: async ({
      id,
      status,
      businessObjectId,
      validationSteps,
      currentStepId,
    }: {
      id: string;
      status: ResponseStatus;
      businessObjectId?: string;
      validationSteps?: ValidationStepInfo[];
      currentStepId?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      const steps = validationSteps || [];
      const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

      if (status === 'submitted') {
        // Respondent submits -> go to first validation step
        updates.status = 'submitted';
        updates.submitted_at = new Date().toISOString();
        updates.current_step_id = sortedSteps.length > 0 ? sortedSteps[0].id : null;
      } else if (status === 'validated') {
        // Validator validates -> check if there's a next step
        if (currentStepId && sortedSteps.length > 0) {
          const currentIndex = sortedSteps.findIndex(s => s.id === currentStepId);
          const nextStep = currentIndex >= 0 ? sortedSteps[currentIndex + 1] : undefined;

          if (nextStep) {
            // Move to next validation step
            updates.status = 'in_validation';
            updates.current_step_id = nextStep.id;
          } else {
            // Last step -> mark as validated
            updates.status = 'validated';
            updates.validated_at = new Date().toISOString();
            updates.current_step_id = null;
          }
        } else {
          // No workflow steps, just validate
          updates.status = 'validated';
          updates.validated_at = new Date().toISOString();
          updates.current_step_id = null;
        }
      } else if (status === 'rejected') {
        updates.status = 'rejected';
        updates.current_step_id = null;
      } else {
        updates.status = status;
      }

      if (businessObjectId) {
        updates.business_object_id = businessObjectId;
      }

      const data = await api.patch(`/api/surveys/responses/${id}`, updates);

      return data;
    },
    invalidateKeys: [
      queryKeys.surveyResponses.detail(""),
      queryKeys.surveyResponses.byCampaign(""),
      queryKeys.surveyResponses.myPending([], [], [], false),
      ['responses_pending_validation'],
      ['filtered_campaign_responses'],
      queryKeys.campaignFieldColumns.byCampaign("", 0),
    ],
  });
}

// Add a new field comment
export function useAddFieldComment() {
  return useMutationWithToast({
    mutationFn: async ({
      responseId,
      fieldDefinitionId,
      comment,
      commentType,
      stepLabel,
    }: {
      responseId: string;
      fieldDefinitionId: string;
      comment: string;
      commentType: 'correction_needed' | 'info' | 'approved';
      stepLabel?: string;
    }) => {
      const data = await api.post('/api/surveys/responses/comments', {
        response_id: responseId,
        field_definition_id: fieldDefinitionId,
        comment,
        comment_type: commentType,
        step_label: stepLabel || null,
      });

      return data;
    },
    invalidateKeys: [queryKeys.surveyResponses.fieldComments("")],
  });
}

// Resolve field comment
export function useResolveFieldComment() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      // TODO: Need a dedicated endpoint for resolving comments, or use PATCH on responses/comments/:id
      const data = await api.patch(`/api/surveys/responses/comments/${id}`, {
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      });

      return data;
    },
    invalidateKeys: [queryKeys.surveyResponses.fieldComments(""), queryKeys.surveyResponses.myPending([], [], [], false)],
  });
}
