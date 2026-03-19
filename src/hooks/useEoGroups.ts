import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface EoGroup {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
}

export const useEoGroups = (clientId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.eoGroups.byClient(clientId!),
    queryFn: async () => {
      return await api.get<EoGroup[]>(
        `/api/organizational-entities/groups?client_id=${clientId!}`
      );
    },
    enabled: !!clientId,
  });
};

export const useCreateEoGroup = () => {
  return useMutationWithToast({
    mutationFn: async (group: { client_id: string; name: string; description?: string | null; created_by?: string | null }) => {
      return await api.post<EoGroup>(
        '/api/organizational-entities/groups',
        group
      );
    },
    invalidateKeys: [queryKeys.eoGroups.byClient("")],
    successMessage: 'Groupe créé avec succès',
  });
};

export const useUpdateEoGroup = () => {
  return useMutationWithToast({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string | null }) => {
      return await api.patch(
        `/api/organizational-entities/groups/${id}`,
        { name, description }
      );
    },
    invalidateKeys: [queryKeys.eoGroups.byClient("")],
    successMessage: 'Groupe mis à jour avec succès',
  });
};

export const useDeleteEoGroup = () => {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/organizational-entities/groups/${id}`);
    },
    invalidateKeys: [queryKeys.eoGroups.byClient(""), queryKeys.eoGroupMembers.byGroup(""), queryKeys.profileTemplates.byClient("")],
    successMessage: 'Groupe supprimé avec succès',
  });
};
