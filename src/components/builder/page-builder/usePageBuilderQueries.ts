import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

/**
 * Fetch BO definitions for the page builder config panel, filtered by client.
 */
export function useBoDefinitions(clientId?: string | null) {
  return useQuery({
    queryKey: queryKeys.businessObjectDefinitions.list(clientId),
    queryFn: async () => {
      const params = clientId ? `?client_id=${clientId}` : '';
      const data = await api.get<{ id: string; name: string }[]>(
        `/api/business-objects/definitions${params}`
      );
      return data || [];
    },
  });
}

/**
 * Fetch roles inherited from the navigation config that references this view.
 */
export function useInheritedRoles(viewId: string, clientId?: string | null) {
  return useQuery({
    queryKey: queryKeys.viewPermissions.inheritedRoles(viewId!, clientId!),
    queryFn: async () => {
      if (!viewId || !clientId) return [];

      const roles = await api.get<{ id: string; name: string; color: string | null; category_id: string | null }[]>(
        `/api/view-configs/${viewId}/inherited-roles?client_id=${clientId}`
      );

      return roles || [];
    },
    enabled: !!viewId && !!clientId,
  });
}
