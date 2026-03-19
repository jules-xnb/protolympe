import { useQuery } from '@tanstack/react-query';
import type { FieldDefinitionWithRelations } from './useFieldDefinitions';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

/**
 * Fetch field definitions for multiple business object definitions.
 * Returns a flat array of all fields with their BO definition info.
 */
export function useMultipleFieldDefinitions(boDefinitionIds: string[] | undefined) {
  return useQuery({
    queryKey: queryKeys.fieldDefinitions.multiple(boDefinitionIds!),
    queryFn: async () => {
      if (!boDefinitionIds || boDefinitionIds.length === 0) return [];

      const fieldsWithRelations = await api.post<(FieldDefinitionWithRelations & { bo_name: string })[]>(
        '/api/business-objects/fields/multiple',
        { definition_ids: boDefinitionIds }
      );

      return fieldsWithRelations || [];
    },
    enabled: !!boDefinitionIds && boDefinitionIds.length > 0,
  });
}
