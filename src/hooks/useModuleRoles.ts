import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface ModuleRole {
  id: string;
  client_module_id: string;
  name: string;
  slug: string;
  color: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export function useModuleRoles(moduleId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.moduleRoles.byModule(moduleId!),
    queryFn: () => api.get<ModuleRole[]>(`/api/module-roles?module_id=${moduleId}`),
    enabled: !!moduleId,
  });
}

export function useCreateModuleRole() {
  return useMutationWithToast({
    mutationFn: (data: { module_id: string; name: string; slug: string; color?: string; description?: string }) =>
      api.post<ModuleRole>('/api/module-roles', data),
    invalidateKeys: [queryKeys.moduleRoles.byModule('')],
    successMessage: 'Rôle créé',
  });
}

export function useUpdateModuleRole() {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }: { id: string; name?: string; slug?: string; color?: string; description?: string; is_active?: boolean }) =>
      api.patch<ModuleRole>(`/api/module-roles/${id}`, data),
    invalidateKeys: [queryKeys.moduleRoles.byModule('')],
    successMessage: 'Rôle mis à jour',
  });
}

export function useDeleteModuleRole() {
  return useMutationWithToast({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/module-roles/${id}`),
    invalidateKeys: [queryKeys.moduleRoles.byModule('')],
    successMessage: 'Rôle supprimé',
  });
}
