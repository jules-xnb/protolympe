import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

interface ToggleParams {
  navConfigId: string;
  roleId: string;
  grant: boolean;
}

export function useToggleRoleAccess() {
  return useMutationWithToast({
    mutationFn: async ({ navConfigId, roleId, grant }: ToggleParams) => {
      // Remove any existing direct permission for this role on this nav config
      await api.post('/api/view-configs/nav-permissions/delete-by-role', {
        navigation_config_id: navConfigId,
        role_id: roleId,
      });

      // Only insert a row when granting access.
      // For views, "no permission row" already means "no access".
      if (grant) {
        await api.post('/api/view-configs/nav-permissions', {
          navigationConfigId: navConfigId,
          roleId: roleId,
          isVisible: true,
        });
      }
    },
    invalidateKeys: [queryKeys.navPermissions.byConfig(""), queryKeys.navPermissions.all()],
    errorMessage: 'Erreur lors de la modification de l\'accès',
  });
}
