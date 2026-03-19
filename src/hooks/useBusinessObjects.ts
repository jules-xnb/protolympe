import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import type { Json } from '@/types/database';
import { computeDynamicStatus, type ValidationStepInfo } from '@/hooks/useSurveyResponses';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { resolveAggregationValues } from '@/lib/aggregation-resolver';
import { useMutationWithToast } from './useMutationWithToast';
import { createCrudHooks } from './createCrudHooks';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface BusinessObject {
  id: string;
  definition_id: string;
  eo_id: string;
  reference_number: string;
  title: string | null;
  status: string | null;
  is_archived: boolean;
  campaign_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

/** Business object row with joined organizational_entity */
type BusinessObjectWithEO = BusinessObject & {
  organizational_entity: { id: string; name: string; code: string } | null;
};

export interface BusinessObjectWithValues extends BusinessObject {
  field_values: Record<string, Json>;
  eo_name?: string;
  campaign_name?: string;
  campaign_type_name?: string;
  dynamic_status?: string;
}

export interface PaginatedBusinessObjects {
  data: BusinessObjectWithValues[];
  totalCount: number;
}

interface BoListResponse {
  data: BusinessObjectWithEO[];
  totalCount: number;
}

interface FieldValueRow {
  business_object_id: string;
  field_definition_id: string;
  value: Json;
}

interface CampaignInfoRow {
  id: string;
  name: string;
  survey?: { name?: string; settings?: Record<string, unknown> };
}

interface SurveyResponseRow {
  business_object_id: string;
  status: string;
  current_step_id?: string;
}

export function useBusinessObjects(definitionId: string | undefined, page: number = 1, pageSize: number = DEFAULT_PAGE_SIZE) {
  const { data: fieldDefs = [] } = useFieldDefinitions(definitionId);

  return useQuery({
    queryKey: queryKeys.businessObjects.byDefinition(definitionId!, page, pageSize, fieldDefs.map(f => f.id).join(',')),
    queryFn: async (): Promise<PaginatedBusinessObjects> => {
      if (!definitionId) return { data: [], totalCount: 0 };

      // Fetch business objects with their EO (paginated)
      const result = await api.get<BoListResponse>(
        `/api/business-objects?definition_id=${definitionId}&page=${page}&page_size=${pageSize}&is_archived=false&include_eo=true`
      );

      const objects = result.data || [];
      const totalCount = result.totalCount || 0;
      if (objects.length === 0) return { data: [], totalCount };

      // Get all object IDs
      const objectIds = objects.map(o => o.id);

      // Fetch all field values for these objects
      let fieldValues: FieldValueRow[] = [];
      try {
        fieldValues = await api.post<FieldValueRow[]>('/api/business-objects/values/bulk', { business_object_ids: objectIds });
      } catch (e) {
        console.error('Error fetching field values:', e);
      }

      // Group field values by business_object_id
      const valuesMap = new Map<string, Record<string, Json>>();
      if (fieldValues) {
        fieldValues.forEach(fv => {
          if (!valuesMap.has(fv.business_object_id)) {
            valuesMap.set(fv.business_object_id, {});
          }
          valuesMap.get(fv.business_object_id)![fv.field_definition_id] = fv.value;
        });
      }

      // Fetch campaign info directly from business_objects.campaign_id
      const campaignIds = [...new Set(objects.map(o => o.campaign_id).filter(Boolean))] as string[];
      const campaignMap = new Map<string, string>();
      const campaignTypeMap = new Map<string, string>();
      const dynamicStatusMap = new Map<string, string>();

      if (campaignIds.length > 0) {
        const campaigns = await api.post<CampaignInfoRow[]>('/api/survey-campaigns/bulk', { ids: campaignIds });

        const campaignInfoMap = new Map<string, { name: string; surveyName: string; settings: Record<string, unknown> }>();
        if (campaigns) {
          campaigns.forEach(c => {
            campaignInfoMap.set(c.id, {
              name: c.name || '',
              surveyName: c.survey?.name || '',
              settings: (c.survey?.settings || {}) as Record<string, unknown>,
            });
          });
        }

        // Fetch survey_responses for dynamic status
        const responses = await api.post<SurveyResponseRow[]>('/api/survey-responses/bulk-by-bo', { business_object_ids: objectIds });

        const responseMap = new Map<string, { status: string; current_step_id?: string }>();
        if (responses) {
          responses.forEach(r => {
            if (r.business_object_id) {
              responseMap.set(r.business_object_id, { status: r.status, current_step_id: r.current_step_id || undefined });
            }
          });
        }

        objects.forEach(obj => {
          if (!obj.campaign_id) return;
          const info = campaignInfoMap.get(obj.campaign_id);
          if (!info) return;
          campaignMap.set(obj.id, info.name);
          campaignTypeMap.set(obj.id, info.surveyName);

          const resp = responseMap.get(obj.id);
          if (resp) {
            const validationSteps: ValidationStepInfo[] = (info.settings.validation_steps || []) as ValidationStepInfo[];
            const dynStatus = computeDynamicStatus(resp, validationSteps);
            if (dynStatus.stepName) {
              dynamicStatusMap.set(obj.id, dynStatus.stepName);
            }
          }
        });
      }

      // Resolve aggregation fields
      const aggregationValues = await resolveAggregationValues(fieldDefs, objects, valuesMap);

      // Combine objects with their field values
      const objectsWithValues: BusinessObjectWithValues[] = objects.map(obj => {
        const fieldVals = { ...(valuesMap.get(obj.id) || {}) };
        // Inject aggregation values
        aggregationValues.forEach((valueMap, fieldId) => {
          const val = valueMap.get(obj.id);
          if (val !== undefined) fieldVals[fieldId] = val;
        });
        return {
          ...obj,
          field_values: fieldVals,
          eo_name: (obj as BusinessObjectWithEO).organizational_entity?.name || undefined,
          campaign_name: campaignMap.get(obj.id) || undefined,
          campaign_type_name: campaignTypeMap.get(obj.id) || undefined,
          dynamic_status: dynamicStatusMap.get(obj.id),
        };
      });

      return { data: objectsWithValues, totalCount };
    },
    enabled: !!definitionId,
    placeholderData: keepPreviousData,
  });
}

export function useArchivedBusinessObjects(definitionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.businessObjects.archived(definitionId),
    queryFn: async () => {
      if (!definitionId) return [];

      const result = await api.get<BoListResponse>(
        `/api/business-objects?definition_id=${definitionId}&is_archived=true&include_eo=true`
      );

      return (result.data || []).map(obj => ({
        ...obj,
        eo_name: (obj as BusinessObjectWithEO).organizational_entity?.name || undefined,
      }));
    },
    enabled: !!definitionId,
  });
}

export function useCreateBusinessObject() {
  return useMutationWithToast({
    mutationFn: async (params: {
      definition_id: string;
      eo_id: string;
      created_by_user_id: string;
      name?: string;
      fieldValues?: Array<{ field_definition_id: string; value: Json }>;
    }) => {
      const bo = await api.post<{ id: string }>('/api/business-objects', {
        definition_id: params.definition_id,
        eo_id: params.eo_id,
        created_by_user_id: params.created_by_user_id,
        name: params.name?.trim() || undefined,
        fieldValues: params.fieldValues,
      });

      return bo;
    },
    invalidateKeys: [queryKeys.businessObjects.all()],
    successMessage: 'Élément créé',
    errorMessage: 'Erreur lors de la création de l\'élément',
  });
}

// Archive/restore via factory (is_archived column)
const boCrud = createCrudHooks({
  tableName: 'business_objects',
  queryKey: queryKeys.businessObjects.crudKey,
  archiveColumn: 'is_archived',
  defaultOrder: 'created_at',
});

export const useArchiveBusinessObject = boCrud.useArchive;
export const useRestoreBusinessObject = boCrud.useRestore;
