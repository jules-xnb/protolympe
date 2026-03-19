import { useQuery } from '@tanstack/react-query';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import type { Tables, TablesInsert } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export type NodeSection = Tables<'node_sections'>;

export function useNodeSections(nodeId: string | null) {
  return useQuery({
    queryKey: queryKeys.nodeSections.byNode(nodeId!),
    queryFn: async () => {
      if (!nodeId) return [];

      const data = await api.get<NodeSection[]>(
        `/api/workflows/nodes/${nodeId}/sections`
      );

      return data || [];
    },
    enabled: !!nodeId,
  });
}

export async function fetchNodeSections(nodeId: string): Promise<NodeSection[]> {
  const data = await api.get<NodeSection[]>(
    `/api/workflows/nodes/${nodeId}/sections`
  );
  return data || [];
}

export function useSaveNodeSections() {
  return useMutationWithToast({
    mutationFn: async ({ nodeId, sections }: { nodeId: string; sections: Omit<TablesInsert<'node_sections'>, 'node_id'>[] }) => {
      // The API handles delete-and-replace
      const data = await api.post<NodeSection[]>(
        `/api/workflows/nodes/${nodeId}/sections/replace`,
        { sections }
      );
      return data || [];
    },
    invalidateKeys: [queryKeys.nodeSections.byNode("")],
  });
}
