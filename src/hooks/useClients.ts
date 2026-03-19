import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export interface Client {
  id: string;
  name: string;
  is_active: boolean;
  settings: unknown | null;
  created_at: string;
  updated_at: string;
}

export type ClientInsert = {
  name: string;
  is_active?: boolean;
  settings?: unknown;
};

export type ClientUpdate = Partial<ClientInsert> & { id: string };

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients.all(),
    queryFn: () => api.get<Client[]>('/api/clients'),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.clients.detail(id!),
    queryFn: () => api.get<Client>(`/api/clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  return useMutationWithToast({
    mutationFn: (client: { name: string; is_active?: boolean }) =>
      api.post<Client>('/api/clients', client),
    invalidateKeys: [queryKeys.clients.all()],
    successMessage: 'Client créé avec succès',
  });
}

export function useUpdateClient() {
  return useMutationWithToast({
    mutationFn: ({ id, ...updates }: ClientUpdate) =>
      api.patch<Client>(`/api/clients/${id}`, updates),
    invalidateKeys: [queryKeys.clients.all()],
    successMessage: 'Client mis à jour avec succès',
  });
}

export function useDeleteClient() {
  return useMutationWithToast({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/clients/${id}`),
    invalidateKeys: [queryKeys.clients.all()],
    successMessage: 'Client supprimé avec succès',
  });
}
