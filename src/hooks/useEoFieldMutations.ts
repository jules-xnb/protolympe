import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { backfillFieldValues } from '@/lib/eo/eo-backfill';
import { getAutoGenerateConfig } from '@/lib/eo/eo-auto-generate';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { createCrudHooks } from './createCrudHooks';
import type { EoFieldDefinition, EoFieldDefinitionInsert, EoFieldDefinitionUpdate, EoFieldValue } from './useEoFieldDefinitions';
import { queryKeys } from '@/lib/query-keys';

// ---------------------------------------------------------------------------
// CRUD Mutations
// ---------------------------------------------------------------------------

export function useCreateEoFieldDefinition() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: async (data: EoFieldDefinitionInsert) => {
      return await api.post<EoFieldDefinition>(
        '/api/organizational-entities/fields',
        data
      );
    },
    invalidateKeys: [queryKeys.eoFieldDefinitions.byClient("")],
    successMessage: 'Champ créé avec succès',
    onSuccess: async (result) => {
      // Backfill existing EOs if the field is required and has a default or auto-generate
      if (result.is_required && (result.default_value != null || getAutoGenerateConfig(result.settings))) {
        try {
          const count = await backfillFieldValues(
            result.client_id,
            result.id,
            result.default_value,
            (result.settings || {}) as Record<string, unknown>,
          );
          if (count > 0) {
            toast.success(`${count} entité(s) mise(s) à jour avec la valeur par défaut`);
            queryClient.invalidateQueries({ queryKey: queryKeys.eoFieldDefinitions.values() });
            queryClient.invalidateQueries({ queryKey: queryKeys.eoFieldDefinitions.valuesAll() });
          }
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          console.error('[backfill] Error:', e);
          toast.error(`Erreur lors du remplissage automatique: ${message}`);
        }
      }
    },
  });
}

export function useUpdateEoFieldDefinition() {
  const queryClient = useQueryClient();

  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: EoFieldDefinitionUpdate) => {
      return await api.patch<EoFieldDefinition>(
        `/api/organizational-entities/fields/${id}`,
        data
      );
    },
    invalidateKeys: [queryKeys.eoFieldDefinitions.byClient(""), queryKeys.eoFieldDefinitions.systemNameField(""), queryKeys.eoFieldDefinitions.systemIsActiveField("")],
    successMessage: 'Champ mis à jour avec succès',
    onSuccess: async (result) => {
      // Backfill if field became required with default/auto-generate
      if (result.is_required && (result.default_value != null || getAutoGenerateConfig(result.settings))) {
        try {
          const count = await backfillFieldValues(
            result.client_id,
            result.id,
            result.default_value,
            (result.settings || {}) as Record<string, unknown>,
          );
          if (count > 0) {
            toast.success(`${count} entité(s) mise(s) à jour avec la valeur par défaut`);
            queryClient.invalidateQueries({ queryKey: queryKeys.eoFieldDefinitions.values() });
            queryClient.invalidateQueries({ queryKey: queryKeys.eoFieldDefinitions.valuesAll() });
          }
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          console.error('[backfill] Error:', e);
          toast.error(`Erreur lors du remplissage automatique: ${message}`);
        }
      }
    },
  });
}

// Archive/restore via factory
const eoFieldCrud = createCrudHooks({
  tableName: 'eo_field_definitions',
  queryKey: queryKeys.eoFieldDefinitions.crudKey,
  defaultOrder: 'display_order',
  labels: {
    archived: 'Champ archivé avec succès',
    restored: 'Champ restauré avec succès',
  },
});

export const useArchiveEoFieldDefinition = eoFieldCrud.useArchive;
export const useRestoreEoFieldDefinition = eoFieldCrud.useRestore;
export const useArchivedEoFieldDefinitions = eoFieldCrud.useArchived;

export function useReorderEoFieldDefinitions() {
  return useMutationWithToast({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        api.patch(`/api/organizational-entities/fields/${id}`, { display_order: index })
      );
      await Promise.all(updates);
    },
    invalidateKeys: [queryKeys.eoFieldDefinitions.byClient("")],
  });
}

export function useUpsertEoFieldValue() {
  return useMutationWithToast({
    mutationFn: async (data: { eo_id: string; field_definition_id: string; value: unknown }) => {
      return await api.post<EoFieldValue>(
        '/api/organizational-entities/values',
        data
      );
    },
    invalidateKeys: [queryKeys.eoFieldDefinitions.values(), queryKeys.eoPagination.customFieldValues([], []), queryKeys.eoPagination.sortFieldValues("", [])],
  });
}
