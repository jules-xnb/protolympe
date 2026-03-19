import { describe, it, expect } from 'vitest';
import {
  filterResponsesByEoPath,
  filterResponsesByRoles,
  computeResponseCommentStats,
  buildResponseWithDetails,
} from '@/lib/survey/survey-responses';
import type {
  ResponseWithEo,
  CampaignEntry,
  SurveyEntry,
  CommentRow,
  CommentStats,
  EoEntry,
} from '@/lib/survey/survey-responses';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeResponse(overrides: Partial<ResponseWithEo> = {}): ResponseWithEo {
  return {
    id: 'resp-1',
    campaign_id: 'camp-1',
    respondent_eo_id: 'eo-1',
    status: 'pending',
    ...overrides,
  };
}

function makeCampaign(overrides: Partial<CampaignEntry> = {}): CampaignEntry {
  return {
    id: 'camp-1',
    name: 'Campaign 1',
    survey_id: 'survey-1',
    start_date: null,
    end_date: null,
    previous_campaign_id: null,
    ...overrides,
  };
}

function makeSurvey(overrides: Partial<SurveyEntry> = {}): SurveyEntry {
  return {
    id: 'survey-1',
    name: 'Survey 1',
    bo_definition_id: null,
    settings: null,
    ...overrides,
  };
}

// ── filterResponsesByEoPath ─────────────────────────────────────────────────

describe('filterResponsesByEoPath', () => {
  it('should include response whose EO path exactly matches a user path', () => {
    const responses = [
      makeResponse({
        organizational_entities: { id: 'eo-1', name: 'HQ', code: null, path: 'org.hq' },
      }),
    ];
    const result = filterResponsesByEoPath(responses, ['org.hq']);
    expect(result).toHaveLength(1);
  });

  it('should include response whose EO path is a descendant (starts with userPath + ".")', () => {
    const responses = [
      makeResponse({
        organizational_entities: { id: 'eo-1', name: 'Team', code: null, path: 'org.hq.team' },
      }),
    ];
    const result = filterResponsesByEoPath(responses, ['org.hq']);
    expect(result).toHaveLength(1);
  });

  it('should exclude response with non-matching path', () => {
    const responses = [
      makeResponse({
        organizational_entities: { id: 'eo-1', name: 'Other', code: null, path: 'org.other' },
      }),
    ];
    const result = filterResponsesByEoPath(responses, ['org.hq']);
    expect(result).toHaveLength(0);
  });

  it('should exclude response with no organizational_entities', () => {
    const responses = [
      makeResponse({ organizational_entities: null }),
      makeResponse({ organizational_entities: undefined }),
    ];
    const result = filterResponsesByEoPath(responses, ['org.hq']);
    expect(result).toHaveLength(0);
  });

  it('should handle multiple user paths', () => {
    const responses = [
      makeResponse({
        id: 'r1',
        organizational_entities: { id: 'eo-1', name: 'HQ', code: null, path: 'org.hq' },
      }),
      makeResponse({
        id: 'r2',
        organizational_entities: { id: 'eo-2', name: 'Sales', code: null, path: 'org.sales.west' },
      }),
      makeResponse({
        id: 'r3',
        organizational_entities: { id: 'eo-3', name: 'Nope', code: null, path: 'org.marketing' },
      }),
    ];
    const result = filterResponsesByEoPath(responses, ['org.hq', 'org.sales']);
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(['r1', 'r2']);
  });
});

// ── computeResponseCommentStats ─────────────────────────────────────────────

describe('computeResponseCommentStats', () => {
  it('should return empty map for no comments', () => {
    const result = computeResponseCommentStats([]);
    expect(result.size).toBe(0);
  });

  it('should count total and unresolved per response_id', () => {
    const comments: CommentRow[] = [
      { response_id: 'r1', is_resolved: false },
      { response_id: 'r1', is_resolved: false },
      { response_id: 'r2', is_resolved: false },
    ];
    const result = computeResponseCommentStats(comments);
    expect(result.get('r1')).toEqual({ total: 2, unresolved: 2 });
    expect(result.get('r2')).toEqual({ total: 1, unresolved: 1 });
  });

  it('should treat resolved comments correctly (lower unresolved count)', () => {
    const comments: CommentRow[] = [
      { response_id: 'r1', is_resolved: true },
      { response_id: 'r1', is_resolved: false },
      { response_id: 'r1', is_resolved: true },
    ];
    const result = computeResponseCommentStats(comments);
    expect(result.get('r1')).toEqual({ total: 3, unresolved: 1 });
  });
});

// ── filterResponsesByRoles ──────────────────────────────────────────────────

