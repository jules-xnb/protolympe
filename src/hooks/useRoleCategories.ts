import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';

export interface RoleCategory {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_required: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RoleCategoryInsert {
  client_id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_required?: boolean;
  display_order?: number;
  is_active?: boolean;
}

export interface RoleCategoryUpdate {
  name?: string;
  slug?: string;
  description?: string | null;
  is_required?: boolean;
  display_order?: number;
  is_active?: boolean;
}

// Replaces createCrudHooks for role_categories

export function useRoleCategories() {
  const { selectedClient } = useViewMode();
  return useQuery({
    queryKey: [queryKeys.roleCategories.crudKey, selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return api.get<RoleCategory[]>(`/api/roles/categories?client_id=${selectedClient.id}`);
    },
    enabled: !!selectedClient?.id,
  });
}

export function useArchivedRoleCategories() {
  const { selectedClient } = useViewMode();
  return useQuery({
    queryKey: [queryKeys.roleCategories.crudKey, 'archived', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      // Archived categories: the API may not have a dedicated endpoint,
      // so we filter on the server side. If the server supports it:
      return api.get<RoleCategory[]>(`/api/roles/categories?client_id=${selectedClient.id}&archived=true`);
    },
    enabled: !!selectedClient?.id,
  });
}

export function useCreateRoleCategory() {
  const { selectedClient } = useViewMode();
  return useMutationWithToast({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!selectedClient?.id) throw new Error('Aucun client sélectionné');
      return api.post('/api/roles/categories', { ...data, client_id: selectedClient.id });
    },
    invalidateKeys: [[queryKeys.roleCategories.crudKey]],
    successMessage: 'Catégorie de rôle créée avec succès',
  });
}

export function useUpdateRoleCategory() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      return api.patch(`/api/roles/categories/${id}`, data);
    },
    invalidateKeys: [[queryKeys.roleCategories.crudKey]],
    successMessage: 'Catégorie mise à jour avec succès',
  });
}

export function useArchiveRoleCategory() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/roles/categories/${id}`);
    },
    invalidateKeys: [[queryKeys.roleCategories.crudKey]],
    successMessage: 'Catégorie archivée',
  });
}

export function useRestoreRoleCategory() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.patch(`/api/roles/categories/${id}`, { is_active: true });
    },
    invalidateKeys: [[queryKeys.roleCategories.crudKey]],
    successMessage: 'Catégorie restaurée',
  });
}

// Specific hooks not covered by factory

export function useRoleCategoriesByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.roleCategories.byClient(clientId!),
    queryFn: async () => {
      if (!clientId) return [];
      return api.get<RoleCategory[]>(`/api/roles/categories?client_id=${clientId}`);
    },
    enabled: !!clientId,
  });
}

export function useRoleCategory(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.roleCategories.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      return api.get<RoleCategory>(`/api/roles/categories/${id}`);
    },
    enabled: !!id,
  });
}
