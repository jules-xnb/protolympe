import { useQuery } from '@tanstack/react-query';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import type { Tables, TablesInsert } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export type VariationDirection = '+' | '+-' | '-';

export interface NodeFieldSettings {
  allow_comment?: boolean;
  custom_label?: string;
  section_id?: string;
  variation_threshold?: number;
  variation_direction?: VariationDirection;
}

export interface NodeFieldConfig extends Omit<Tables<'node_fields'>, 'settings'> {
  settings: NodeFieldSettings | null;
}

export function useNodeFields(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.nodeFields.byNode(nodeId!),
    queryFn: async () => {
      if (!nodeId) return [];

      const data = await api.get<NodeFieldConfig[]>(
        `/api/workflows/nodes/${nodeId}/fields`
      );

      return data || [];
    },
    enabled: !!nodeId,
  });
}

export async function fetchNodeFields(nodeId: string): Promise<NodeFieldConfig[]> {
  const data = await api.get<NodeFieldConfig[]>(
    `/api/workflows/nodes/${nodeId}/fields`
  );
  return data || [];
}

export function useSaveNodeFields() {
  return useMutationWithToast({
    mutationFn: async ({ nodeId, fields }: { nodeId: string; fields: Omit<TablesInsert<'node_fields'>, 'node_id'>[] }) => {
      // The API handles delete-and-replace
      const data = await api.post<NodeFieldConfig[]>(
        `/api/workflows/nodes/${nodeId}/fields/replace`,
        { fields }
      );
      return data || [];
    },
    invalidateKeys: [queryKeys.nodeFields.byNode("")],
  });
}