describe('filterResponsesByRoles', () => {
  const campaignsMap = new Map<string, CampaignEntry>([
    ['camp-1', makeCampaign()],
  ]);

  function surveysMapWith(settings: SurveyEntry['settings']): Map<string, SurveyEntry> {
    return new Map([['survey-1', makeSurvey({ settings })]]);
  }

  describe('pending / in_progress', () => {
    it('should show if user has a responder role', () => {
      const surveysMap = surveysMapWith({
        default_responder_roles: ['role-a', 'role-b'],
      });
      const responses = [makeResponse({ status: 'pending' })];
      const result = filterResponsesByRoles(responses, ['role-a'], campaignsMap, surveysMap);
      expect(result).toHaveLength(1);
    });

    it('should hide if user does NOT have a responder role', () => {
      const surveysMap = surveysMapWith({
        default_responder_roles: ['role-a'],
      });
      const responses = [makeResponse({ status: 'in_progress' })];
      const result = filterResponsesByRoles(responses, ['role-x'], campaignsMap, surveysMap);
      expect(result).toHaveLength(0);
    });

    it('should show to everyone if no responder roles configured (backward compat)', () => {
      const surveysMap = surveysMapWith({
        default_responder_roles: [],
      });
      const responses = [makeResponse({ status: 'pending' })];
      const result = filterResponsesByRoles(responses, ['any-role'], campaignsMap, surveysMap);
      expect(result).toHaveLength(1);
    });

    it('should show to everyone if settings are null (backward compat)', () => {
      const surveysMap = surveysMapWith(null);
      const responses = [makeResponse({ status: 'pending' })];
      const result = filterResponsesByRoles(responses, ['any-role'], campaignsMap, surveysMap);
      expect(result).toHaveLength(1);
    });
  });

  describe('submitted', () => {
    it('should show to responder roles and first validator step roles', () => {
      const surveysMap = surveysMapWith({
        default_responder_roles: ['role-resp'],
        validation_steps: [
          { id: 'step-1', name: 'Step 1', order: 1, validator_roles: ['role-val-1'] },
          { id: 'step-2', name: 'Step 2', order: 2, validator_roles: ['role-val-2'] },
        ],
      });
      const responses = [makeResponse({ status: 'submitted' })];

      // Responder can see
      expect(filterResponsesByRoles(responses, ['role-resp'], campaignsMap, surveysMap)).toHaveLength(1);
      // First step validator can see
      expect(filterResponsesByRoles(responses, ['role-val-1'], campaignsMap, surveysMap)).toHaveLength(1);
      // Second step validator cannot see
      expect(filterResponsesByRoles(responses, ['role-val-2'], campaignsMap, surveysMap)).toHaveLength(0);
    });
  });

  describe('in_validation', () => {
    it('should show only to current step validator roles', () => {
      const surveysMap = surveysMapWith({
        validation_steps: [
          { id: 'step-1', name: 'Step 1', order: 1, validator_roles: ['role-val-1'] },
          { id: 'step-2', name: 'Step 2', order: 2, validator_roles: ['role-val-2'] },
        ],
      });
      const responses = [makeResponse({ status: 'in_validation', current_step_id: 'step-2' })];

      // Step 2 validator can see
      expect(filterResponsesByRoles(responses, ['role-val-2'], campaignsMap, surveysMap)).toHaveLength(1);
      // Step 1 validator cannot see
      expect(filterResponsesByRoles(responses, ['role-val-1'], campaignsMap, surveysMap)).toHaveLength(0);
    });
  });

  describe('validated', () => {
    it('should show to all involved roles (responders + all validators)', () => {
      const surveysMap = surveysMapWith({
        default_responder_roles: ['role-resp'],
        validation_steps: [
          { id: 'step-1', name: 'Step 1', order: 1, validator_roles: ['role-val-1'] },
          { id: 'step-2', name: 'Step 2', order: 2, validator_roles: ['role-val-2'] },
        ],
      });
      const responses = [makeResponse({ status: 'validated' })];

      expect(filterResponsesByRoles(responses, ['role-resp'], campaignsMap, surveysMap)).toHaveLength(1);
      expect(filterResponsesByRoles(responses, ['role-val-1'], campaignsMap, surveysMap)).toHaveLength(1);
      expect(filterResponsesByRoles(responses, ['role-val-2'], campaignsMap, surveysMap)).toHaveLength(1);
      // Unrelated role cannot see
      expect(filterResponsesByRoles(responses, ['role-x'], campaignsMap, surveysMap)).toHaveLength(0);
    });

    it('should show to everyone if no roles configured', () => {
      const surveysMap = surveysMapWith({
        default_responder_roles: [],
        validation_steps: [],
      });
      const responses = [makeResponse({ status: 'validated' })];
      const result = filterResponsesByRoles(responses, ['any-role'], campaignsMap, surveysMap);
      expect(result).toHaveLength(1);
    });
  });
});

// ── buildResponseWithDetails ────────────────────────────────────────────────

describe('buildResponseWithDetails', () => {
  it('should enrich response with campaign, survey, EO, and comment stats', () => {
    const response = makeResponse({ id: 'resp-1', campaign_id: 'camp-1', respondent_eo_id: 'eo-1' });
    const campaign = makeCampaign();
    const survey = makeSurvey();
    const eo: EoEntry = { id: 'eo-1', name: 'HQ', code: 'HQ01' };

    const campaignsMap = new Map([['camp-1', campaign]]);
    const surveysMap = new Map([['survey-1', survey]]);
    const eosMap = new Map([['eo-1', eo]]);
    const commentsMap = new Map<string, CommentStats>([['resp-1', { total: 5, unresolved: 2 }]]);

    const result = buildResponseWithDetails(response, campaignsMap, surveysMap, eosMap, commentsMap);

    expect(result._campaign).toEqual(campaign);
    expect(result._survey).toEqual(survey);
    expect(result._eo).toEqual(eo);
    expect(result._comments_count).toBe(5);
    expect(result._unresolved_comments_count).toBe(2);
    expect(result.organizational_entities).toBeUndefined();
  });

  it('should return zero comment counts when response has no comments', () => {
    const response = makeResponse({ id: 'resp-2', campaign_id: 'camp-1', respondent_eo_id: 'eo-1' });

    const campaignsMap = new Map([['camp-1', makeCampaign()]]);
    const surveysMap = new Map([['survey-1', makeSurvey()]]);
    const eosMap = new Map<string, EoEntry>();
    const commentsMap = new Map<string, CommentStats>();

    const result = buildResponseWithDetails(response, campaignsMap, surveysMap, eosMap, commentsMap);

    expect(result._comments_count).toBe(0);
    expect(result._unresolved_comments_count).toBe(0);
    expect(result._eo).toBeUndefined();
  });
});
