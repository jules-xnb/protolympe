import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';

export type Role = {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  color: string | null;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export interface RoleWithCategory extends Role {
  role_categories: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count?: {
    assignments: number;
  };
}

// Replaces createCrudHooks for roles
export function useCreateRole() {
  const { selectedClient } = useViewMode();
  return useMutationWithToast({
    mutationFn: async (data: Record<string, unknown>) => {
      if (!selectedClient?.id) throw new Error('Aucun client sélectionné');
      return api.post('/api/roles', { ...data, client_id: selectedClient.id });
    },
    invalidateKeys: [queryKeys.roles.all()],
    successMessage: undefined,
  });
}

export function useUpdateRole() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      return api.patch(`/api/roles/${id}`, data);
    },
    invalidateKeys: [queryKeys.roles.all()],
    successMessage: undefined,
  });
}

/** Archive a role AND remove it from all profile templates. */
export function useArchiveRole() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/roles/${id}`);
    },
    invalidateKeys: [queryKeys.roles.all(), [queryKeys.profileTemplates.crudKey]],
    successMessage: 'Rôle archivé',
  });
}

// Custom list — needs assignment counts
export function useRoles() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.roles.byClient(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const roles = await api.get<RoleWithCategory[]>(`/api/roles?client_id=${selectedClient.id}`);
      return roles;
    },
    enabled: !!selectedClient?.id,
  });
}

/**
 * Returns a Set of role IDs that are referenced in nav_permissions
 * (either directly via role_id, or indirectly via category_id).
 */
export function useUsedRoleIds(
  clientId: string | undefined,
  roles: RoleWithCategory[],
) {
  const roleIdsCacheKey = roles.map(r => `${r.id}:${r.category_id}`).join(',');

  return useQuery({
    queryKey: queryKeys.roles.usedIds(clientId!, roleIdsCacheKey),
    queryFn: async (): Promise<Set<string>> => {
      const perms = await api.get<{ role_id: string | null; category_id: string | null }[]>(
        '/api/view-configs/nav-permissions'
      );

      const directRoleIds = new Set(
        (perms || []).filter(p => p.role_id).map(p => p.role_id!)
      );
      const usedCategoryIds = new Set(
        (perms || []).filter(p => p.category_id).map(p => p.category_id!)
      );

      // Roles used directly + roles whose category is used
      const used = new Set<string>(directRoleIds);
      for (const role of roles) {
        if (role.category_id && usedCategoryIds.has(role.category_id)) {
          used.add(role.id);
        }
      }
      return used;
    },
    enabled: !!clientId && roles.length > 0,
  });
}

export function useRolesByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.roles.byClientExplicit(clientId!),
    queryFn: async () => {
      if (!clientId) return [];
      const data = await api.get<RoleWithCategory[]>(`/api/roles?client_id=${clientId}`);
      return data;
    },
    enabled: !!clientId,
  });
}

export function useRestoreRole() {
  return useMutationWithToast({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string }) => {
      await api.patch(`/api/roles/${id}/restore`, { category_id: categoryId });
    },
    invalidateKeys: [queryKeys.roles.all()],
  });
}

export function useArchivedRoles() {
  const { selectedClient } = useViewMode();
  return useQuery({
    queryKey: queryKeys.roles.archived(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      const data = await api.get<RoleWithCategory[]>(`/api/roles/archived?client_id=${selectedClient.id}`);
      return data;
    },
    enabled: !!selectedClient?.id,
  });
}

// Role assignments
export interface RoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
}

export function useRoleAssignments(roleId: string | undefined) {
  const { selectedClient } = useViewMode();
  return useQuery({
    queryKey: queryKeys.roles.assignments(roleId!),
    queryFn: async () => {
      if (!roleId) return [];
      const data = await api.get<RoleAssignment[]>(`/api/roles/assignments?client_id=${selectedClient?.id}&role_id=${roleId}`);
      return data;
    },
    enabled: !!roleId,
  });
}

export function useAssignRole() {
  return useMutationWithToast({
    mutationFn: async (data: { user_id: string; role_id: string }) => {
      return api.post('/api/roles/assignments', data);
    },
    invalidateKeys: [queryKeys.roles.assignments(""), queryKeys.roles.all(), queryKeys.clientUsers.byClient(), queryKeys.roles.assignmentsFull()],
  });
}

export function useUnassignRole() {
  return useMutationWithToast({
    mutationFn: async ({ assignmentId, roleId }: { assignmentId: string; roleId: string }) => {
      await api.delete(`/api/roles/assignments/${assignmentId}`);
      return roleId;
    },
    invalidateKeys: [queryKeys.roles.assignments(""), queryKeys.roles.all(), queryKeys.clientUsers.byClient()],
  });
}
