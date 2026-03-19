import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export type NavPermission = Tables<'nav_permissions'>;

export interface NavPermissionWithRelations extends NavPermission {
  role?: { id: string; name: string; color: string | null } | null;
  category?: { id: string; name: string } | null;
}

export function useNavPermissions(navigationConfigId: string | undefined) {
  return useQuery<NavPermissionWithRelations[]>({
    queryKey: queryKeys.navPermissions.byConfig(navigationConfigId!),
    queryFn: async () => {
      if (!navigationConfigId) return [];

      const data = await api.get<NavPermissionWithRelations[]>(`/api/view-configs/nav-permissions?nav_config_id=${navigationConfigId}`);
      return data ?? [];
    },
    enabled: !!navigationConfigId,
  });
}

/**
 * Returns a callback to cascade-delete nav_permissions for given roles
 * from a set of child navigation configs. Useful when unchecking a role
 * on a parent module that should also remove it from child views.
 */
export function useCascadeDeleteNavPermissions() {
  const queryClient = useQueryClient();

  const cascadeRemoveRoles = async (
    childNavConfigIds: string[],
    roleIds: string[],
    roles: Array<{ id: string; category_id: string | null }>,
  ) => {
    if (childNavConfigIds.length === 0 || roleIds.length === 0) return;

    // Batch delete: remove nav_permissions for these roles on all child views
    for (const configId of childNavConfigIds) {
      const perms = await api.get<NavPermission[]>(`/api/view-configs/nav-permissions?nav_config_id=${configId}`);
      for (const perm of perms || []) {
        if (perm.role_id && roleIds.includes(perm.role_id)) {
          await api.delete(`/api/view-configs/nav-permissions/${perm.id}`);
        }
      }
    }

    // Also remove category-level grants on children that covered these roles
    const categoryIds = [...new Set(
      roleIds
        .map(rid => roles.find(r => r.id === rid)?.category_id)
        .filter(Boolean) as string[]
    )];
    if (categoryIds.length > 0) {
      for (const configId of childNavConfigIds) {
        const perms = await api.get<NavPermission[]>(`/api/view-configs/nav-permissions?nav_config_id=${configId}`);
        for (const perm of perms || []) {
          if (perm.category_id && categoryIds.includes(perm.category_id)) {
            await api.delete(`/api/view-configs/nav-permissions/${perm.id}`);
          }
        }
      }
    }

    // Invalidate all permission caches (including the global map for warning icons)
    queryClient.invalidateQueries({ queryKey: queryKeys.navPermissions.all() });
    for (const childId of childNavConfigIds) {
      queryClient.invalidateQueries({ queryKey: queryKeys.navPermissions.byConfig(childId) });
    }
  };

  return cascadeRemoveRoles;
}

export function useCreateNavPermission() {
  return useMutationWithToast({
    mutationFn: async (data: TablesInsert<'nav_permissions'>) => {
      const result = await api.post<NavPermission>('/api/view-configs/nav-permissions', data);
      return result;
    },
    invalidateKeys: [queryKeys.navPermissions.byConfig(""), queryKeys.navPermissions.all(), queryKeys.roleUsages.all()],
  });
}

export function useUpdateNavPermission() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: TablesUpdate<'nav_permissions'> & { id: string; navigation_config_id: string }) => {
      // Delete and recreate since no PATCH endpoint for nav-permissions
      await api.delete(`/api/view-configs/nav-permissions/${id}`);
      const result = await api.post<NavPermission>('/api/view-configs/nav-permissions', {
        ...data,
        navigation_config_id: data.navigation_config_id,
      });
      return result;
    },
    invalidateKeys: [queryKeys.navPermissions.byConfig(""), queryKeys.navPermissions.all(), queryKeys.roleUsages.all()],
  });
}

