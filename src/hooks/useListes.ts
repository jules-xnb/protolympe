import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { createCrudHooks } from './createCrudHooks';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

export type Liste = Tables<'referentials'>;
export type ListeValue = Tables<'referential_values'>;

const crud = createCrudHooks({
  tableName: 'referentials',
  queryKey: queryKeys.listes.crudKey,
  defaultOrder: 'name',
});

// Standard CRUD via factory
export const useListes = crud.useList;
export const useArchivedListes = crud.useArchived;
export const useCreateListe = crud.useCreate;
export const useUpdateListe = crud.useUpdate;
export const useDeleteListe = crud.useArchive; // soft-delete = archive
export const useRestoreListe = crud.useRestore;

// Specific hooks not covered by factory

export function useListeWithValues(referentialId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.listes.withValues(referentialId!),
    queryFn: async () => {
      if (!referentialId) return null;
      const [referential, values] = await Promise.all([
        api.get<Liste>(`/api/referentials/${referentialId}`),
        api.get<ListeValue[]>(`/api/referentials/${referentialId}/values`),
      ]);
      return { referential, values };
    },
    enabled: !!referentialId,
  });
}

// Liste Values mutations
export function useCreateListeValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async (data: TablesInsert<'referential_values'>) => {
      return await api.post<ListeValue>(
        '/api/referentials/values',
        data
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listes.withValues(variables.referential_id) });
    },
  });
}

export function useUpdateListeValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: TablesUpdate<'referential_values'> & { id: string }) => {
      return await api.patch<ListeValue>(
        `/api/referentials/values/${id}`,
        data
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listes.withValues(data.referential_id) });
    },
  });
}

export function useDeleteListeValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async ({ id, referentialId }: { id: string; referentialId: string }) => {
      await api.patch(`/api/referentials/values/${id}`, { is_active: false });
      return referentialId;
    },
    onSuccess: (referentialId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listes.withValues(referentialId!) });
    },
  });
}

export function useRestoreListeValue() {
  const queryClient = useQueryClient();
  return useMutationWithToast({
    mutationFn: async ({ id, referentialId }: { id: string; referentialId: string }) => {
      await api.patch(`/api/referentials/values/${id}`, { is_active: true });
      return referentialId;
    },
    onSuccess: (referentialId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listes.withValues(referentialId!) });
    },
  });
}
