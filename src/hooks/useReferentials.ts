import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { createCrudHooks } from './createCrudHooks';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

export type Referential = Tables<'referentials'>;
export type ReferentialValue = Tables<'referential_values'>;

const crud = createCrudHooks({
  tableName: 'referentials',
  queryKey: queryKeys.referentials.crudKey,
  defaultOrder: 'name',
});

// Standard CRUD via factory
export const useReferentials = crud.useList;
export const useArchivedReferentials = crud.useArchived;
export const useCreateReferential = crud.useCreate;
export const useUpdateReferential = crud.useUpdate;
export const useDeleteReferential = crud.useArchive; // soft-delete = archive
export const useRestoreReferential = crud.useRestore;

// Specific hooks not covered by factory

export function useReferentialWithValues(referentialId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.referentials.withValues(referentialId!),
    queryFn: async () => {
      if (!referentialId) return null;
      const [referential, values] = await Promise.all([
        api.get<Referential>(`/api/referentials/${referentialId}`),
        api.get<ReferentialValue[]>(`/api/referentials/${referentialId}/values`),
      ]);
      return { referential, values };
    },
    enabled: !!referentialId,
  });
}

// Referential Values mutations
export function useCreateReferentialValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async (data: TablesInsert<'referential_values'>) => {
      return await api.post<ReferentialValue>(
        '/api/referentials/values',
        data
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referentials.withValues(variables.referential_id) });
    },
  });
}

export function useUpdateReferentialValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: TablesUpdate<'referential_values'> & { id: string }) => {
      return await api.patch<ReferentialValue>(
        `/api/referentials/values/${id}`,
        data
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referentials.withValues(data.referential_id) });
    },
  });
}

export function useDeleteReferentialValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async ({ id, referentialId }: { id: string; referentialId: string }) => {
      await api.patch(`/api/referentials/values/${id}`, { is_active: false });
      return referentialId;
    },
    onSuccess: (referentialId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referentials.withValues(referentialId!) });
    },
  });
}

export function useRestoreReferentialValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async ({ id, referentialId }: { id: string; referentialId: string }) => {
      await api.patch(`/api/referentials/values/${id}`, { is_active: true });
      return referentialId;
    },
    onSuccess: (referentialId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referentials.withValues(referentialId!) });
    },
  });
}
