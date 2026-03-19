import type { BlockType } from '@/types/builder-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleUsageItem {
  id: string;
  moduleName: string;
  moduleId: string;
  viewName: string;
  viewConfigId: string;
  navConfigId: string;
  blockIndex: number;
  blockType: BlockType;
  blockConfig: Record<string, unknown>;
  blockTitle: string | null;
  hasAccess: boolean;
  sharedRoleCount: number;
}

export interface NavConfigRow {
  id: string;
  parent_id: string | null;
  label: string;
  view_config_id: string | null;
  is_active: boolean;
}

export interface NavPermRow {
  navigation_config_id: string;
  role_id: string | null;
  category_id: string | null;
  is_visible: boolean | null;
}

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Build a lookup that walks up the nav tree to find the root module.
 */
export function buildNavModuleLookup(
  navConfigs: NavConfigRow[],
): (configId: string) => { id: string; label: string } {
  const navById = new Map<string, NavConfigRow>();
  navConfigs.forEach(n => navById.set(n.id, n));

  return (configId: string) => {
    let current = navById.get(configId);
    while (current?.parent_id) {
      const parent = navById.get(current.parent_id);
      if (!parent) break;
      current = parent;
    }
    return current
      ? { id: current.id, label: current.label }
      : { id: configId, label: '' };
  };
}

/**
 * Build a function that checks whether a specific role has access to a nav config,
 * using direct permissions only (no inheritance).
 */
export function buildRoleAccessChecker(
  allPerms: NavPermRow[],
  navConfigs: NavConfigRow[],
  roleId: string,
  roleCategoryId: string | null,
): (configId: string) => boolean {
  const navById = new Map<string, NavConfigRow>();
  navConfigs.forEach(n => navById.set(n.id, n));

  const permsByNav = new Map<string, NavPermRow[]>();
  allPerms.forEach(p => {
    const list = permsByNav.get(p.navigation_config_id) || [];
    list.push(p);
    permsByNav.set(p.navigation_config_id, list);
  });

  return (configId: string): boolean => {
    const directPerms = permsByNav.get(configId) || [];
    const nav = navById.get(configId);
    const isView = !!(nav?.view_config_id && nav?.parent_id);

    if (directPerms.length === 0) {
      return isView ? false : true;
    }

    const allowRules = directPerms.filter(
      p => p.is_visible !== false && (p.role_id || p.category_id),
    );
    const exclusionRules = directPerms.filter(
      p => p.is_visible === false && (p.role_id || p.category_id),
    );

    if (allowRules.length === 0) return !isView;

    const isExcluded = exclusionRules.some(
      r =>
        (r.role_id && r.role_id === roleId) ||
        (r.category_id && r.category_id === roleCategoryId),
    );
    if (isExcluded) return false;

    return allowRules.some(
      r =>
        (r.role_id && r.role_id === roleId) ||
        (r.category_id && roleCategoryId && r.category_id === roleCategoryId),
    );
  };
}

/**
 * Build a function that returns the set of role IDs with access to a given nav config.
 */
export function buildRolesWithAccessGetter(
  allPerms: NavPermRow[],
  navConfigs: NavConfigRow[],
  allRoles: { id: string; category_id: string | null }[],
): (configId: string) => Set<string> {
  const navById = new Map<string, NavConfigRow>();
  navConfigs.forEach(n => navById.set(n.id, n));

  const permsByNav = new Map<string, NavPermRow[]>();
  allPerms.forEach(p => {
    const list = permsByNav.get(p.navigation_config_id) || [];
    list.push(p);
    permsByNav.set(p.navigation_config_id, list);
  });

  const roleIdsByCategory = new Map<string, string[]>();
  for (const r of allRoles) {
    if (r.category_id) {
      const list = roleIdsByCategory.get(r.category_id) || [];
      list.push(r.id);
      roleIdsByCategory.set(r.category_id, list);
    }
  }

  return (configId: string): Set<string> => {
    const directPerms = permsByNav.get(configId) || [];
    const nav = navById.get(configId);
    const isView = !!(nav?.view_config_id && nav?.parent_id);

    if (directPerms.length === 0) {
      if (isView) return new Set<string>();
      return new Set(allRoles.map(r => r.id));
    }

    const allowRules = directPerms.filter(
      p => p.is_visible !== false && (p.role_id || p.category_id),
    );
    const exclusionRules = directPerms.filter(
      p => p.is_visible === false && (p.role_id || p.category_id),
    );

    const accessRoleIds = new Set<string>();

    if (allowRules.length === 0 && !isView) {
      for (const r of allRoles) accessRoleIds.add(r.id);
    } else if (allowRules.length > 0) {
      for (const p of allowRules) {
        if (p.role_id) accessRoleIds.add(p.role_id);
        if (p.category_id) {
          const catRoles = roleIdsByCategory.get(p.category_id) || [];
          for (const rid of catRoles) accessRoleIds.add(rid);
        }
      }
    }

    for (const p of exclusionRules) {
      if (p.role_id) accessRoleIds.delete(p.role_id);
      if (p.category_id) {
        const catRoles = roleIdsByCategory.get(p.category_id) || [];
        for (const rid of catRoles) accessRoleIds.delete(rid);
      }
    }

    return accessRoleIds;
  };
}

/**
 * Build the flat list of RoleUsageItem from nav configs, view configs, and access checkers.
 */
export function buildRoleUsageItems(
  navConfigs: NavConfigRow[],
  viewConfigsMap: Map<string, { id: string; name: string; config: Record<string, unknown> }>,
  getModule: (configId: string) => { id: string; label: string },
  roleHasAccess: (configId: string) => boolean,
  rolesByViewConfig: Map<string, Set<string>>,
): RoleUsageItem[] {
  const items: RoleUsageItem[] = [];

  for (const nav of navConfigs) {
    if (!nav.view_config_id) continue;

    const vc = viewConfigsMap.get(nav.view_config_id);
    if (!vc) continue;

    const config = vc.config as Record<string, unknown>;
    const blocks = (config?.blocks as Array<Record<string, unknown>>) ?? [];
    if (blocks.length === 0) continue;

    const module = getModule(nav.id);
    const hasAccess = roleHasAccess(nav.id);

    blocks.forEach((block, idx) => {
      const type = block.type as string;
      if (
        type !== 'data_table' &&
        type !== 'eo_card' &&
        type !== 'survey_creator' &&
        type !== 'survey_responses'
      ) {
        return;
      }

      items.push({
        id: `${nav.id}__${idx}`,
        moduleName: module.label,
        moduleId: module.id,
        viewName: nav.label,
        viewConfigId: vc.id,
        navConfigId: nav.id,
        blockIndex: idx,
        blockType: type as BlockType,
        blockConfig: (block.config as Record<string, unknown>) ?? {},
        blockTitle: (block.title as string) ?? null,
        hasAccess,
        sharedRoleCount: rolesByViewConfig.get(nav.view_config_id!)?.size ?? 0,
      });
    });
  }

  items.sort((a, b) => {
    const mod = a.moduleName.localeCompare(b.moduleName);
    if (mod !== 0) return mod;
    return a.viewName.localeCompare(b.viewName);
  });

  return items;
}
