import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { computeDynamicStatus, type SurveyResponseWithDetails, type ResponseStatus, type ValidationStepInfo } from './useSurveyResponses';
import type { StepFieldConfig, ValidationStep } from '@/components/builder/page-builder/types';
import type { Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

export interface VisibleField {
  field_id: string;
  field_name: string;
  field_type: string;
  visibility: 'visible' | 'readonly';
  is_required?: boolean;
}

export interface FilteredResponse extends SurveyResponseWithDetails {
  _user_role: 'respondent' | 'validator' | 'readonly';
  _field_values?: Record<string, Json>; // field_definition_id -> value
  _commented_field_ids?: Set<string>; // field_definition_ids that have unresolved comments
}

export interface AccessibleStep {
  id: string;
  name: string;
  order: number;
  role: 'validator' | 'readonly';
}

export interface UseFilteredCampaignResponsesResult {
  responses: FilteredResponse[];
  visibleFields: VisibleField[];
  canViewValidated: boolean;
  accessibleSteps: AccessibleStep[];
  endNodeName: string | null;
  endNodeIds: string[];
  isLoading: boolean;
  error: Error | null;
}

export function useFilteredCampaignResponses(
  campaignId: string | undefined,
  profileEoIds: string[],
  profileRoleIds: string[],
  options?: { showAllResponses?: boolean }
): UseFilteredCampaignResponsesResult {
  const query = useQuery({
    queryKey: queryKeys.filteredCampaignResponses.byCampaign(campaignId!, profileEoIds, profileRoleIds, options?.showAllResponses),
    queryFn: async () => {
      if (!campaignId) return { responses: [], visibleFields: [], canViewValidated: false, accessibleSteps: [], endNodeName: null, endNodeIds: [] };

      // TODO: This complex filtering/field-resolution logic should ideally be a single
      // server-side endpoint (e.g. GET /api/surveys/campaigns/:id/filtered-responses)
      // that accepts profileEoIds, profileRoleIds, and showAllResponses as query params.
      const params = new URLSearchParams();
      if (profileEoIds.length) params.set('eo_ids', profileEoIds.join(','));
      if (profileRoleIds.length) params.set('role_ids', profileRoleIds.join(','));
      if (options?.showAllResponses) params.set('show_all', 'true');

      const data = await api.get<{
        responses: FilteredResponse[];
        visibleFields: VisibleField[];
        canViewValidated: boolean;
        accessibleSteps: AccessibleStep[];
        endNodeName: string | null;
        endNodeIds: string[];
      }>(`/api/surveys/campaigns/${campaignId}/filtered-responses?${params.toString()}`);

      return data || { responses: [], visibleFields: [], canViewValidated: false, accessibleSteps: [], endNodeName: null, endNodeIds: [] };
    },
    enabled: !!campaignId && (profileEoIds.length > 0 || !!options?.showAllResponses),
  });

  return {
    responses: query.data?.responses || [],
    visibleFields: query.data?.visibleFields || [],
    canViewValidated: query.data?.canViewValidated || false,
    accessibleSteps: query.data?.accessibleSteps || [],
    endNodeName: query.data?.endNodeName || null,
    endNodeIds: query.data?.endNodeIds || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
