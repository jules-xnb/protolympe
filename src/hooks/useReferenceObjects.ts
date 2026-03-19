import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIME_LONG_MS } from '@/lib/constants';

export function useReferenceObjects(definitionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.referenceObjects.byDefinition(definitionId!),
    queryFn: async () => {
      // TODO: This queries business_objects which is outside the scope of
      // organizational-entities/referentials APIs. Add a dedicated endpoint if needed.
      const data = await api.get<Array<{ id: string; reference_number: string }>>(
        `/api/business-objects?definition_id=${definitionId!}&limit=200`
      );
      return data || [];
    },
    enabled: !!definitionId,
    staleTime: STALE_TIME_LONG_MS,
  });
}
