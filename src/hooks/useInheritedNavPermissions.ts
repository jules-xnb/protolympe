import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { NavPermissionWithRelations } from './useNavPermissions';
import type { NavigationConfigWithRelations } from './useNavigationConfigs';
import { queryKeys } from '@/lib/query-keys';

export interface InheritedPermission extends NavPermissionWithRelations {
  inheritedFrom: string;
  inheritedFromId: string;
  inheritedLevel: number; // 1 = parent, 2 = grandparent, etc.
}

/**
 * Fetches permissions from all ancestors in the parent chain.
 * Permissions are collected from all ancestors, with the closest ancestor first.
 *
 * For "visible" permissions (is_visible=true), we take them from any ancestor.
 * For "exclusions" (is_visible=false), they only make sense if there's a corresponding
 * visible permission to exclude from.
 */
export function useInheritedNavPermissions(parentChain: NavigationConfigWithRelations[]) {
  // Fetch permissions for each parent in the chain
  const permissionQueries = useQueries({
    queries: parentChain.map((parent, index) => ({
      queryKey: queryKeys.navPermissions.byConfig(parent.id),
      queryFn: async () => {
        const permissions = await api.get<NavPermissionWithRelations[]>(`/api/view-configs/nav-permissions?nav_config_id=${parent.id}`);

        if (!permissions || permissions.length === 0) return { permissions: [], parent, level: index + 1 };

        return { permissions, parent, level: index + 1 };
      },
      enabled: !!parent.id,
    })),
  });

  const isLoading = permissionQueries.some(q => q.isLoading);

  // Combine all inherited permissions from ancestors
  const inheritedPermissions = useMemo(() => {
    const result: InheritedPermission[] = [];

    permissionQueries.forEach(query => {
      if (query.data && query.data.permissions) {
        const { permissions, parent, level } = query.data;
        permissions.forEach(perm => {
          result.push({
            ...perm,
            inheritedFrom: parent.label,
            inheritedFromId: parent.id,
            inheritedLevel: level,
          });
        });
      }
    });

    return result;
  }, [permissionQueries]);

  // Separate visible permissions from exclusions
  const visiblePermissions = useMemo(() => {
    return inheritedPermissions.filter(p => p.is_visible !== false);
  }, [inheritedPermissions]);

  const exclusionPermissions = useMemo(() => {
    return inheritedPermissions.filter(p => p.is_visible === false);
  }, [inheritedPermissions]);

  return {
    inheritedPermissions,
    visiblePermissions,
    exclusionPermissions,
    isLoading,
  };
}
