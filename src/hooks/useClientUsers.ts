import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

export interface ClientUser {
  id: string;
  user_id: string;
  client_id: string;
  is_active: boolean;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  role_assignments: {
    id: string;
    role: {
      id: string;
      name: string;
    };
  }[];
  profile_templates_count: number;
  profile_template_names: string[];
}

export function useClientUsers() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.clientUsers.byClient(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return api.get<ClientUser[]>(`/api/client-users?client_id=${selectedClient.id}`);
    },
    enabled: !!selectedClient?.id,
  });
}

export function useEosForAssignment(enabled: boolean) {
  const { selectedClient } = useViewMode();
  return useQuery({
    queryKey: queryKeys.clientUsers.eosForAssignment(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return api.get<Array<{
        id: string;
        name: string;
        code: string | null;
        path: string;
        level: number;
      }>>(`/api/client-users/eos?client_id=${selectedClient.id}`);
    },
    enabled: enabled && !!selectedClient?.id,
  });
}

export function useRolesForAssignment(enabled: boolean) {
  const { selectedClient } = useViewMode();
  return useQuery({
    queryKey: queryKeys.clientUsers.roles(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return api.get<Array<{
        id: string;
        name: string;
        color: string | null;
        module_slug: string;
      }>>(`/api/module-roles/by-client?client_id=${selectedClient.id}`);
    },
    enabled: enabled && !!selectedClient?.id,
  });
}

export function useInviteClientUser() {
  const { selectedClient } = useViewMode();

  return useMutationWithToast({
    mutationFn: async ({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) => {
      if (!selectedClient?.id) throw new Error('No client selected');
      return api.post('/api/client-users/invite', {
        email,
        firstName,
        lastName,
        clientId: selectedClient.id,
      });
    },
    invalidateKeys: [['client-users'] as const],
  });
}

export function useUpdateClientUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, isActive }: { membershipId: string; isActive: boolean }) => {
      return api.patch(`/api/client-users/memberships/${membershipId}`, {
        is_active: isActive,
      });
    },
    onMutate: async ({ membershipId, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['client-users'] });
      const previousData = queryClient.getQueriesData<ClientUser[]>({ queryKey: ['client-users'] });
      queryClient.setQueriesData<ClientUser[]>({ queryKey: ['client-users'] }, (old) =>
        old?.map(u => u.id === membershipId ? { ...u, is_active: isActive } : u)
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      toast.error('Erreur lors de la mise à jour');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['client-users'] });
    },
  });
}

export function useActivateUser() {
  return useMutationWithToast({
    mutationFn: async ({ membershipId, email }: { membershipId: string; email: string }) => {
      return api.post('/api/client-users/activate', { membershipId, email });
    },
    invalidateKeys: [['client-users'] as const],
  });
}

export function useRemoveClientUser() {
  return useMutationWithToast({
    mutationFn: async (membershipId: string) => {
      await api.delete(`/api/client-users/memberships/${membershipId}`);
    },
    invalidateKeys: [['client-users'] as const],
  });
}
