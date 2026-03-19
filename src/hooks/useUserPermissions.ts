import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';

interface NavPermissionRow {
  id: string;
  navigation_config_id: string;
  role_id: string | null;
  category_id: string | null;
  is_visible: boolean | null;
}

/** Shape of a navigation config item passed to useFilteredNavigationConfigs */
interface NavigationConfigItem {
  id: string;
  parent_id: string | null;
  is_active: boolean | null;
  [key: string]: unknown;
}

export interface UserRoleInfo {
  role_id: string;
  role_name: string;
  role_color: string | null;
  category_id: string | null;
  category_name: string | null;
  eo_id: string | null;
  eo_name: string | null;
  eo_code: string | null;
}

export interface UserPermissionContext {
  roleIds: string[];
  categoryIds: string[];
  eoIds: string[];
  eoPaths: string[];
  roles: UserRoleInfo[];
}

interface ModuleRoleRow {
  id: string;
  name: string;
  color: string | null;
  module_slug: string;
}

interface EoRow {
  id: string;
  name: string;
  code: string;
  path: string;
}

/**
 * Hook to get the effective permission context for the current simulated user.
 * In user_final mode, this uses the simulation config; in other modes, it uses the real user.
 */
export function useUserPermissions() {
  const { mode, activeProfile, selectedClient } = useViewMode();

  return useQuery<UserPermissionContext>({
    queryKey: queryKeys.userPermissions.context(mode, activeProfile, selectedClient?.id),
    queryFn: async () => {
      // Default empty context
      const emptyContext: UserPermissionContext = {
        roleIds: [],
        categoryIds: [],
        eoIds: [],
        eoPaths: [],
        roles: [],
      };

      if (mode !== 'user_final' || !activeProfile || !selectedClient) {
        return emptyContext;
      }

      // activeProfile.eoIds is already fully resolved at activation time
      const allRoleIds = activeProfile.roleIds;
      const allEoIds = activeProfile.eoIds;

      if (allRoleIds.length === 0 && allEoIds.length === 0) {
        return emptyContext;
      }

      // Fetch module roles for client, then filter to assigned ones
      const rolesPromise = allRoleIds.length > 0
        ? api.get<ModuleRoleRow[]>(`/api/module-roles/by-client?client_id=${selectedClient.id}`).then(
            allRoles => allRoles.filter(r => allRoleIds.includes(r.id))
          )
        : Promise.resolve([]);

      // Fetch EO information
      const eosPromise = allEoIds.length > 0
        ? api.get<EoRow[]>(`/api/organizational-entities?client_id=${selectedClient.id}`).then(
            allEos => allEos.filter(e => allEoIds.includes(e.id))
          )
        : Promise.resolve([]);

      const [roles, eos] = await Promise.all([rolesPromise, eosPromise]);

      // Build the permission context
      const categoryIds: string[] = [];
      const eoPaths = eos.map(e => e.path);

      // Build role info array
      const roleInfos: UserRoleInfo[] = roles.map(role => ({
        role_id: role.id,
        role_name: role.name,
        role_color: role.color,
        category_id: null,
        category_name: null,
        eo_id: null,
        eo_name: null,
        eo_code: null,
      }));

      return {
        roleIds: allRoleIds,
        categoryIds,
        eoIds: allEoIds,
        eoPaths,
        roles: roleInfos,
      };
    },
    enabled: mode === 'user_final' && !!activeProfile,
  });
}

/**
 * Hook to check if a navigation item is visible for the current user.
 * Uses nav_permissions to determine visibility.
 */
