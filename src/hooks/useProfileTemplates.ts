import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/query-keys';

// Re-export mutations for backward compatibility
export {
  useCreateProfileTemplate,
  useUpdateProfileTemplate,
  useArchiveProfileTemplate,
  useRestoreProfileTemplate,
  useDeleteProfileTemplate,
  useAssignProfileTemplate,
  useUnassignProfileTemplate,
  useUpdateProfileTemplateLastUsed,
} from './useProfileTemplateMutations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileTemplate {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  eos: Array<{
    id: string;
    eo_id: string;
    eo_name: string;
    eo_code: string | null;
    include_descendants: boolean;
  }>;
  roles: Array<{
    id: string;
    module_role_id: string;
    role_name: string;
    role_color: string | null;
    module_slug: string;
  }>;
  groups: Array<{
    group_id: string;
    group_name: string;
  }>;
  _userCount: number;
}

export interface EoAssignment {
  eo_id: string;
  include_descendants: boolean;
}

export interface CreateProfileTemplateInput {
  client_id: string;
  name: string;
  description?: string;
  eo_assignments: EoAssignment[];
  role_ids: string[];
  group_ids: string[];
}

export interface UpdateProfileTemplateInput {
  id: string;
  name?: string;
  description?: string | null;
  eo_assignments?: EoAssignment[];
  role_ids?: string[];
  group_ids?: string[];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * List all profile templates for a client, with user count.
 */
export function useProfileTemplates(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profileTemplates.byClient(clientId!),
    queryFn: async (): Promise<ProfileTemplate[]> => {
      if (!clientId) return [];
      return api.get<ProfileTemplate[]>(`/api/profile-templates?client_id=${clientId}`);
    },
    enabled: !!clientId,
  });
}

/**
 * Single profile template with full relations.
 */
export function useProfileTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profileTemplates.detail(templateId!),
    queryFn: async (): Promise<ProfileTemplate | null> => {
      if (!templateId) return null;
      return api.get<ProfileTemplate>(`/api/profile-templates/${templateId}`);
    },
    enabled: !!templateId,
  });
}

/**
 * List users assigned to a profile template.
 */
export function useProfileTemplateUsers(templateId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profileTemplates.users(templateId!),
    queryFn: async () => {
      if (!templateId) return [];
      return api.get<Array<{
        id: string;
        user_id: string;
        last_used_at: string | null;
        created_at: string;
      }>>(`/api/profile-templates/user-templates?template_id=${templateId}`);
    },
    enabled: !!templateId,
  });
}

/**
 * Current user's profile templates for a client (UF mode).
 */
export function useMyProfileTemplates(clientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profileTemplates.userTemplates(user?.id, clientId),
    queryFn: async (): Promise<(ProfileTemplate & { assignmentId: string; last_used_at: string | null })[]> => {
      if (!user?.id || !clientId) return [];
      return api.get<(ProfileTemplate & { assignmentId: string; last_used_at: string | null })[]>(
        `/api/profile-templates/user-templates?user_id=${user.id}&client_id=${clientId}`
      );
    },
    enabled: !!user?.id && !!clientId,
  });
}
