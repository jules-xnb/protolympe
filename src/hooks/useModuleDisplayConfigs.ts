import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface DisplayConfig {
  id: string;
  client_module_id: string;
  name: string;
  config: Record<string, unknown>;
  role_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useModuleDisplayConfigs(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.moduleDisplayConfigs.byModule(moduleId!),
    queryFn: () => api.get<DisplayConfig[]>(`/api/module-display-configs?module_id=${moduleId}`),
    enabled: !!moduleId,
  });
}

export function useModuleDisplayConfig(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.moduleDisplayConfigs.detail(id!),
    queryFn: () => api.get<DisplayConfig>(`/api/module-display-configs/${id}`),
    enabled: !!id,
  });
}

export function useCreateDisplayConfig() {
  return useMutationWithToast({
    mutationFn: (data: { module_id: string; name: string; config: Record<string, unknown>; role_ids: string[] }) =>
      api.post<DisplayConfig>('/api/module-display-configs', data),
    invalidateKeys: [queryKeys.moduleDisplayConfigs.byModule('')],
    successMessage: 'Configuration créée',
  });
}

export function useUpdateDisplayConfig() {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }: { id: string; name?: string; config?: Record<string, unknown>; role_ids?: string[] }) =>
      api.patch<DisplayConfig>(`/api/module-display-configs/${id}`, data),
    invalidateKeys: [queryKeys.moduleDisplayConfigs.byModule('')],
    successMessage: 'Configuration mise à jour',
  });
}

export function useDeleteDisplayConfig() {
  return useMutationWithToast({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/module-display-configs/${id}`),
    invalidateKeys: [queryKeys.moduleDisplayConfigs.byModule('')],
    successMessage: 'Configuration supprimée',
  });
}
