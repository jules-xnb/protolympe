import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useViewMode } from '@/contexts/ViewModeContext';
import type { EoCardBlock } from '@/components/builder/page-builder/types';
import type { OrganizationalEntity } from './EoCardFields';
import { queryKeys } from '@/lib/query-keys';

export function useEoBaseData(config: EoCardBlock['config']) {
  const { data: permContext, isLoading: isLoadingPerms } = useUserPermissions();
  const { selectedClient } = useViewMode();

  // User can have multiple EOs (multi-root)
  const userEoIds = permContext?.eoIds || [];
  const userEoPaths = permContext?.eoPaths || [];
  const clientId = selectedClient?.id;

  // Fetch user's EOs (the ones they have direct access to)
  const { data: userEos = [], isLoading: isLoadingUserEos } = useQuery({
    queryKey: queryKeys.organizationalEntities.userEntities(userEoIds),
    queryFn: async () => {
      if (userEoIds.length === 0) return [];
      return api.post<OrganizationalEntity[]>('/api/organizational-entities/by-ids', { ids: userEoIds, is_archived: false, order: 'name' });
    },
    enabled: userEoIds.length > 0,
  });

  // Fetch descendants for all user EOs (if show_children is enabled)
  const { data: descendantEos = [], isLoading: isLoadingDescendants } = useQuery({
    queryKey: queryKeys.organizationalEntities.userDescendants(userEoPaths, config.show_children),
    queryFn: async () => {
      if (userEoPaths.length === 0 || !config.show_children) return [];
      return api.post<OrganizationalEntity[]>('/api/organizational-entities/descendants', { paths: userEoPaths, is_archived: false });
    },
    enabled: userEoPaths.length > 0 && config.show_children === true,
  });

  // All base entities (before filtering)
  const allBaseEntities = useMemo(() => {
    if (!config.show_children) {
      return userEos;
    }
    const entityMap = new Map<string, OrganizationalEntity>();
    userEos.forEach(eo => entityMap.set(eo.id, eo));
    descendantEos.forEach(eo => entityMap.set(eo.id, eo));
    return Array.from(entityMap.values()).sort((a, b) => a.path.localeCompare(b.path));
  }, [userEos, descendantEos, config.show_children]);

  // Check if base data is still loading
  const isBaseDataLoading = isLoadingPerms || isLoadingUserEos || (config.show_children && isLoadingDescendants);

  return {
    userEoIds,
    userEoPaths,
    clientId,
    selectedClient,
    userEos,
    allBaseEntities,
    isBaseDataLoading: !!isBaseDataLoading,
  };
}
