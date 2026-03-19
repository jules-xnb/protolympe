import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import type { CreateProfileTemplateInput, UpdateProfileTemplateInput } from './useProfileTemplates';
import { queryKeys } from '@/lib/query-keys';

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateProfileTemplate() {
  const { user } = useAuth();

  return useMutationWithToast({
    mutationFn: async (input: CreateProfileTemplateInput) => {
      return api.post('/api/profile-templates', {
        ...input,
        created_by: user?.id,
      });
    },
    invalidateKeys: [queryKeys.profileTemplates.byClient("")],
    successMessage: 'Profil créé',
    errorMessage: 'Impossible de créer le profil',
  });
}

export function useUpdateProfileTemplate() {
  return useMutationWithToast({
    mutationFn: async (input: UpdateProfileTemplateInput) => {
      return api.patch(`/api/profile-templates/${input.id}`, input);
    },
    invalidateKeys: [queryKeys.profileTemplates.byClient(""), queryKeys.profileTemplates.detail("")],
    successMessage: 'Profil modifié',
    errorMessage: 'Impossible de modifier le profil',
  });
}

export function useArchiveProfileTemplate() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/profile-templates/${id}`);
    },
    invalidateKeys: [[queryKeys.profileTemplates.crudKey], [queryKeys.profileTemplates.detail("")]],
    successMessage: 'Profil archivé',
  });
}

export function useRestoreProfileTemplate() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.patch(`/api/profile-templates/${id}/restore`, {});
    },
    invalidateKeys: [[queryKeys.profileTemplates.crudKey], [queryKeys.profileTemplates.detail("")]],
    successMessage: 'Profil restauré',
  });
}

export function useDeleteProfileTemplate() {
  return useMutationWithToast({
    mutationFn: async (templateId: string) => {
      await api.delete(`/api/profile-templates/${templateId}`);
      return { id: templateId };
    },
    invalidateKeys: [queryKeys.profileTemplates.byClient("")],
    successMessage: 'Profil supprimé',
    errorMessage: 'Impossible de supprimer le profil',
  });
}

export function useAssignProfileTemplate() {
  return useMutationWithToast({
    mutationFn: async (input: { userId: string; templateId: string; clientId: string }) => {
      return api.post('/api/profile-templates/user-templates', {
        user_id: input.userId,
        template_id: input.templateId,
        client_id: input.clientId,
      });
    },
    invalidateKeys: [queryKeys.profileTemplates.byClient(""), queryKeys.profileTemplates.detail(""), queryKeys.profileTemplates.userTemplates(), queryKeys.clientUsers.byClient()],
    successMessage: 'Profil assigné',
    errorMessage: "Impossible d'assigner le profil",
  });
}

export function useUnassignProfileTemplate() {
  return useMutationWithToast({
    mutationFn: async (input: { userId: string; templateId: string }) => {
      // Find the assignment and delete it
      await api.delete(`/api/profile-templates/user-templates/${input.templateId}?user_id=${input.userId}`);
      return input;
    },
    invalidateKeys: [queryKeys.profileTemplates.byClient(""), queryKeys.profileTemplates.detail(""), queryKeys.profileTemplates.userTemplates(), queryKeys.clientUsers.byClient()],
    successMessage: 'Profil désassigné',
    errorMessage: 'Impossible de désassigner le profil',
  });
}

export function useUpdateProfileTemplateLastUsed() {
  return useMutationWithToast({
    mutationFn: async (assignmentId: string) => {
      return api.patch(`/api/profile-templates/user-templates/${assignmentId}`, {
        last_used_at: new Date().toISOString(),
      });
    },
    invalidateKeys: [queryKeys.profileTemplates.userTemplates()],
  });
}
