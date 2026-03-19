import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface EoGroupMember {
  id: string;
  group_id: string;
  eo_id: string;
  include_descendants: boolean;
  eo_name: string;
  eo_code: string | null;
  eo_level: number;
  eo_path: string;
}

/**
 * Fetch members for ALL groups of a client (used in profile dialog to preview group contents)
 */
export function useAllEoGroupMembers(groupIds: string[]) {
  return useQuery({
    queryKey: queryKeys.eoGroupMembers.all(groupIds),
    queryFn: async () => {
      if (groupIds.length === 0) return [];
      // Fetch members for each group in parallel and merge
      const results = await Promise.all(
        groupIds.map(gid => api.get<EoGroupMember[]>(`/api/organizational-entities/groups/${gid}/members`))
      );
      return results.flat();
    },
    enabled: groupIds.length > 0,
  });
}

export const useEoGroupMembers = (groupId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.eoGroupMembers.byGroup(groupId!),
    queryFn: async () => {
      return await api.get<EoGroupMember[]>(
        `/api/organizational-entities/groups/${groupId!}/members`
      );
    },
    enabled: !!groupId,
  });
};

export const useAddEoGroupMembers = () => {
  return useMutationWithToast({
    mutationFn: async (members: { group_id: string; eo_id: string; include_descendants?: boolean }[]) => {
      if (members.length === 0) return [];
      const groupId = members[0].group_id;
      return await api.post(
        `/api/organizational-entities/groups/${groupId}/members`,
        members
      );
    },
    invalidateKeys: [queryKeys.eoGroupMembers.byGroup(""), queryKeys.eoGroups.byClient("")],
    successMessage: 'Membres ajoutés au groupe',
  });
};

export const useUpdateEoGroupMember = () => {
  return useMutationWithToast({
    mutationFn: async ({ id, include_descendants }: { id: string; include_descendants: boolean }) => {
      return await api.patch(
        `/api/organizational-entities/groups/members/${id}`,
        { include_descendants }
      );
    },
    invalidateKeys: [queryKeys.eoGroupMembers.byGroup("")],
  });
};

export const useRemoveEoGroupMember = () => {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/organizational-entities/groups/members/${id}`);
    },
    invalidateKeys: [queryKeys.eoGroupMembers.byGroup(""), queryKeys.eoGroups.byClient("")],
    successMessage: 'Membre retiré du groupe',
  });
};
