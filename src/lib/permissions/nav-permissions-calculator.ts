import type { NavPermissionStatus } from '@/hooks/useAllNavPermissions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavConfigInfo {
  id: string;
  parent_id: string | null;
  view_config_id: string | null;
}

export interface PermissionRecord {
  navigation_config_id: string;
  role_id: string | null;
  category_id: string | null;
  is_visible: boolean | null;
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Build lookup maps from raw permission rows:
 * - directStatusMap: each config's direct (non-inherited) permission status
 * - grantedCategoriesByConfig: categories granted at each config level
 * - permissionsByConfig: raw permission records grouped by config id
 */
export function buildPermissionMaps(
  navConfigs: NavConfigInfo[],
  permissions: PermissionRecord[],
): {
  directStatusMap: Map<string, NavPermissionStatus>;
  grantedCategoriesByConfig: Map<string, string[]>;
  permissionsByConfig: Map<string, PermissionRecord[]>;
} {
  const navConfigIds = navConfigs.map(n => n.id);

  // Group permissions by navigation_config_id
  const permissionsByConfig = new Map<string, PermissionRecord[]>();
  navConfigIds.forEach(id => permissionsByConfig.set(id, []));
  permissions.forEach(p => {
    const list = permissionsByConfig.get(p.navigation_config_id) || [];
    list.push(p);
    permissionsByConfig.set(p.navigation_config_id, list);
  });

  // Build direct status map + granted categories
  const directStatusMap = new Map<string, NavPermissionStatus>();
  const grantedCategoriesByConfig = new Map<string, string[]>();

  navConfigIds.forEach(id => {
    directStatusMap.set(id, {
      hasRolePermission: false,
      isComplete: false,
      isInherited: false,
    });
    grantedCategoriesByConfig.set(id, []);
  });

  // Only count visible permissions (not exclusions)
  permissions.forEach(p => {
    if (p.is_visible === false) return;

    const current = directStatusMap.get(p.navigation_config_id);
    if (current) {
      if (p.role_id || p.category_id) {
        current.hasRolePermission = true;
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

  return { directStatusMap, grantedCategoriesByConfig, permissionsByConfig };
}

/**
 * Build a map of category_id -> role_ids from a list of roles.
 */
export function buildRolesByCategory(
  roles: { id: string; category_id: string | null }[],
): Map<string, string[]> {
  const rolesByCategory = new Map<string, string[]>();
  roles.forEach(role => {
    if (role.category_id) {
      const list = rolesByCategory.get(role.category_id) || [];
      list.push(role.id);
      rolesByCategory.set(role.category_id, list);
    }
  });
  return rolesByCategory;
}

/**
 * Compute the final permission status for each nav config.
 * Root items and views use direct permissions only.
 */
export function computeFinalPermissionStatuses(
  navConfigs: NavConfigInfo[],
  directStatusMap: Map<string, NavPermissionStatus>,
): Map<string, NavPermissionStatus> {
  const finalStatusMap = new Map<string, NavPermissionStatus>();

  navConfigs.forEach(n => {
    const directStatus = directStatusMap.get(n.id)!;
    // All items use direct permissions: roots, views, and subgroups
    finalStatusMap.set(n.id, directStatus);
  });

  return finalStatusMap;
}
