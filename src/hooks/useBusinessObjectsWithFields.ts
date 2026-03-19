import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import type { Json } from '@/types/database';
import type { PreFilterConfig } from '@/components/builder/page-builder/types';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface BusinessObjectWithFields {
  id: string;
  reference_number: string;
  title: string | null;
  status: string | null;
  created_at: string;
  eo_id: string;
  _fieldValues: Map<string, Json>;
}

interface BusinessObjectRow {
  id: string;
  reference_number: string;
  title: string | null;
  status: string | null;
  created_at: string;
  eo_id: string;
}

interface FieldValueRow {
  business_object_id: string;
  field_definition_id: string;
  value: Json;
}

interface UseBusinessObjectsOptions {
  definitionId: string | null | undefined;
  page?: number;
  pageSize?: number;
  prefilters?: PreFilterConfig[];
}

interface BoListApiResponse {
  data: BusinessObjectRow[];
  totalCount: number;
}

export function useBusinessObjectsWithFields({
  definitionId,
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  prefilters,
}: UseBusinessObjectsOptions) {
  return useQuery({
    queryKey: queryKeys.businessObjects.withFields(definitionId!, page, pageSize, prefilters),
    queryFn: async () => {
      if (!definitionId) return { items: [] as BusinessObjectWithFields[], totalCount: 0 };

      // Fetch BOs with count (API uses 1-based pages)
      const result = await api.get<BoListApiResponse>(
        `/api/business-objects?definition_id=${definitionId}&page=${page + 1}&page_size=${pageSize}`
      );

      const totalCount = result.totalCount || 0;
      const businessObjects = result.data || [];
      if (businessObjects.length === 0) return { items: [] as BusinessObjectWithFields[], totalCount };

      // Fetch field values
      const boIds = businessObjects.map((bo) => bo.id);
      const fieldValues = await api.post<FieldValueRow[]>('/api/business-objects/values/bulk', { business_object_ids: boIds });

      const fieldValuesByBo = new Map<string, Map<string, Json>>();
      (fieldValues || []).forEach((fv) => {
        if (!fieldValuesByBo.has(fv.business_object_id)) {
          fieldValuesByBo.set(fv.business_object_id, new Map());
        }
        fieldValuesByBo.get(fv.business_object_id)!.set(fv.field_definition_id, fv.value);
      });

      const items = businessObjects.map((bo) => ({
        ...bo,
        _fieldValues: fieldValuesByBo.get(bo.id) || new Map(),
      })) as BusinessObjectWithFields[];

      return { items, totalCount };
    },
    enabled: !!definitionId,
  });
}

export function useBusinessObject(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.businessObjects.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      return api.get<BusinessObjectRow>(`/api/business-objects/${id}`);
    },
    enabled: !!id,
  });
}

export function useObjectFieldValues(businessObjectId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.businessObjects.fieldValues(businessObjectId!),
    queryFn: async () => {
      if (!businessObjectId) return [];
      return api.get<{ field_definition_id: string; value: Json }[]>(
        `/api/business-objects/${businessObjectId}/values`
      );
    },
    enabled: !!businessObjectId,
  });
}
