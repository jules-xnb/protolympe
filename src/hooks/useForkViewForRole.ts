import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import type { Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

interface ForkViewParams {
  viewConfigId: string;
  navConfigId: string;
  roleId: string;
  roleName: string;
}

interface ForkResult {
  newViewConfigId: string;
  newNavConfigId: string;
}

interface ViewConfigRow {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  bo_definition_id: string | null;
  config: Json;
  is_default: boolean;
  is_active: boolean;
  is_published: boolean;
  published_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface NavConfigRow {
  id: string;
  client_id: string;
  label: string;
  slug: string;
  icon: string | null;
  url: string | null;
  parent_id: string | null;
  display_order: number | null;
  is_active: boolean | null;
  view_config_id: string | null;
  display_label: string | null;
  created_at: string;
  updated_at: string;
}

export function useForkViewForRole() {
  return useMutationWithToast({
    mutationFn: async ({ viewConfigId, navConfigId, roleId, roleName }: ForkViewParams): Promise<ForkResult> => {

      // 1. Fetch the original view_config
      const originalView = await api.get<ViewConfigRow>(`/api/view-configs/${viewConfigId}`);
      if (!originalView) throw new Error('View config not found');

      // 2. Fetch the original navigation_config
      // TODO: navigation_configs API is not in scope — using direct fetch for now
      const originalNav = await api.get<NavConfigRow>(`/api/navigation-configs/${navConfigId}`);
      if (!originalNav) throw new Error('Nav config not found');

      // 3. Create a copy of the view_config
      const { id: _vcId, created_at: _vcCa, updated_at: _vcUa, ...viewFields } = originalView;
      const newViewName = `${originalView.name || originalNav.label} - ${roleName}`;
      const suffix = Date.now().toString(36);
      const newViewSlug = `${originalView.slug}-${roleName.toLowerCase().replace(/\s+/g, '-')}-${suffix}`;

      const newView = await api.post<ViewConfigRow>('/api/view-configs', {
        ...viewFields,
        name: newViewName,
        slug: newViewSlug,
        config: originalView.config,
      });

      if (!newView) throw new Error('Failed to create view config copy');

      // 4. Create a new navigation_config pointing to the new view
      const { id: _navId, created_at: _navCa, updated_at: _navUa, ...navFields } = originalNav;
      const newNavSlug = `${originalNav.slug}-${roleName.toLowerCase().replace(/\s+/g, '-')}-${suffix}`;

      const newNav = await api.post<NavConfigRow>('/api/navigation-configs', {
        ...navFields,
        slug: newNavSlug,
        label: `${originalNav.label} - ${roleName}`,
        view_config_id: newView.id,
      });

      if (!newNav) throw new Error('Failed to create nav config copy');

      // 5. Create nav_permission for the role on the new nav_config
      await api.post('/api/view-configs/nav-permissions', {
        navigation_config_id: newNav.id,
        role_id: roleId,
        is_visible: true,
      });

      // 6. Exclude the role from the original nav_config
      //    Delete any existing direct permission, then insert an explicit
      //    exclusion (is_visible=false) so the role no longer sees the
      //    original view — even if it had access via its category.
      const existingPerms = await api.get<Array<{ id: string }>>(`/api/view-configs/nav-permissions?nav_config_id=${navConfigId}`);
      const permToDelete = (existingPerms || []).find((p: Record<string, unknown>) => (p as { role_id?: string }).role_id === roleId);
      if (permToDelete) {
        await api.delete(`/api/view-configs/nav-permissions/${permToDelete.id}`);
      }

      await api.post('/api/view-configs/nav-permissions', {
        navigation_config_id: navConfigId,
        role_id: roleId,
        is_visible: false,
      });

      return {
        newViewConfigId: newView.id,
        newNavConfigId: newNav.id,
      };
    },
    invalidateKeys: [queryKeys.roleUsages.all(), queryKeys.navigationConfigs.all(), queryKeys.viewConfigs.all(), queryKeys.roles.usedIds("", "")],
    successMessage: 'Vue personnalisée créée pour ce rôle',
    errorMessage: 'Erreur lors de la personnalisation',
  });
}
