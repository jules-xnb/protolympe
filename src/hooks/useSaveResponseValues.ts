import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface AggregationFieldConfig {
  fieldId: string;
  sourceType: 'eo' | 'user' | 'object';
  sourceEntityId: string; // resolved ID of the referenced entity
  targetFieldId: string; // field_definition_id in the source entity
}

interface SaveValuesInput {
  businessObjectId: string;
  values: Record<string, unknown>;
  aggregationFields?: AggregationFieldConfig[];
}

/**
 * Hook to save survey response field values to object_field_values.
 * Upserts values so it works for both first save and subsequent edits.
 * For aggregation editable fields, writes back to the source entity.
 */
export function useSaveResponseValues() {
  return useMutationWithToast({
    mutationFn: async ({ businessObjectId, values, aggregationFields = [] }: SaveValuesInput) => {
      // TODO: This should be a single server-side endpoint that handles
      // both normal field values and aggregation field writeback.
      // For now, POST to a dedicated save-values endpoint.
      const data = await api.post<{ saved: number }>('/api/surveys/responses/save-values', {
        business_object_id: businessObjectId,
        values,
        aggregation_fields: aggregationFields,
      });

      return data;
    },
    invalidateKeys: [queryKeys.surveyResponses.values(""), queryKeys.businessObjects.all(), queryKeys.campaignFieldColumns.byCampaign("", 0), queryKeys.eoFieldDefinitions.values(), queryKeys.userFieldDefinitions.values("")],
  });
}
