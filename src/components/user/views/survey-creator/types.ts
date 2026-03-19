import type { CampaignStatus } from '@/hooks/useSurveyCampaigns';

export interface CampaignWithSurvey {
  id: string;
  name: string;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  survey_id: string;
  survey: {
    id: string;
    name: string;
    settings: {
      campaign_type_id?: string;
      campaign_type_name?: string;
    } | null;
  };
  _responses_count?: number;
  _progress?: {
    validated: number;
    inProgress: number;
    total: number;
  };
}
