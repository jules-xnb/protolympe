import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';

export interface UserEoAssignment {
  id: string;
  user_id: string;
  eo_id: string;
  is_active: boolean;
  created_at: string;
  organizational_entities: {
    id: string;
    name: string;
    code: string | null;
    level: number;
    path: string;
  } | null;
}

export function useUserEoAssignments(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.userEoAssignments.byUser(userId!),
    queryFn: async () => {
      if (!userId) return [];
      return api.get<UserEoAssignment[]>(`/api/client-users/eo-assignments?user_id=${userId}`);
    },
    enabled: !!userId,
  });
}

export function useAssignUserEo() {
  return useMutationWithToast({
    mutationFn: async ({ userId, eoId }: { userId: string; eoId: string }) => {
      return api.post('/api/client-users/eo-assignments', {
        user_id: userId,
        eo_id: eoId,
      });
    },
    invalidateKeys: [queryKeys.userEoAssignments.byUser(''), queryKeys.clientUsers.byClient()],
  });
}

export function useUnassignUserEo() {
  return useMutationWithToast({
    mutationFn: async ({ assignmentId, userId }: { assignmentId: string; userId: string }) => {
      await api.delete(`/api/client-users/eo-assignments/${assignmentId}`);
      return userId;
    },
    invalidateKeys: [queryKeys.userEoAssignments.byUser(''), queryKeys.clientUsers.byClient()],
  });
}

// Get all EO assignments for a client's users
export function useClientUserEoAssignments() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.userEoAssignments.byClient(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return api.get<Array<{
        id: string;
        user_id: string;
        eo_id: string;
        is_active: boolean;
        organizational_entities: {
          id: string;
          name: string;
          code: string | null;
        } | null;
      }>>(`/api/client-users/eo-assignments?client_id=${selectedClient.id}`);
    },
    enabled: !!selectedClient?.id,
  });
}
