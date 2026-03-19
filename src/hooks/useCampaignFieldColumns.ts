import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface CampaignFieldColumn {
  field_id: string;
  field_name: string;
  field_type: string;
  slug?: string;
  visibility: 'visible' | 'readonly' | 'hidden';
  is_required?: boolean;
  referential_id?: string | null;
  reference_object_definition_id?: string | null;
  custom_label?: string;
  calculation_formula?: string | null;
  visibility_conditions?: Array<{
    source_field_id: string;
    operator: string;
    value?: string | number;
  }>;
  visibility_logic?: 'AND' | 'OR';
  variation_threshold?: number;
  variation_direction?: '+' | '+-' | '-';
}

export interface CampaignFieldValues {
  columns: CampaignFieldColumn[];
  valuesMap: Map<string, Record<string, unknown>>; // bo_id -> { field_id -> value }
  previousValuesMap: Map<string, Record<string, unknown>>; // eo_id -> { field_id -> value } (N-1)
}

/**
 * Given a campaign ID, user's role IDs, and business_object_ids,
 * determines which workflow step the user belongs to (respondent or validator),
 * then fetches the field columns configured for that step + their values.
 */
export function useCampaignFieldColumns(
  campaignId: string | undefined,
  businessObjectIds: string[],
  profileRoleIds?: string[],
  options?: { showAllFields?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.campaignFieldColumns.byCampaign(campaignId!, businessObjectIds.length, profileRoleIds),
    queryFn: async (): Promise<CampaignFieldValues> => {
      if (!campaignId) return { columns: [], valuesMap: new Map(), previousValuesMap: new Map() };

      // TODO: This complex field resolution logic should be a single server-side endpoint
      // (e.g. GET /api/surveys/campaigns/:id/field-columns) that accepts business_object_ids,
      // role_ids, and showAllFields as query params.
      const params = new URLSearchParams();
      if (businessObjectIds.length) params.set('bo_ids', businessObjectIds.join(','));
      if (profileRoleIds?.length) params.set('role_ids', profileRoleIds.join(','));
      if (options?.showAllFields) params.set('show_all_fields', 'true');

      const data = await api.get<{
        columns: CampaignFieldColumn[];
        valuesMap: Record<string, Record<string, unknown>>;
        previousValuesMap: Record<string, Record<string, unknown>>;
      }>(`/api/surveys/campaigns/${campaignId}/field-columns?${params.toString()}`);

      return {
        columns: data?.columns || [],
        valuesMap: new Map(Object.entries(data?.valuesMap || {})),
        previousValuesMap: new Map(Object.entries(data?.previousValuesMap || {})),
      };
    },
    enabled: !!campaignId && businessObjectIds.length > 0,
  });
}
