import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface ClientModule {
  id: string;
  client_id: string;
  module_slug: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClientModules(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.modules.byClient(clientId),
    queryFn: () => api.get<ClientModule[]>(`/api/modules?client_id=${clientId}`),
    enabled: !!clientId,
  });
}

export function useClientModule(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.modules.detail(id!),
    queryFn: () => api.get<ClientModule & { catalog: Record<string, unknown> }>(`/api/modules/${id}`),
    enabled: !!id,
  });
}

export function useActivateModule() {
  return useMutationWithToast({
    mutationFn: (data: { clientId: string; moduleSlug: string }) =>
      api.post<ClientModule>('/api/modules', data),
    invalidateKeys: [queryKeys.modules.byClient('')],
    successMessage: 'Module activé',
  });
}

export function useUpdateModule() {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }: { id: string; config?: Record<string, unknown>; is_active?: boolean }) =>
      api.patch<ClientModule>(`/api/modules/${id}`, data),
    invalidateKeys: [queryKeys.modules.byClient('')],
    successMessage: 'Module mis à jour',
  });
}

export function useDeactivateModule() {
  return useMutationWithToast({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/modules/${id}`),
    invalidateKeys: [queryKeys.modules.byClient('')],
    successMessage: 'Module désactivé',
  });
}
