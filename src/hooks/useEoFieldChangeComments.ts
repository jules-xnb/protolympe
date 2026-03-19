import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface EoFieldChangeComment {
  id: string;
  eo_id: string;
  field_definition_id: string;
  old_value: string | null;
  new_value: string | null;
  comment: string;
  created_by: string | null;
  created_at: string;
}

export function useEoFieldChangeComments(eoId?: string, fieldDefinitionId?: string) {
  return useQuery({
    queryKey: queryKeys.eoFieldChangeComments.byEoAndField(eoId!, fieldDefinitionId),
    queryFn: async () => {
      if (!eoId) return [];

      let url = `/api/organizational-entities/${eoId}/comments`;
      if (fieldDefinitionId) {
        url += `?field_definition_id=${fieldDefinitionId}`;
      }

      return await api.get<EoFieldChangeComment[]>(url);
    },
    enabled: !!eoId,
  });
}

export function useCreateEoFieldChangeComment() {
  return useMutationWithToast({
    mutationFn: async (data: {
      eo_id: string;
      field_definition_id: string;
      old_value: string | null;
      new_value: string | null;
      comment: string;
    }) => {
      return await api.post<EoFieldChangeComment>(
        '/api/organizational-entities/comments',
        data
      );
    },
    invalidateKeys: [queryKeys.eoFieldChangeComments.byEoAndField("", "")],
  });
}
