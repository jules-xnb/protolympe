import { useQuery } from '@tanstack/react-query';
import type { TablesInsert, TablesUpdate } from '@/types/database';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { createCrudHooks } from './createCrudHooks';
import { buildTree, flattenTree } from '@/lib/tree-utils';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface FieldDefinition {
  id: string;
  object_definition_id: string;
  name: string;
  slug: string;
  field_type: string;
  description: string | null;
  placeholder: string | null;
  display_order: number;
  is_required: boolean;
  is_readonly: boolean;
  is_hidden: boolean;
  is_active: boolean;
  is_system: boolean;
  default_value: unknown;
  validation_rules: unknown;
  referential_id: string | null;
  reference_object_definition_id: string | null;
  calculation_formula: string | null;
  visibility_conditions: unknown;
  settings: unknown;
  parent_field_id: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface FieldDefinitionWithRelations extends FieldDefinition {
  referential?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  reference_object_definition?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  children?: FieldDefinitionWithRelations[];
  depth?: number;
}

export function useFieldDefinitions(objectDefinitionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.fieldDefinitions.byObject(objectDefinitionId!),
    queryFn: async () => {
      if (!objectDefinitionId) return [];

      // Fetch field definitions with relations from API
      const fields = await api.get<FieldDefinitionWithRelations[]>(
        `/api/business-objects/definitions/${objectDefinitionId}/fields`
      );

      if (!fields || fields.length === 0) return [];

      // Build hierarchical structure and flatten with depth for display
      const tree = buildTree(fields, { parentKey: 'parent_field_id' });
      return flattenTree(tree);
    },
    enabled: !!objectDefinitionId,
  });
}

export function useCreateFieldDefinition() {
  return useMutationWithToast({
    mutationFn: async (data: TablesInsert<'field_definitions'>) => {
      const result = await api.post<FieldDefinition>(
        `/api/business-objects/definitions/${data.object_definition_id}/fields`,
        data
      );
      return result;
    },
    invalidateKeys: [queryKeys.fieldDefinitions.byObject(""), queryKeys.businessObjectDefinitions.all()],
  });
}

export function useUpdateFieldDefinition() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...data }: TablesUpdate<'field_definitions'> & { id: string }) => {
      const result = await api.patch<FieldDefinition>(
        `/api/business-objects/fields/${id}`,
        data
      );
      return result;
    },
    invalidateKeys: [queryKeys.fieldDefinitions.byObject(""), queryKeys.businessObjectDefinitions.all()],
  });
}

export function useDuplicateFieldDefinitions() {
  return useMutationWithToast({
    mutationFn: async ({ sourceDefId, targetDefId }: { sourceDefId: string; targetDefId: string }) => {
      await api.post(`/api/business-objects/definitions/${targetDefId}/fields/duplicate`, {
        source_definition_id: sourceDefId,
      });
    },
    invalidateKeys: [queryKeys.fieldDefinitions.byObject(""), queryKeys.businessObjectDefinitions.all()],
  });
}

// Archive/restore/delete via factory
const fieldDefCrud = createCrudHooks({
  tableName: 'field_definitions',
  queryKey: queryKeys.fieldDefinitions.crudKey,
  defaultOrder: 'display_order',
  invalidateKeys: queryKeys.businessObjectDefinitions.all(),
});

export const useArchiveFieldDefinition = fieldDefCrud.useArchive;
export const useRestoreFieldDefinition = fieldDefCrud.useRestore;
export const useDeleteFieldDefinition = fieldDefCrud.useDelete;

// Custom archived query — filters by objectDefinitionId, not client_id
export function useArchivedFieldDefinitions(objectDefinitionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.fieldDefinitions.archived(objectDefinitionId!),
    queryFn: async () => {
      if (!objectDefinitionId) return [];

      const data = await api.get<FieldDefinition[]>(
        `/api/business-objects/definitions/${objectDefinitionId}/fields?is_active=false`
      );

      return data || [];
    },
    enabled: !!objectDefinitionId,
  });
}
