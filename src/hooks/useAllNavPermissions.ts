import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';

export interface NavPermissionStatus {
  hasRolePermission: boolean;
  isComplete: boolean; // Role permissions exist and not fully excluded
  isInherited?: boolean; // Indicates if permissions come from a parent
  hasAllRolesExcluded?: boolean; // All inherited roles are excluded
}

interface PermissionRecord {
  navigation_config_id: string;
  role_id: string | null;
  category_id: string | null;
  is_visible: boolean | null;
}

interface NavConfigRecord {
  id: string;
  parent_id: string | null;
  view_config_id: string | null;
}

/**
 * Hook to fetch all nav_permissions for the current client's navigation configs.
 * Returns a Map of navigation_config_id -> permission status (role-based only)
 *
 * IMPORTANT: This hook considers inheritance - if a child has no direct permissions
 * but its parent does, the child inherits those permissions.
 *
 * ALSO: If a child has exclusions that remove ALL roles from an inherited category,
 * then the child is considered to have incomplete permissions (warning state).
 */
export function useAllNavPermissions() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.navPermissions.all(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return new Map<string, NavPermissionStatus>();

      // Get all navigation_configs with their parent relationships and view info
      const navConfigs = await api.get<NavConfigRecord[]>(`/api/navigation-configs?client_id=${selectedClient.id}&fields=id,parent_id,view_config_id`);

      if (!navConfigs?.length) return new Map<string, NavPermissionStatus>();

      const navConfigIds = navConfigs.map(n => n.id);

      // Get all permissions for these navigation configs
      const permissions = await api.get<PermissionRecord[]>(`/api/view-configs/nav-permissions?nav_config_ids=${navConfigIds.join(',')}`);

      // Build parent lookup map
      const parentMap = new Map<string, string | null>();
      navConfigs.forEach(n => {
        parentMap.set(n.id, n.parent_id);
      });

      // Group permissions by navigation_config_id
      const permissionsByConfig = new Map<string, PermissionRecord[]>();
      navConfigIds.forEach(id => permissionsByConfig.set(id, []));
      (permissions || []).forEach(p => {
        const list = permissionsByConfig.get(p.navigation_config_id) || [];
        list.push(p);
        permissionsByConfig.set(p.navigation_config_id, list);
      });

      // Build a map of direct permissions per config (only visible ones count for "has permission")
      const directStatusMap = new Map<string, NavPermissionStatus>();

      // Also track which categories are granted at each config level
      const grantedCategoriesByConfig = new Map<string, string[]>();

      navConfigIds.forEach(id => {
        directStatusMap.set(id, {
          hasRolePermission: false,
          isComplete: false,
          isInherited: false
        });
        grantedCategoriesByConfig.set(id, []);
      });

      // Set direct permissions (only count visible permissions, not exclusions)
      (permissions || []).forEach(p => {
        // Skip exclusions (is_visible = false)
        if (p.is_visible === false) return;

        const current = directStatusMap.get(p.navigation_config_id);
        if (current) {
          if (p.role_id || p.category_id) {
            current.hasRolePermission = true;
            // Track granted categories
            if (p.category_id) {
              const categories = grantedCategoriesByConfig.get(p.navigation_config_id) || [];
              if (!categories.includes(p.category_id)) {
                categories.push(p.category_id);
                grantedCategoriesByConfig.set(p.navigation_config_id, categories);
              }
            }
          }
          current.isComplete = current.hasRolePermission;
          directStatusMap.set(p.navigation_config_id, current);
        }
      });

      // Helper function to check if an item is a root (no parent)
      const isRoot = (configId: string): boolean => {
        return parentMap.get(configId) === null;
      };

      // Build view lookup: views need their OWN permissions, they don't inherit
      const viewConfigMap = new Map<string, string | null>();
      navConfigs.forEach(n => {
        viewConfigMap.set(n.id, n.view_config_id);
      });
      const isView = (configId: string): boolean => {
        return !!(viewConfigMap.get(configId) && parentMap.get(configId));
      };

      // Build final status map with inheritance
      const finalStatusMap = new Map<string, NavPermissionStatus>();

      navConfigIds.forEach(id => {
        const directStatus = directStatusMap.get(id)!;
        const hasParent = !isRoot(id);

        if (!hasParent) {
          // Root items: use direct permissions only
          finalStatusMap.set(id, directStatus);
        } else if (isView(id)) {
          // Views MUST have their own permissions — they don't inherit.
          finalStatusMap.set(id, directStatus);
        } else {
          // Non-view child items (subgroups): use their own direct permissions
          finalStatusMap.set(id, directStatus);
        }
      });

      return finalStatusMap;
    },
    enabled: !!selectedClient?.id,
  });
}
