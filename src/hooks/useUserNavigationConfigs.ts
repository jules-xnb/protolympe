import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useUserPermissions } from './useUserPermissions';
import type { Tables } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

type NavPermissionRow = Tables<'nav_permissions'>;

/** Shape returned by the navigation_configs query with joined view_configs */
interface NavigationConfigQueryRow {
  id: string;
  label: string;
  display_label: string | null;
  slug: string;
  icon: string | null;
  url: string | null;
  parent_id: string | null;
  display_order: number | null;
  is_active: boolean | null;
  type: string | null;
  view_config_id: string | null;
  client_module_id: string | null;
  view_configs: {
    id: string;
    name: string;
    slug: string;
    type: string;
    bo_definition_id: string | null;
  } | null;
}

export interface UserNavigationConfig {
  id: string;
  label: string;
  display_label: string | null;
  slug: string;
  icon: string | null;
  url: string | null;
  parent_id: string | null;
  display_order: number | null;
  is_active: boolean | null;
  type: string | null;
  view_config_id: string | null;
  client_module_id: string | null;
  view_config?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    bo_definition_id: string | null;
  } | null;
  children?: UserNavigationConfig[];
}

/**
 * Fetch navigation configs for user_final mode with permission filtering.
 * Returns a flat list of visible navigation items.
 */
export function useUserNavigationConfigs() {
  const { mode, selectedClient } = useViewMode();
  const { data: permContext, isLoading: isPermLoading } = useUserPermissions();

  return useQuery<UserNavigationConfig[]>({
    queryKey: queryKeys.navigationConfigs.user(selectedClient?.id, permContext),
    queryFn: async () => {
      if (!selectedClient) return [];

      // Fetch all navigation configs for this client (with view_config details)
      const configs = await api.get<NavigationConfigQueryRow[]>(
        `/api/navigation?client_id=${selectedClient.id}&include_view_configs=true`
      );

      if (!configs?.length) return [];

      const toUserNavConfig = (c: NavigationConfigQueryRow): UserNavigationConfig => ({
        ...c,
        view_config: c.view_configs,
      });

      // If not in user_final mode, return all configs
      if (mode !== 'user_final') {
        return configs.map(toUserNavConfig);
      }

      // In user_final mode, we need permission context to filter
      // If context has no roles/eos defined yet, return all (will be re-queried when context loads)
      if (!permContext || (permContext.roleIds.length === 0 && permContext.eoIds.length === 0)) {
        return configs.map(toUserNavConfig);
      }

      // Fetch nav permissions for all configs
      const configIds = configs.map((c) => c.id);
      const allPerms = await api.get<NavPermissionRow[]>(
        `/api/view-configs/nav-permissions?nav_config_ids=${configIds.join(',')}`
      );

      // Group permissions by config
      const permsByConfig = new Map<string, NavPermissionRow[]>();
      (allPerms || []).forEach((p) => {
        const arr = permsByConfig.get(p.navigation_config_id) || [];
        arr.push(p);
        permsByConfig.set(p.navigation_config_id, arr);
      });

      // Build parent lookup for inheritance
      const configById = new Map<string, NavigationConfigQueryRow>();
      configs.forEach((c) => configById.set(c.id, c));

      // Function to get inherited permissions (walk up the tree)
      const getInheritedPermissions = (configId: string): NavPermissionRow[] => {
        const allInheritedPerms: NavPermissionRow[] = [];
        let currentId: string | null = configId;

        while (currentId) {
          const perms = permsByConfig.get(currentId) || [];
          allInheritedPerms.push(...perms);
          const config = configById.get(currentId);
          currentId = config?.parent_id || null;
        }

        return allInheritedPerms;
      };

      // Function to check if user has access based on permissions (union logic)
      const hasAccess = (configId: string): boolean => {
        const config = configById.get(configId);
        const isView = !!(config?.view_config_id && config?.parent_id);

        const relevantPerms = isView
          ? (permsByConfig.get(configId) || [])
          : getInheritedPermissions(configId);

        if (relevantPerms.length === 0) return false;

        const rolePerms = relevantPerms.filter(p =>
          p.role_id || p.category_id || p.is_visible === false
        );

        const allowRules = rolePerms.filter(p => p.is_visible !== false && (p.role_id || p.category_id));
        const exclusionRules = rolePerms.filter(p => p.is_visible === false && (p.role_id || p.category_id));

        if (allowRules.length === 0) return !isView;

        const excludedRoleIds = new Set<string>();
        for (const rule of exclusionRules) {
          if (rule.role_id) {
            excludedRoleIds.add(rule.role_id);
          }
          if (rule.category_id) {
            for (const r of permContext.roles) {
              if (r.category_id === rule.category_id) {
                excludedRoleIds.add(r.role_id);
              }
            }
          }
        }

        for (const rule of allowRules) {
          if (rule.role_id) {
            if (permContext.roleIds.includes(rule.role_id) && !excludedRoleIds.has(rule.role_id)) {
              return true;
            }
          }
          if (rule.category_id) {
            const hasNonExcludedRole = permContext.roles.some(
              r => r.category_id === rule.category_id && !excludedRoleIds.has(r.role_id)
            );
            if (hasNonExcludedRole) return true;
          }
        }

        return false;
      };

      // Filter configs based on permissions
      const visibleConfigs = configs.filter((config) => hasAccess(config.id));

      return visibleConfigs.map(toUserNavConfig);
    },
    // In user_final mode, wait for permissions to load before executing the query
    enabled: !!selectedClient && (mode !== 'user_final' || !isPermLoading),
  });
}

/**
 * Build a navigation tree from flat configs.
 */
export function buildUserNavigationTree(items: UserNavigationConfig[]): UserNavigationConfig[] {
  const itemMap = new Map<string, UserNavigationConfig>();
  const rootItems: UserNavigationConfig[] = [];

  // First pass: create map
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  // Second pass: build tree
  items.forEach(item => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      rootItems.push(node);
    }
  });

  // Sort by display_order
  const sortByOrder = (a: UserNavigationConfig, b: UserNavigationConfig) =>
    (a.display_order || 0) - (b.display_order || 0);

  const sortTree = (nodes: UserNavigationConfig[]): UserNavigationConfig[] => {
    return nodes.sort(sortByOrder).map(node => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }));
  };

  return sortTree(rootItems);
}
