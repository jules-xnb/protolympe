import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { OrganizationalEntityWithClient } from '@/hooks/useOrganizationalEntities';
import { queryKeys } from '@/lib/query-keys';

/**
 * Fetch ALL Organizational Entities the current user can read.
 * Intended for admin/debug/platform-wide views.
 */
export function useAllOrganizationalEntities(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.organizationalEntities.all(),
    enabled,
    queryFn: async () => {
      const entities = await api.get<OrganizationalEntityWithClient[]>(
        '/api/organizational-entities'
      );

      const nameById = new Map(entities.map((e) => [e.id, e.name] as const));

      return entities.map((e) => {
        const parentName = e.parent_id ? nameById.get(e.parent_id) : undefined;
        return {
          ...e,
          parent: parentName ? [{ name: parentName }] : null,
        };
      });
    },
  });
}
