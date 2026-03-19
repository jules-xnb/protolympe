import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface BoFieldDefinition {
  id: string;
  name: string;
  slug: string;
  field_type: string;
  is_required: boolean;
  is_readonly: boolean;
  description: string | null;
  display_order: number;
  referential_id: string | null;
  reference_object_definition_id: string | null;
  calculation_formula?: string | null;
  settings?: Record<string, unknown> | null;
}

export function useBoFieldDefinitions(boDefinitionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.boFieldDefinitions.byDefinition(boDefinitionId!),
    queryFn: async () => {
      if (!boDefinitionId) return [];
      const data = await api.get<BoFieldDefinition[]>(
        `/api/business-objects/definitions/${boDefinitionId}/fields?is_active=true`
      );
      return data || [];
    },
    enabled: !!boDefinitionId,
  });
}
