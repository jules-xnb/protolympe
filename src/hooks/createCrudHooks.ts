import { useQuery } from '@tanstack/react-query';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { api } from '@/lib/api-client';

interface CrudHooksConfig {
  tableName: string;
  queryKey: string;
  selectClause?: string;
  defaultOrder?: string;
  filterActive?: boolean;
  /**
   * Column used for soft-delete.
   * - 'is_active' (default): active = true, archived = false
   * - 'is_archived': active = false, archived = true (inverted logic)
   */
  archiveColumn?: 'is_active' | 'is_archived';
  invalidateKeys?: string[];
  labels?: {
    created?: string;
    updated?: string;
    archived?: string;
    restored?: string;
    deleted?: string;
  };
}

/**
 * Map table names to their API base paths.
 */
const TABLE_API_MAP: Record<string, string> = {
  business_objects: '/api/business-objects',
  business_object_definitions: '/api/business-object-definitions',
  field_definitions: '/api/field-definitions',
  workflows: '/api/workflows',
  referentials: '/api/referentials',
  roles: '/api/roles',
  role_categories: '/api/role-categories',
  eo_field_definitions: '/api/organizational-entities/fields',
  user_field_definitions: '/api/user-field-definitions',
  profile_templates: '/api/profile-templates',
  translations: '/api/translations',
};

function getApiPath(tableName: string): string {
  return TABLE_API_MAP[tableName] || `/api/${tableName.replace(/_/g, '-')}`;
}

export function createCrudHooks(config: CrudHooksConfig) {
  const {
    tableName,
    queryKey,
    defaultOrder = 'name',
    filterActive = true,
    archiveColumn = 'is_active',
    invalidateKeys = [],
    labels = {},
  } = config;

  // Compute active/archived values based on column semantics
  const activeValue = archiveColumn === 'is_archived' ? false : true;
  const archivedValue = !activeValue;

  const basePath = getApiPath(tableName);
  const allInvalidateKeys = [[queryKey], ...invalidateKeys.map(k => [k])];

  function useList() {
    const { selectedClient } = useViewMode();
    return useQuery({
      queryKey: [queryKey, selectedClient?.id],
      queryFn: async () => {
        if (!selectedClient?.id) return [];
        const params = new URLSearchParams();
        params.set('client_id', selectedClient.id);
        if (filterActive) params.set(archiveColumn, String(activeValue));
        params.set('order', defaultOrder);
        const data = await api.get<unknown[]>(`${basePath}?${params.toString()}`);
        return data || [];
      },
      enabled: !!selectedClient?.id,
    });
  }

  function useArchived() {
    const { selectedClient } = useViewMode();
    return useQuery({
      queryKey: [queryKey, 'archived', selectedClient?.id],
      queryFn: async () => {
        if (!selectedClient?.id) return [];
        const params = new URLSearchParams();
        params.set('client_id', selectedClient.id);
        params.set(archiveColumn, String(archivedValue));
        params.set('order', defaultOrder);
        const data = await api.get<unknown[]>(`${basePath}?${params.toString()}`);
        return data || [];
      },
      enabled: !!selectedClient?.id,
    });
  }

  function useCreate() {
    const { selectedClient } = useViewMode();
    return useMutationWithToast({
      mutationFn: async (data: Record<string, unknown>) => {
        if (!selectedClient?.id) throw new Error('Aucun client sélectionné');
        const result = await api.post<unknown>(`${basePath}`, { ...data, client_id: selectedClient.id });
        return result;
      },
      invalidateKeys: allInvalidateKeys,
      successMessage: labels.created,
    });
  }

  function useUpdate() {
    return useMutationWithToast({
      mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
        const result = await api.patch<unknown>(`${basePath}/${id}`, data);
        return result;
      },
      invalidateKeys: allInvalidateKeys,
      successMessage: labels.updated,
    });
  }

  function useArchive() {
    return useMutationWithToast({
      mutationFn: async (id: string) => {
        await api.patch(`${basePath}/${id}`, { [archiveColumn]: archivedValue });
      },
      invalidateKeys: allInvalidateKeys,
      successMessage: labels.archived,
    });
  }

  function useRestore() {
    return useMutationWithToast({
      mutationFn: async (id: string) => {
        await api.patch(`${basePath}/${id}`, { [archiveColumn]: activeValue });
      },
      invalidateKeys: allInvalidateKeys,
      successMessage: labels.restored,
    });
  }

  function useDelete() {
    return useMutationWithToast({
      mutationFn: async (id: string) => {
        await api.delete(`${basePath}/${id}`);
      },
      invalidateKeys: allInvalidateKeys,
      successMessage: labels.deleted,
    });
  }

  return { useList, useArchived, useCreate, useUpdate, useArchive, useRestore, useDelete };
}
