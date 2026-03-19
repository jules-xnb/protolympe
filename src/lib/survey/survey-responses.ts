import type { ResponseStatus, SurveyResponseWithDetails } from '@/types/survey-responses';

/**
 * Pure business logic functions extracted from useMyPendingResponses.
 * These are stateless data transformations with no Supabase dependencies.
 */

// ── Types for function parameters ──────────────────────────────────────────

/** A response row joined with its organizational_entities relation. */
export interface ResponseWithEo {
  id: string;
  campaign_id: string;
  respondent_eo_id: string;
  status: string;
  current_step_id?: string | null;
  organizational_entities?: {
    id: string;
    name: string;
    code: string | null;
    path: string;
  } | null;
  [key: string]: unknown;
}

export interface CampaignEntry {
  id: string;
  name: string;
  survey_id: string;
  start_date: string | null;
  end_date: string | null;
  previous_campaign_id: string | null;
}

export interface SurveyEntry {
  id: string;
  name: string;
  bo_definition_id: string | null;
  settings?: {
    default_responder_roles?: string[];
    validation_steps?: Array<{
      id: string;
      name: string;
      order: number;
      validator_roles?: string[];
    }>;
    enable_validation_workflow?: boolean;
  } | null;
  workflow_id?: string | null;
}

export interface CommentRow {
  response_id: string;
  is_resolved: boolean;
}

export interface CommentStats {
  total: number;
  unresolved: number;
}

export interface EoEntry {
  id: string;
  name: string;
  code: string | null;
}

// ── Extracted pure functions ───────────────────────────────────────────────

/**
 * Filter responses whose EO path starts with one of the user's EO paths.
 * A response matches if its EO path equals a user path or is a descendant
 * (path prefixed with `userPath.`).
 */
export function filterResponsesByEoPath(
  responses: ResponseWithEo[],
  userEoPaths: string[],
): ResponseWithEo[] {
  return responses.filter(r => {
    const eoPath = r.organizational_entities?.path;
    if (!eoPath) return false;
    return userEoPaths.some(userPath => eoPath === userPath || eoPath.startsWith(userPath + '.'));
  });
}

/**
 * Filter responses by role-based visibility rules.
 *
 * The logic varies by response status:
 * - pending / in_progress / rejected → visible if user has a responder role
 * - submitted → visible to responder roles (tracking) + first validator step
 * - in_validation → visible only to the current validation step's validator roles
 * - validated → visible to all involved roles (responders + all validators)
 *
 * When no roles are configured for a given check, the response is visible
 * to everyone (backward compatibility).
 */
export function filterResponsesByRoles(
  responses: ResponseWithEo[],
  profileRoleIds: string[],
  campaignsMap: Map<string, CampaignEntry>,
  surveysMap: Map<string, SurveyEntry>,
): ResponseWithEo[] {
  return responses.filter(r => {
    const status = r.status as ResponseStatus;
    const campaign = campaignsMap.get(r.campaign_id);
    const survey = campaign ? surveysMap.get(campaign.survey_id) : undefined;
    const settings = survey?.settings;

    // Respondent statuses: check default_responder_roles
    if (['pending', 'in_progress', 'rejected'].includes(status)) {
      const responderRoles: string[] = settings?.default_responder_roles || [];
      // If no responder roles configured, allow all (backward compat)
      if (responderRoles.length === 0) return true;
      return responderRoles.some(roleId => profileRoleIds.includes(roleId));
    }

    // Submitted: visible to respondent roles (tracking) and first validator step
    if (status === 'submitted') {
      const responderRoles: string[] = settings?.default_responder_roles || [];
      const validationSteps = settings?.validation_steps || [];
      const firstStep = validationSteps[0];
      const hasResponderRole = responderRoles.length === 0 || responderRoles.some((roleId: string) => profileRoleIds.includes(roleId));
      const hasValidatorRole = firstStep?.validator_roles?.some((roleId: string) => profileRoleIds.includes(roleId));
      return hasResponderRole || hasValidatorRole;
    }

    // In validation: check validator_roles for the current step
    if (status === 'in_validation') {
      const validationSteps = settings?.validation_steps || [];
      const currentStepId = r.current_step_id;
      const currentStep = currentStepId
        ? validationSteps.find((s) => s.id === currentStepId)
        : validationSteps[0];
      if (!currentStep) return false;
      return currentStep.validator_roles?.some((roleId: string) => profileRoleIds.includes(roleId));
    }

    // Validated: visible to all roles involved
    if (status === 'validated') {
      const responderRoles: string[] = settings?.default_responder_roles || [];
      const validationSteps = settings?.validation_steps || [];
      const allRoles = [
        ...responderRoles,
        ...validationSteps.flatMap((s) => s.validator_roles || []),
      ];
      if (allRoles.length === 0) return true;
      return allRoles.some(roleId => profileRoleIds.includes(roleId));
    }

    return true;
  });
}

/**
 * Aggregate comment rows into per-response stats (total count and unresolved count).
 */
export function computeResponseCommentStats(
  comments: CommentRow[],
): Map<string, CommentStats> {
  const map = new Map<string, CommentStats>();
  comments.forEach(c => {
    const existing = map.get(c.response_id) || { total: 0, unresolved: 0 };
    existing.total++;
    if (!c.is_resolved) existing.unresolved++;
    map.set(c.response_id, existing);
  });
  return map;
}

/**
 * Enrich a raw response row with its associated campaign, survey, EO, and comment stats.
 */
export function buildResponseWithDetails(
  response: ResponseWithEo,
  campaignsMap: Map<string, CampaignEntry>,
  surveysMap: Map<string, SurveyEntry>,
  eosMap: Map<string, EoEntry>,
  commentsMap: Map<string, CommentStats>,
): SurveyResponseWithDetails {
  const campaign = campaignsMap.get(response.campaign_id);
  const survey = campaign ? surveysMap.get(campaign.survey_id) : undefined;
  const commentStats = commentsMap.get(response.id) || { total: 0, unresolved: 0 };

  return {
    ...response,
    organizational_entities: undefined,
    status: response.status as ResponseStatus,
    _campaign: campaign,
    _survey: survey,
    _eo: eosMap.get(response.respondent_eo_id),
    _comments_count: commentStats.total,
    _unresolved_comments_count: commentStats.unresolved,
  };
}
