import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface PermissionMatrix {
  permissions: { slug: string; label: string }[];
  roles: { id: string; name: string; color: string | null }[];
  grants: Record<string, Record<string, boolean>>;
}

export function useModulePermissions(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.modulePermissions.byModule(moduleId!),
    queryFn: () => api.get<PermissionMatrix>(`/api/module-permissions?module_id=${moduleId}`),
    enabled: !!moduleId,
  });
}

export function useUpdateModulePermissions() {
  return useMutationWithToast({
    mutationFn: (data: { module_id: string; grants: Record<string, Record<string, boolean>> }) =>
      api.put<{ success: boolean }>('/api/module-permissions', data),
    invalidateKeys: [queryKeys.modulePermissions.byModule('')],
    successMessage: 'Permissions mises à jour',
  });
}
