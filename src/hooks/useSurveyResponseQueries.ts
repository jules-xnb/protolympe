import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import {
  filterResponsesByEoPath,
  filterResponsesByRoles,
  computeResponseCommentStats,
  buildResponseWithDetails,
  type SurveyEntry,
  type ResponseWithEo,
  type CampaignEntry,
} from '@/lib/survey/survey-responses';
import { computeDynamicStatus } from '@/lib/response-status';
import { buildLookupMap } from '@/lib/data-utils';
import type {
  ResponseStatus,
  ValidationStepInfo,
  SurveyResponse,
  SurveyResponseWithDetails,
  SurveyFieldComment,
  SurveyFieldCommentWithDetails,
} from '@/types/survey-responses';
import { queryKeys } from '@/lib/query-keys';

// Re-export types and function for backward compatibility
export type { ResponseStatus, ValidationStepInfo, DynamicStatusInfo, SurveyResponse, SurveyResponseWithDetails, SurveyFieldComment, SurveyFieldCommentWithDetails } from '@/types/survey-responses';
export { computeDynamicStatus } from '@/lib/response-status';

export interface ActiveCampaignInfo {
  id: string;
  name: string;
  surveyName: string;
  startDate: string | null;
  endDate: string | null;
}

export interface MyPendingResponsesResult {
  responses: SurveyResponseWithDetails[];
  activeCampaigns: ActiveCampaignInfo[];
}

// Fetch responses for a campaign with dynamic status based on workflow
export function useCampaignResponses(campaignId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveyResponses.byCampaign(campaignId!),
    queryFn: async () => {
      if (!campaignId) return [];

      const data = await api.get<SurveyResponseWithDetails[]>(`/api/surveys/campaigns/${campaignId}/responses`);

      return data || [];
    },
    enabled: !!campaignId,
  });
}

// ── Private helpers for useMyPendingResponses ──
// TODO: The complex EO/role resolution logic below still uses multiple API calls.
// Ideally this should be a single server-side endpoint (e.g. GET /api/surveys/my-pending-responses).

// Fetch responses for current user (to display in user dashboard)
export function useMyPendingResponses(workflowIds?: string[], profileEoIds?: string[], profileRoleIds?: string[], includeClosedCampaigns?: boolean) {
  return useQuery({
    queryKey: queryKeys.surveyResponses.myPending(workflowIds, profileEoIds, profileRoleIds, includeClosedCampaigns),
    queryFn: async (): Promise<MyPendingResponsesResult> => {
      // TODO: This complex logic (EO resolution, role-based filtering, validator path)
      // should be implemented as a server-side endpoint. For now, delegate to a dedicated
      // API endpoint that handles all the orchestration server-side.
      const params = new URLSearchParams();
      if (workflowIds?.length) params.set('workflow_ids', workflowIds.join(','));
      if (profileEoIds?.length) params.set('eo_ids', profileEoIds.join(','));
      if (profileRoleIds?.length) params.set('role_ids', profileRoleIds.join(','));
      if (includeClosedCampaigns) params.set('include_closed', 'true');

      const data = await api.get<MyPendingResponsesResult>(`/api/surveys/my-pending-responses?${params.toString()}`);
      return data || { responses: [], activeCampaigns: [] };
    },
  });
}

// Fetch responses pending validation (for validators)
export function useResponsesPendingValidation() {
  return useQuery({
    queryKey: queryKeys.surveyResponses.pendingValidation(),
    queryFn: async () => {
      const data = await api.get<SurveyResponseWithDetails[]>('/api/surveys/responses-pending-validation');
      return data || [];
    },
  });
}

// Fetch a single response with details
export function useSurveyResponse(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveyResponses.detail(id!),
    queryFn: async () => {
      if (!id) return null;

      const data = await api.get<SurveyResponse>(`/api/surveys/responses/${id}`);

      return {
        ...data,
        status: data.status as ResponseStatus,
      } as SurveyResponse;
    },
    enabled: !!id,
  });
}

// Fetch field comments for a response
export function useResponseFieldComments(responseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveyResponses.fieldComments(responseId!),
    queryFn: async () => {
      if (!responseId) return [];

      const data = await api.get<SurveyFieldCommentWithDetails[]>(`/api/surveys/responses/${responseId}/comments`);

      return data || [];
    },
    enabled: !!responseId,
  });
}
