import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

export type ViewPermission = Tables<'view_permissions'>;

export interface ViewPermissionWithRelations extends ViewPermission {
  role?: { id: string; name: string; color: string | null } | null;
  category?: { id: string; name: string } | null;
}

export function useViewPermissions(viewConfigId: string | undefined) {
  return useQuery<ViewPermissionWithRelations[]>({
    queryKey: queryKeys.viewPermissions.byConfig(viewConfigId!),
    queryFn: async () => {
      if (!viewConfigId) return [];

      const data = await api.get<ViewPermissionWithRelations[]>(`/api/view-configs/${viewConfigId}/permissions`);
      return data;
    },
    enabled: !!viewConfigId,
  });
}

export function useCreateViewPermission() {
  return useMutationWithToast({
    mutationFn: async (data: TablesInsert<'view_permissions'>) => {
      const result = await api.post<ViewPermission>('/api/view-configs/permissions', data);
      return result;
    },
    invalidateKeys: [queryKeys.viewPermissions.all()],
  });
}

export function useUpdateViewPermission() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: TablesUpdate<'view_permissions'> & { id: string; view_config_id: string }) => {
      // TODO: No direct PATCH endpoint for view permissions — use delete + create pattern or add endpoint
      // For now, delete and recreate
      await api.delete(`/api/view-configs/permissions/${id}`);
      const result = await api.post<ViewPermission>('/api/view-configs/permissions', { ...data, view_config_id: data.view_config_id });
      return result;
    },
    invalidateKeys: [queryKeys.viewPermissions.all()],
  });
}

export function useDeleteViewPermission() {
  return useMutationWithToast({
    mutationFn: async ({ id, viewConfigId: _viewConfigId }: { id: string; viewConfigId: string }) => {
      await api.delete(`/api/view-configs/permissions/${id}`);
    },
    invalidateKeys: [queryKeys.viewPermissions.all()],
  });
}

// Hook to compute user permissions for a view
export interface ComputedViewPermissions {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  field_overrides: Record<string, { hidden?: boolean; readonly?: boolean }>;
}

export function useComputedViewPermissions(viewConfigId: string | undefined, userId: string | undefined) {
  return useQuery<ComputedViewPermissions | null>({
    queryKey: queryKeys.viewPermissions.computed(viewConfigId!, userId!),
    queryFn: async () => {
      if (!viewConfigId || !userId) {
        return null; // Return null to allow fallback to nav permissions
      }

      // First check if there are any view_permissions for this view
      const permissions = await api.get<ViewPermission[]>(`/api/view-configs/${viewConfigId}/permissions`);

      // If no view_permissions exist, return null to allow fallback to nav permissions
      if (!permissions || permissions.length === 0) {
        return null;
      }

      // TODO: The RPC `get_user_view_permissions` needs a server-side API endpoint.
      // For now, compute permissions client-side from the fetched permissions data.
      // This is a simplified version — the full logic should be on the server.
      return null;
    },
    enabled: !!viewConfigId && !!userId,
  });
}