export function useDuplicateNavPermissions() {
  return useMutationWithToast({
    mutationFn: async ({ sourceRoleId, targetRoleId }: { sourceRoleId: string; targetRoleId: string }) => {
      // Fetch all nav_permissions for source role across all configs
      // TODO: This needs a server-side endpoint to fetch by role_id, or we need to fetch all and filter
      // For now, use a search endpoint or iterate through known configs
      const allPerms = await api.get<NavPermission[]>(`/api/view-configs/nav-permissions?role_id=${sourceRoleId}`);
      if (!allPerms?.length) return;

      for (const p of allPerms) {
        await api.post('/api/view-configs/nav-permissions', {
          navigation_config_id: p.navigation_config_id,
          role_id: targetRoleId,
          is_visible: p.is_visible,
        });
      }
    },
    invalidateKeys: [queryKeys.navPermissions.all()],
  });
}

export type NavPermRoleInfo = { name: string; color: string | null };
export type NavPermRoleNamesMap = Map<string, NavPermRoleInfo[]>;

export function useNavPermissionRoleNames(clientId: string | undefined) {
  return useQuery<NavPermRoleNamesMap>({
    queryKey: queryKeys.navPermissions.roleNames(clientId),
    queryFn: async () => {
      if (!clientId) return new Map();

      // Fetch navigation configs for this client
      const navConfigs = await api.get<Array<{ id: string }>>(`/api/navigation-configs?client_id=${clientId}&fields=id`);
      if (!navConfigs?.length) return new Map();

      const configIds = navConfigs.map(n => n.id);

      // Fetch all permissions
      const perms = await api.get<Array<{
        navigation_config_id: string;
        role_id: string | null;
        category_id: string | null;
        is_visible: boolean | null;
      }>>(`/api/view-configs/nav-permissions?nav_config_ids=${configIds.join(',')}`);

      // Fetch all active roles for this client
      const allRoles = await api.get<Array<{
        id: string;
        name: string;
        color: string | null;
        category_id: string | null;
      }>>(`/api/roles?client_id=${clientId}&is_active=true`);

      const allRolesList = allRoles || [];
      const roleInfoById = new Map(allRolesList.map(r => [r.id, { name: r.name, color: r.color as string | null }]));

      const result: NavPermRoleNamesMap = new Map();
      const permsByConfig = new Map<string, typeof perms>();
      (perms || []).forEach(p => {
        const arr = permsByConfig.get(p.navigation_config_id) || [];
        arr.push(p);
        permsByConfig.set(p.navigation_config_id, arr);
      });

      for (const [configId, configPerms] of permsByConfig) {
        if (!configPerms) continue;
        const effectiveRoleIds = new Set<string>();
        const excludedRoleIds = new Set<string>();

        configPerms.forEach(p => {
          if (p.role_id && p.is_visible === false) excludedRoleIds.add(p.role_id);
        });

        configPerms
          .filter(p => p.role_id && p.is_visible !== false)
          .forEach(p => effectiveRoleIds.add(p.role_id!));

        const grantedCategoryIds = configPerms
          .filter(p => p.category_id && !p.role_id && p.is_visible !== false)
          .map(p => p.category_id!);

        if (grantedCategoryIds.length > 0) {
          allRolesList
            .filter(r => r.category_id && grantedCategoryIds.includes(r.category_id) && !excludedRoleIds.has(r.id))
            .forEach(r => effectiveRoleIds.add(r.id));
        }

        const infos = [...effectiveRoleIds]
          .map(id => roleInfoById.get(id))
          .filter((r): r is NavPermRoleInfo => !!r);
        if (infos.length > 0) result.set(configId, infos);
      }

      return result;
    },
    enabled: !!clientId,
  });
}

export function useDeleteNavPermission() {
  return useMutationWithToast({
    mutationFn: async ({ id, navigationConfigId: _navigationConfigId }: { id: string; navigationConfigId: string }) => {
      await api.delete(`/api/view-configs/nav-permissions/${id}`);
    },
    invalidateKeys: [queryKeys.navPermissions.byConfig(""), queryKeys.navPermissions.all(), queryKeys.roleUsages.all()],
  });
}
