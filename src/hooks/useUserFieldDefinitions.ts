import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';

import type { Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

/** Shape of an option entry in UserFieldDefinition.options */
export type UserFieldOption = string | { value: string; label: string };

export interface UserFieldDefinition {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  description: string | null;
  field_type: string;
  is_required: boolean;
  is_unique: boolean;
  is_active: boolean;
  is_user_editable: boolean;
  display_order: number;
  default_value: Json | null;
  options: UserFieldOption[];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useUserFieldDefinitions(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.userFieldDefinitions.byClient(clientId!),
    queryFn: async () => {
      if (!clientId) return [];
      return api.get<UserFieldDefinition[]>(`/api/client-users/field-definitions?client_id=${clientId}`);
    },
    enabled: !!clientId,
  });
}

export function useCreateUserFieldDefinition() {
  return useMutationWithToast({
    mutationFn: async (data: {
      client_id: string;
      name: string;
      slug: string;
      description?: string | null;
      field_type?: string;
      is_required?: boolean;
      is_unique?: boolean;
      is_user_editable?: boolean;
      display_order?: number;
      options?: UserFieldOption[];
      settings?: Record<string, unknown>;
      default_value?: Json | null;
    }) => {
      return api.post<UserFieldDefinition>('/api/client-users/field-definitions', data);
    },
    invalidateKeys: [queryKeys.userFieldDefinitions.byClient("")],
    successMessage: 'Champ utilisateur créé',
  });
}

export function useUpdateUserFieldDefinition() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Omit<UserFieldDefinition, 'id' | 'created_at' | 'updated_at' | 'created_by'>>) => {
      return api.patch<UserFieldDefinition>(`/api/client-users/field-definitions/${id}`, data);
    },
    invalidateKeys: [queryKeys.userFieldDefinitions.byClient("")],
    successMessage: 'Champ mis à jour',
  });
}

// Archive/restore — replaces createCrudHooks usage
export function useArchivedUserFieldDefinitions() {
  const { selectedClient } = useViewMode();
  return useQuery({
    queryKey: [queryKeys.userFieldDefinitions.crudKey, 'archived', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return api.get<UserFieldDefinition[]>(`/api/client-users/field-definitions?client_id=${selectedClient.id}&archived=true`);
    },
    enabled: !!selectedClient?.id,
  });
}

export function useArchiveUserFieldDefinition() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/client-users/field-definitions/${id}`);
    },
    invalidateKeys: [[queryKeys.userFieldDefinitions.crudKey]],
    successMessage: 'Champ archivé',
  });
}

export function useRestoreUserFieldDefinition() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.patch(`/api/client-users/field-definitions/${id}`, { is_active: true });
    },
    invalidateKeys: [[queryKeys.userFieldDefinitions.crudKey]],
    successMessage: 'Champ restauré',
  });
}

// ---- Field Values ----

export interface UserFieldValue {
  id: string;
  user_id: string;
  field_definition_id: string;
  value: Json | null;
  updated_at: string;
  updated_by: string | null;
}

export function useUserFieldValues(userId?: string) {
  return useQuery({
    queryKey: queryKeys.userFieldDefinitions.values(userId!),
    queryFn: async () => {
      if (!userId) return [];
      return api.get<UserFieldValue[]>(`/api/client-users/${userId}/field-values`);
    },
    enabled: !!userId,
  });
}

export function useUpsertUserFieldValue() {
  return useMutationWithToast({
    mutationFn: async (data: { user_id: string; field_definition_id: string; value: Json | null }) => {
      return api.post<UserFieldValue>('/api/client-users/field-values', data);
    },
    invalidateKeys: [queryKeys.userFieldDefinitions.values("")],
  });
}
