// Base status types (legacy, still used for basic states)
export type ResponseStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'in_validation'
  | 'validated'
  | 'rejected';

// Validation step from survey settings
export interface ValidationStepInfo {
  id: string;
  name: string;
  order: number;
}

// Dynamic status info combining base status with workflow step
export interface DynamicStatusInfo {
  baseStatus: ResponseStatus;
  stepId?: string;          // Current validation step ID (if in validation workflow)
  stepName?: string;        // Current step name for display
  stepNameKey?: string;     // Translation key for stepName (use t(stepNameKey) instead of stepName)
  stepOrder?: number;       // Step order (1, 2, 3...)
  totalSteps?: number;      // Total validation steps
  isComplete: boolean;      // Whether the response is in a final state
}

export interface SurveyResponse {
  id: string;
  campaign_id: string;
  respondent_eo_id: string;
  respondent_user_id: string | null;
  business_object_id: string | null;
  status: ResponseStatus;
  current_workflow_node_id: string | null;
  current_step_id: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyResponseWithDetails extends SurveyResponse {
  _campaign?: {
    id: string;
    name: string;
    survey_id: string;
    start_date: string | null;
    end_date: string | null;
    previous_campaign_id: string | null;
  };
  _survey?: {
    id: string;
    name: string;
    bo_definition_id: string | null;
    settings?: {
      validation_steps?: ValidationStepInfo[];
      enable_validation_workflow?: boolean;
    };
  };
  _eo?: {
    id: string;
    name: string;
    code: string | null;
  };
  _respondent?: {
    email: string;
    full_name: string | null;
  } | null;
  _comments_count?: number;
  _unresolved_comments_count?: number;
  _dynamic_status?: DynamicStatusInfo;
}

export interface SurveyFieldComment {
  id: string;
  response_id: string;
  field_definition_id: string;
  commenter_user_id: string;
  comment: string;
  comment_type: 'correction_needed' | 'info' | 'approved';
  step_label: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface SurveyFieldCommentWithDetails extends SurveyFieldComment {
  _commenter?: {
    email: string;
    full_name: string | null;
  };
  _field?: {
    id: string;
    name: string;
    slug: string;
  };
}
