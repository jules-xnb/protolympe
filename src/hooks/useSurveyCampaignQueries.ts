import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  CampaignStatus,
  SurveyCampaign,
  SurveyCampaignWithDetails,
  SurveyCampaignTargetWithEo,
} from './useSurveyCampaigns';

// Fetch all campaigns for a survey
export function useSurveyCampaigns(surveyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveyCampaigns.bySurvey(surveyId!),
    queryFn: async () => {
      if (!surveyId) return [];

      const data = await api.get<SurveyCampaignWithDetails[]>(`/api/surveys/${surveyId}/campaigns`);

      return data;
    },
    enabled: !!surveyId,
  });
}

// Fetch a single campaign
export function useSurveyCampaign(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveyCampaigns.detail(id!),
    queryFn: async () => {
      if (!id) return null;

      const data = await api.get<SurveyCampaign>(`/api/surveys/campaigns/${id}`);

      return {
        ...data,
        status: data.status as CampaignStatus,
      } as SurveyCampaign;
    },
    enabled: !!id,
  });
}

// Fetch campaign targets
export function useCampaignTargets(campaignId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.surveyCampaigns.targets(campaignId!),
    queryFn: async () => {
      if (!campaignId) return [];

      const data = await api.get<SurveyCampaignTargetWithEo[]>(`/api/surveys/campaigns/${campaignId}/targets`);

      return data;
    },
    enabled: !!campaignId,
  });
}

// Get previous campaigns for selection (closed campaigns from the same survey)
export function usePreviousCampaignsOptions(surveyId: string | undefined, excludeCampaignId?: string) {
  return useQuery({
    queryKey: queryKeys.surveyCampaigns.previousOptions(surveyId!, excludeCampaignId),
    queryFn: async () => {
      if (!surveyId) return [];

      const campaigns = await api.get<SurveyCampaign[]>(`/api/surveys/${surveyId}/campaigns`);

      // Filter client-side: only closed campaigns, exclude specified ID
      return (campaigns || [])
        .filter(c => c.status === 'closed')
        .filter(c => !excludeCampaignId || c.id !== excludeCampaignId)
        .map(c => ({ id: c.id, name: c.name, end_date: c.end_date, status: c.status }));
    },
    enabled: !!surveyId,
  });
}
