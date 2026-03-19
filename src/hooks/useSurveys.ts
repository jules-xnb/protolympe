import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface Survey {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  created_by: string;
  bo_definition_id: string | null;
  workflow_id: string | null;
  settings: {
    allow_partial_save?: boolean;
    require_validation?: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurveyWithCounts extends Survey {
  _questions_count?: number;
  _campaigns_count?: number;
  _responses_count?: number;
  _creator?: {
    email: string;
    full_name: string | null;
  };
}

export interface SurveyResponsePermission {
  id: string;
  survey_id: string;
  role_id: string | null;
  category_id: string | null;
  created_at: string;
}

export interface SurveyValidationRule {
  id: string;
  survey_id: string;
  validator_role_id: string | null;
  validator_category_id: string | null;
  validation_order: number;
  can_comment_fields: boolean;
  created_at: string;
}

export interface CreateSurveyInput {
  client_id: string;
  name: string;
  description?: string;
  settings?: Survey['settings'];
}

export interface UpdateSurveyInput {
  id: string;
  name?: string;
  description?: string;
  settings?: Survey['settings'];
  is_active?: boolean;
}

// Fetch all surveys for the selected client
export function useSurveys() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.surveys.byClient(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];

      const surveys = await api.get<SurveyWithCounts[]>(`/api/surveys?client_id=${selectedClient.id}`);

      return surveys;
    },
    enabled: !!selectedClient?.id,
  });
}

// Fetch a single survey by ID
export function useSurvey(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveys.detail(id!),
    queryFn: async () => {
      if (!id) return null;

      const data = await api.get<Survey>(`/api/surveys/${id}`);

      return {
        ...data,
        settings: (data.settings || {}) as Survey['settings'],
      } as Survey;
    },
    enabled: !!id,
  });
}

// Fetch response permissions for a survey
export function useSurveyResponsePermissions(surveyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveys.responsePermissions(surveyId!),
    queryFn: async () => {
      if (!surveyId) return [];

      const data = await api.get<SurveyResponsePermission[]>(`/api/surveys/${surveyId}/response-permissions`);
      return data;
    },
    enabled: !!surveyId,
  });
}

// Fetch validation rules for a survey
export function useSurveyValidationRules(surveyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveys.validationRules(surveyId!),
    queryFn: async () => {
      if (!surveyId) return [];

      const data = await api.get<SurveyValidationRule[]>(`/api/surveys/${surveyId}/validation-rules`);
      return data;
    },
    enabled: !!surveyId,
  });
}

// Create a new survey
export function useCreateSurvey() {
  return useMutationWithToast({
    mutationFn: async (input: CreateSurveyInput) => {
      const data = await api.post<Survey>('/api/surveys', {
        client_id: input.client_id,
        name: input.name,
        description: input.description,
        settings: input.settings || {},
      });

      return data;
    },
    invalidateKeys: [queryKeys.surveys.byClient()],
  });
}

// Update a survey
export function useUpdateSurvey() {
  return useMutationWithToast({
    mutationFn: async (input: UpdateSurveyInput) => {
      const { id, ...updates } = input;

      const data = await api.patch<Survey>(`/api/surveys/${id}`, updates);

      return data;
    },
    invalidateKeys: [queryKeys.surveys.byClient(), queryKeys.surveys.detail("")],
  });
}

// Delete a survey
export function useDeleteSurvey() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/surveys/${id}`);
    },
    invalidateKeys: [queryKeys.surveys.byClient()],
  });
}

// Manage response permissions
export function useSetSurveyResponsePermissions() {
  return useMutationWithToast({
    mutationFn: async ({
      surveyId,
      roleIds,
      categoryIds
    }: {
      surveyId: string;
      roleIds: string[];
      categoryIds: string[];
    }) => {
      await api.post(`/api/surveys/response-permissions`, {
        survey_id: surveyId,
        role_ids: roleIds,
        category_ids: categoryIds,
      });
    },
    invalidateKeys: [queryKeys.surveys.responsePermissions("")],
  });
}

// Manage validation rules
export function useSetSurveyValidationRules() {
  return useMutationWithToast({
    mutationFn: async ({
      surveyId,
      rules
    }: {
      surveyId: string;
      rules: Array<{
        validator_role_id?: string;
        validator_category_id?: string;
        validation_order: number;
        can_comment_fields: boolean;
      }>;
    }) => {
      await api.post(`/api/surveys/validation-rules`, {
        survey_id: surveyId,
        rules,
      });
    },
    invalidateKeys: [queryKeys.surveys.validationRules("")],
  });
}