export function useNavItemVisibility(navigationConfigId: string | undefined) {
  const { data: context } = useUserPermissions();

  return useQuery<boolean>({
    queryKey: queryKeys.userPermissions.navItemVisibility(navigationConfigId!, context),
    queryFn: async () => {
      if (!navigationConfigId || !context) return true;

      // If no permissions context (not in user_final mode or not configured), show all
      if (context.roleIds.length === 0 && context.eoIds.length === 0) {
        return true;
      }

      // Fetch nav permissions for this item
      const permissions = await api.get<NavPermissionRow[]>(
        `/api/view-configs/nav-permissions?nav_config_id=${navigationConfigId}`
      );

      if (!permissions || permissions.length === 0) {
        // No restrictions = visible to all
        return true;
      }

      // Union logic: collect exclusions, then check if at least one non-excluded role is allowed
      const allowRules = permissions.filter((p) => p.is_visible !== false && (p.role_id || p.category_id));
      const exclusionRules = permissions.filter((p) => p.is_visible === false && (p.role_id || p.category_id));

      // If no allow rules but exclusions exist, access is open (exclusion-only config)
      if (allowRules.length === 0) {
        const hasRoleRestrictions = permissions.some((p) => p.role_id || p.category_id);
        return !hasRoleRestrictions;
      }

      // Collect excluded role IDs
      const excludedRoleIds = new Set<string>();
      for (const rule of exclusionRules) {
        if (rule.role_id) excludedRoleIds.add(rule.role_id);
        if (rule.category_id) {
          for (const r of context.roles) {
            if (r.category_id === rule.category_id) excludedRoleIds.add(r.role_id);
          }
        }
      }

      // Check if at least one user role matches an allow rule AND is not excluded
      for (const rule of allowRules) {
        if (rule.role_id && context.roleIds.includes(rule.role_id) && !excludedRoleIds.has(rule.role_id)) {
          return true;
        }
        if (rule.category_id) {
          const hasNonExcluded = context.roles.some(
            r => r.category_id === rule.category_id && !excludedRoleIds.has(r.role_id)
          );
          if (hasNonExcluded) return true;
        }
      }

      return false;
    },
    enabled: !!navigationConfigId,
  });
}

/**
 * Hook to filter navigation configs based on user permissions.
 * Returns only visible items for the current user.
 */
export function useFilteredNavigationConfigs(
  items: NavigationConfigItem[]
) {
  const { mode } = useViewMode();
  const { data: context } = useUserPermissions();

  return useQuery({
    queryKey: queryKeys.userPermissions.filteredNavConfigs(items.map(i => i.id), context, mode),
    queryFn: async () => {
      // In non-user_final mode, return all active items
      if (mode !== 'user_final') {
        return items.filter(i => i.is_active !== false);
      }

      // If no context, return all active items
      if (!context || (context.roleIds.length === 0 && context.eoIds.length === 0)) {
        return items.filter(i => i.is_active !== false);
      }

      // Fetch all nav permissions for these items
      const itemIds = items.map(i => i.id);
      const allPermissions = await api.get<NavPermissionRow[]>(
        `/api/view-configs/nav-permissions?nav_config_ids=${itemIds.join(',')}`
      );

      // Group permissions by nav item
      const permsByItem = new Map<string, NavPermissionRow[]>();
      (allPermissions || []).forEach((perm) => {
        const existing = permsByItem.get(perm.navigation_config_id) || [];
        existing.push(perm);
        permsByItem.set(perm.navigation_config_id, existing);
      });

      // Filter items based on permissions
      return items.filter(item => {
        if (item.is_active === false) return false;

        const permissions = permsByItem.get(item.id);

        // No permissions = visible to all
        if (!permissions || permissions.length === 0) {
          return true;
        }

        // Union logic: collect exclusions, then check non-excluded allow matches
        const allowRules = permissions.filter((p) => p.is_visible !== false && (p.role_id || p.category_id));
        const exclusionRules = permissions.filter((p) => p.is_visible === false && (p.role_id || p.category_id));

        if (allowRules.length === 0) {
          const hasRoleRestrictions = permissions.some((p) => p.role_id || p.category_id);
          return !hasRoleRestrictions;
        }

        const excludedRoleIds = new Set<string>();
        for (const rule of exclusionRules) {
          if (rule.role_id) excludedRoleIds.add(rule.role_id);
          if (rule.category_id) {
            for (const r of context.roles) {
              if (r.category_id === rule.category_id) excludedRoleIds.add(r.role_id);
            }
          }
        }

        for (const rule of allowRules) {
          if (rule.role_id && context.roleIds.includes(rule.role_id) && !excludedRoleIds.has(rule.role_id)) {
            return true;
          }
          if (rule.category_id) {
            const hasNonExcluded = context.roles.some(
              r => r.category_id === rule.category_id && !excludedRoleIds.has(r.role_id)
            );
            if (hasNonExcluded) return true;
          }
        }

        return false;
      });
    },
    enabled: items.length > 0,
  });
}
