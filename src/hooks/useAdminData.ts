import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

interface IntegratorProfile {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

interface IntegratorRole {
  id: string;
  userId: string;
  persona: 'admin_delta' | 'integrator_delta';
  createdBy: string | null;
  createdAt: string;
  profiles: IntegratorProfile | null;
}

interface IntegratorAssignment {
  id: string;
  userId: string;
  clientId: string;
  persona: 'admin_delta' | 'integrator_delta';
  assignedBy: string | null;
  createdAt: string;
  profiles: { id: string; fullName: string | null; email: string } | null;
  clients: { id: string; name: string; slug: string } | null;
}

interface UserWithoutRole {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

// Check if current user is admin_delta
export function useIsAdminDelta() {
  return useQuery({
    queryKey: queryKeys.adminData.isAdmin(),
    queryFn: async () => {
      try {
        const data = await api.get<{ isAdmin: boolean }>('/api/integrators/is-admin');
        return data.isAdmin;
      } catch {
        return false;
      }
    },
  });
}

// Fetch all integrators (users with integrator_delta or admin_delta persona)
export function useIntegrators() {
  return useQuery({
    queryKey: queryKeys.adminData.integrators(),
    queryFn: () => api.get<IntegratorRole[]>('/api/integrators'),
  });
}

// Fetch integrator-client assignments
export function useIntegratorAssignments() {
  return useQuery({
    queryKey: queryKeys.adminData.integratorAssignments(),
    queryFn: () => api.get<IntegratorAssignment[]>('/api/integrators/assignments'),
  });
}

// Invite a new integrator (creates account if needed)
export function useInviteIntegrator() {
  return useMutationWithToast({
    mutationFn: (data: { email: string; firstName: string; lastName: string; persona: 'admin_delta' | 'integrator_delta' }) =>
      api.post<{ success: boolean; userId: string; message: string }>('/api/integrators/invite', data),
    invalidateKeys: [queryKeys.adminData.integrators(), queryKeys.adminData.usersWithoutRole()],
    successMessage: 'Intégrateur ajouté avec succès',
  });
}

// Assign integrator to client
export function useAssignIntegratorToClient() {
  return useMutationWithToast({
    mutationFn: (data: { userId: string; clientId: string; persona: 'admin_delta' | 'integrator_delta' }) =>
      api.post('/api/integrators/assign', data),
    invalidateKeys: [queryKeys.adminData.integratorAssignments()],
    successMessage: 'Intégrateur assigné au client',
  });
}

// Remove integrator from client
export function useRemoveIntegratorFromClient() {
  return useMutationWithToast({
    mutationFn: (assignmentId: string) =>
      api.delete(`/api/integrators/assignments/${assignmentId}`),
    invalidateKeys: [queryKeys.adminData.integratorAssignments()],
    successMessage: 'Assignation supprimée',
  });
}

// Remove system role from user
export function useRemoveSystemRole() {
  return useMutationWithToast({
    mutationFn: ({ roleId }: { roleId: string; userId: string }) =>
      api.delete(`/api/integrators/role/${roleId}`),
    invalidateKeys: [
      queryKeys.adminData.integrators(),
      queryKeys.adminData.integratorAssignments(),
      queryKeys.adminData.usersWithoutRole(),
    ],
    successMessage: 'Rôle et assignations supprimés',
  });
}

// Update integrator persona (admin_delta <-> integrator_delta)
export function useUpdateIntegratorPersona() {
  return useMutationWithToast({
    mutationFn: ({ roleId, persona }: { roleId: string; persona: 'admin_delta' | 'integrator_delta' }) =>
      api.patch(`/api/integrators/role/${roleId}`, { persona }),
    invalidateKeys: [queryKeys.adminData.integrators()],
    successMessage: 'Rôle mis à jour',
  });
}

// Fetch users without any system role
export function useUsersWithoutRole() {
  return useQuery({
    queryKey: queryKeys.adminData.usersWithoutRole(),
    queryFn: () => api.get<UserWithoutRole[]>('/api/integrators/users-without-role'),
  });
}
