export type CampaignStatus = 'active' | 'paused' | 'closed';

export interface SurveyCampaign {
  id: string;
  survey_id: string;
  name: string;
  previous_campaign_id: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  source_view_config_id: string | null;  // Track which view created this campaign
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SurveyCampaignWithDetails extends SurveyCampaign {
  _survey?: {
    id: string;
    name: string;
  };
  _targets_count?: number;
  _responses_count?: number;
  _previous_campaign?: {
    id: string;
    name: string;
    end_date: string | null;
  } | null;
}

export interface SurveyCampaignTarget {
  id: string;
  campaign_id: string;
  eo_id: string;
  include_descendants: boolean;
  created_at: string;
}

export interface SurveyCampaignTargetWithEo extends SurveyCampaignTarget {
  _eo?: {
    id: string;
    name: string;
    code: string | null;
    level: number;
  };
}

export interface CreateCampaignInput {
  survey_id?: string;  // Optional - if not provided, will create survey from workflow
  name: string;
  previous_campaign_id?: string | null;
  start_date?: string;
  end_date?: string;
  targets: Array<{
    eo_id: string;
    include_descendants: boolean;
  }>;
  workflow_id: string;
  client_id?: string;
  source_view_config_id?: string;
}

export interface UpdateCampaignInput {
  id: string;
  name?: string;
  previous_campaign_id?: string | null;
  status?: CampaignStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export * from './useSurveyCampaignQueries';
export * from './useSurveyCampaignMutations';
