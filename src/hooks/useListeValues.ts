import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIME_LONG_MS } from '@/lib/constants';

export function useListeValues(referentialId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.listeValues.byReferential(referentialId!),
    queryFn: async () => {
      const data = await api.get<Array<{ id: string; label: string; code: string }>>(
        `/api/referentials/${referentialId!}/values`
      );
      return data || [];
    },
    enabled: !!referentialId,
    staleTime: STALE_TIME_LONG_MS,
  });
}

/**
 * Fetch liste values for a set of liste IDs and return a
 * flat id -> label lookup map. Useful for rendering field values in
 * business-object instance tables.
 */
export function useListeValueLabels(referentialIds: string[]) {
  return useQuery({
    queryKey: queryKeys.listeValues.forBo(referentialIds),
    queryFn: async () => {
      if (referentialIds.length === 0) return [];
      // Fetch values for each liste in parallel
      const results = await Promise.all(
        referentialIds.map(refId =>
          api.get<Array<{ id: string; label: string; referential_id: string }>>(`/api/referentials/${refId}/values`)
        )
      );
      return results.flat();
    },
    enabled: referentialIds.length > 0,
  });
}

export function useAllListeValues(fields: Array<{ referential_id?: string | null }>) {
  const refIds = [...new Set(fields.map(f => f.referential_id).filter(Boolean))] as string[];
  return useQuery({
    queryKey: queryKeys.listeValues.batch(refIds),
    queryFn: async () => {
      if (refIds.length === 0) return new Map<string, Array<{ id: string; label: string; code: string }>>();
      // Fetch values for each liste in parallel
      const results = await Promise.all(
        refIds.map(refId =>
          api.get<Array<{ id: string; label: string; code: string; referential_id: string }>>(`/api/referentials/${refId}/values`)
        )
      );
      const map = new Map<string, Array<{ id: string; label: string; code: string }>>();
      results.flat().forEach(rv => {
        const list = map.get(rv.referential_id) || [];
        list.push({ id: rv.id, label: rv.label, code: rv.code });
        map.set(rv.referential_id, list);
      });
      return map;
    },
    enabled: refIds.length > 0,
    staleTime: STALE_TIME_LONG_MS,
  });
}
