import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import type { CreateCampaignInput, UpdateCampaignInput } from './useSurveyCampaigns';
import { queryKeys } from '@/lib/query-keys';

// Create a new campaign
export function useCreateCampaign() {
  return useMutationWithToast({
    mutationFn: async (input: CreateCampaignInput) => {
      const campaign = await api.post<{ id: string }>('/api/surveys/campaigns', input);

      return campaign;
    },
    invalidateKeys: [queryKeys.surveyCampaigns.bySurvey(""), queryKeys.surveys.byClient(), queryKeys.surveyCampaigns.allCampaigns(), queryKeys.surveyCampaigns.viewCampaigns("")],
  });
}

// Update a campaign
export function useUpdateCampaign() {
  return useMutationWithToast({
    mutationFn: async (input: UpdateCampaignInput) => {
      const { id, ...updates } = input;

      const data = await api.patch(`/api/surveys/campaigns/${id}`, updates);

      return data;
    },
    invalidateKeys: [queryKeys.surveyCampaigns.bySurvey(""), queryKeys.surveyCampaigns.detail(""), queryKeys.surveys.byClient()],
  });
}

// Delete a campaign
export function useDeleteCampaign() {
  return useMutationWithToast({
    mutationFn: async ({ id, surveyId }: { id: string; surveyId: string }) => {
      await api.delete(`/api/surveys/campaigns/${id}`);

      return { surveyId };
    },
    invalidateKeys: [queryKeys.surveyCampaigns.bySurvey(""), queryKeys.surveys.byClient()],
  });
}

// Launch a campaign (set status to active)
export function useLaunchCampaign() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      const data = await api.patch(`/api/surveys/campaigns/${id}`, {
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
      });

      return data;
    },
    invalidateKeys: [queryKeys.surveyCampaigns.bySurvey(""), queryKeys.surveyCampaigns.detail("")],
  });
}

// Close a campaign
export function useCloseCampaign() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      const data = await api.patch(`/api/surveys/campaigns/${id}`, {
        status: 'closed',
        end_date: new Date().toISOString().split('T')[0],
      });

      return data;
    },
    invalidateKeys: [queryKeys.surveyCampaigns.bySurvey(""), queryKeys.surveyCampaigns.detail("")],
  });
}

// Update campaign targets
export function useUpdateCampaignTargets() {
  return useMutationWithToast({
    mutationFn: async ({
      campaignId,
      targets
    }: {
      campaignId: string;
      targets: Array<{ eo_id: string; include_descendants: boolean }>;
    }) => {
      // Delete existing targets and create new ones via the API
      // First delete all existing targets
      const existingTargets = await api.get<Array<{ id: string }>>(`/api/surveys/campaigns/${campaignId}/targets`);
      for (const target of existingTargets) {
        await api.delete(`/api/surveys/campaigns/targets/${target.id}`);
      }

      // Insert new targets
      if (targets.length > 0) {
        await api.post(`/api/surveys/campaigns/${campaignId}/targets`, targets);
      }
    },
    invalidateKeys: [queryKeys.surveyCampaigns.targets("")],
  });
}
