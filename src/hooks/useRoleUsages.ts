import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import type { BlockType } from '@/components/builder/page-builder/types';
import { queryKeys } from '@/lib/query-keys';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface RoleUsageItem {
  id: string;                          // unique key (navConfigId + blockIndex)
  moduleName: string;                  // nom du module parent
  moduleId: string;                    // navigation_config parent id
  viewName: string;                    // nom de l'element de navigation
  viewConfigId: string;                // view_configs.id
  navConfigId: string;                 // navigation_configs.id
  blockIndex: number;                  // index du bloc dans config.blocks[]
  blockType: BlockType;                // 'eo_card' | 'data_table' | 'survey_creator' | 'survey_responses'
  blockConfig: Record<string, unknown>;    // config du bloc (mutable)
  blockTitle: string | null;           // titre custom du bloc
  hasAccess: boolean;                  // le role a-t-il acces via nav_permissions ?
  sharedRoleCount: number;             // nombre de rôles distincts ayant accès à ce nav config
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface NavConfigRow {
  id: string;
  parent_id: string | null;
  label: string;
  view_config_id: string | null;
  is_active: boolean;
}

interface NavPermRow {
  navigation_config_id: string;
  role_id: string | null;
  category_id: string | null;
  is_visible: boolean | null;
}

interface ViewConfigRow {
  id: string;
  name: string;
  config: unknown;
}

interface RoleRow {
  id: string;
  category_id: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRoleUsages(roleId: string | null) {
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id ?? null;

  return useQuery({
    queryKey: queryKeys.roleUsages.byRole(roleId!, clientId!),
    queryFn: async (): Promise<RoleUsageItem[]> => {
      if (!roleId || !clientId) return [];

      // ------------------------------------------------------------------
      // 1. Fetch all active navigation_configs for this client
      // ------------------------------------------------------------------
      const navConfigs = await api.get<NavConfigRow[]>(
        `/api/navigation?client_id=${clientId}`
      );

      if (!navConfigs?.length) return [];

      // Filter to active only
      const activeNavConfigs = navConfigs.filter(n => n.is_active);
      if (activeNavConfigs.length === 0) return [];

      // ------------------------------------------------------------------
      // 2. Build parent lookup (navConfigId -> module label)
      // ------------------------------------------------------------------
      const navById = new Map<string, NavConfigRow>();
      activeNavConfigs.forEach(n => navById.set(n.id, n));

      const getModule = (configId: string): { id: string; label: string } => {
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

      // ------------------------------------------------------------------
      // 3. Fetch view_configs for nav items that have a view_config_id
      // ------------------------------------------------------------------
      const viewConfigIds = [
        ...new Set(
          activeNavConfigs
            .filter(n => n.view_config_id)
            .map(n => n.view_config_id as string),
        ),
      ];

      const viewConfigsMap = new Map<string, ViewConfigRow>();

      if (viewConfigIds.length > 0) {
        // Fetch all view configs for this client and filter
        const allViewConfigs = await api.get<ViewConfigRow[]>(
          `/api/view-configs?client_id=${clientId}`
        );
        allViewConfigs?.forEach(vc => {
          if (viewConfigIds.includes(vc.id)) {
            viewConfigsMap.set(vc.id, vc);
          }
        });
      }

      // ------------------------------------------------------------------
      // 4. Fetch nav_permissions for the role
      // ------------------------------------------------------------------
      const navConfigIds = activeNavConfigs.map(n => n.id);

      const [allPerms, roleData, allRoles] = await Promise.all([
        api.get<NavPermRow[]>(
          `/api/view-configs/nav-permissions?nav_config_ids=${navConfigIds.join(',')}`
        ),
        api.get<RoleRow[]>(`/api/roles?client_id=${clientId}`).then(
          roles => roles.find(r => r.id === roleId) || null
        ),
        api.get<RoleRow[]>(`/api/roles?client_id=${clientId}`),
      ]);

      const roleCategoryId: string | null = roleData?.category_id ?? null;

      // Build category -> role ids mapping
      const roleIdsByCategory = new Map<string, string[]>();
      for (const r of allRoles) {
        if (r.category_id) {
          const list = roleIdsByCategory.get(r.category_id) || [];
          list.push(r.id);
          roleIdsByCategory.set(r.category_id, list);
        }
      }

      // Group permissions by navigation_config_id
      const permsByNav = new Map<string, NavPermRow[]>();
      (allPerms || []).forEach(p => {
        const list = permsByNav.get(p.navigation_config_id) || [];
        list.push(p);
        permsByNav.set(p.navigation_config_id, list);
      });

      // ------------------------------------------------------------------
      // 5. Determine access using direct permissions only (no inheritance)
      // ------------------------------------------------------------------
      const roleHasAccess = (configId: string): boolean => {
        const directPerms = permsByNav.get(configId) || [];
        const nav = navById.get(configId);
        const isView = !!(nav?.view_config_id && nav?.parent_id);

        if (directPerms.length === 0) {
          if (isView) return false;
          return true;
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

      // ------------------------------------------------------------------
      // 6. Count distinct roles per nav_config (shared view detection)
      // ------------------------------------------------------------------
      const getRolesWithAccessToNav = (configId: string): Set<string> => {
        const directPerms = permsByNav.get(configId) || [];
        const nav = navById.get(configId);
        const isView = !!(nav?.view_config_id && nav?.parent_id);

        if (directPerms.length === 0) {
          if (isView) return new Set<string>();
          return new Set(allRoles.map((r: { id: string }) => r.id));
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

      // Group nav configs by view_config_id, union role sets
      const rolesByViewConfig = new Map<string, Set<string>>();
      for (const nav of activeNavConfigs) {
        if (!nav.view_config_id) continue;
        const roles = getRolesWithAccessToNav(nav.id);
        const existing = rolesByViewConfig.get(nav.view_config_id);
        if (!existing) {
          rolesByViewConfig.set(nav.view_config_id, roles);
        } else {
          for (const rid of roles) existing.add(rid);
        }
      }

      // ------------------------------------------------------------------
      // 7. Build the flat list by iterating nav configs -> view configs -> blocks
      // ------------------------------------------------------------------
      const items: RoleUsageItem[] = [];

      for (const nav of activeNavConfigs) {
        if (!nav.view_config_id) continue;

        const vc = viewConfigsMap.get(nav.view_config_id);
        if (!vc) continue;

        const config = vc.config as Record<string, unknown> | null;
        const blocks = (config?.blocks ?? []) as Array<Record<string, unknown>>;
        if (blocks.length === 0) continue;

        const module = getModule(nav.id);
        const hasAccess = roleHasAccess(nav.id);

        blocks.forEach((block, idx: number) => {
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
            blockConfig: block.config ?? {},
            blockTitle: block.title ?? null,
            hasAccess,
            sharedRoleCount: rolesByViewConfig.get(nav.view_config_id!)?.size ?? 0,
          });
        });
      }

      // ------------------------------------------------------------------
      // 8. Sort by module name then view name
      // ------------------------------------------------------------------
      items.sort((a, b) => {
        const mod = a.moduleName.localeCompare(b.moduleName);
        if (mod !== 0) return mod;
        return a.viewName.localeCompare(b.viewName);
      });

      return items;
    },
    enabled: !!roleId && !!clientId,
  });
}
