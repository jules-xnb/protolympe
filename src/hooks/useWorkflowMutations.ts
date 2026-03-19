import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateWorkflow() {
  return useMutationWithToast({
    mutationFn: async (data: {
      client_id: string;
      name: string;
      slug: string;
      description?: string | null;
      workflow_type?: string | null;
      bo_definition_id?: string | null;
      settings?: unknown;
    }) => {
      const result = await api.post<Record<string, unknown>>('/api/workflows', data);
      return result;
    },
    invalidateKeys: [queryKeys.workflows.all()],
  });
}

export function useUpdateWorkflow() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      const result = await api.patch<Record<string, unknown>>(`/api/workflows/${id}`, data);
      return result;
    },
    invalidateKeys: [queryKeys.workflows.all(), queryKeys.workflows.detail("")],
  });
}

export function useDeleteWorkflow() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/workflows/${id}`);
    },
    invalidateKeys: [queryKeys.workflows.all()],
  });
}

export function useDuplicateWorkflow() {
  return useMutationWithToast({
    mutationFn: async (sourceId: string) => {
      const result = await api.post<Record<string, unknown>>(`/api/workflows/${sourceId}/duplicate`);
      return result;
    },
    invalidateKeys: [queryKeys.workflows.all()],
  });
}

export function usePublishWorkflow() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      const result = await api.patch<Record<string, unknown>>(`/api/workflows/${id}`, {
        is_published: true,
        published_at: new Date().toISOString(),
      });
      return result;
    },
    invalidateKeys: [queryKeys.workflows.all(), queryKeys.workflows.detail("")],
  });
}
