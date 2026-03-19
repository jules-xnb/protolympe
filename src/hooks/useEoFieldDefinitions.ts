import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

// Re-export mutations for backward compatibility
export {
  useCreateEoFieldDefinition,
  useUpdateEoFieldDefinition,
  useArchiveEoFieldDefinition,
  useRestoreEoFieldDefinition,
  useArchivedEoFieldDefinitions,
  useReorderEoFieldDefinitions,
  useUpsertEoFieldValue,
} from './useEoFieldMutations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of EoFieldDefinition.settings — varies by field_type */
export interface EoFieldSettings {
  referential_id?: string;
  comment_rules?: {
    enabled?: boolean;
    required?: boolean;
    transitions?: Array<{ from: string; to: string; comment_required?: boolean }>;
    [key: string]: unknown;
  };
  auto_generate?: {
    enabled: boolean;
    mode: string;
    config: Record<string, unknown>;
  };
  format?: {
    type: string;
    length?: number;
  };
  boolean_labels?: { true_label: string; false_label: string };
  is_system_field?: boolean;
  initials_config?: Record<string, unknown>;
  [key: string]: unknown; // Allow other properties
}

/** Shape of EoFieldDefinition.validation_rules */
export interface EoValidationRules {
  required?: boolean;
  max_length?: number;
  cross_field_rules?: Array<{
    type: string;
    target_field_id: string;
    message?: string;
  }>;
  [key: string]: unknown;
}

/** Shape of an option entry in EoFieldDefinition.options */
export type EoFieldOption = string | { value: string; label: string };

export interface EoFieldDefinition {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  description: string | null;
  field_type: string;
  is_required: boolean;
  is_unique: boolean;
  is_active: boolean;
  display_order: number;
  default_value: unknown;
  options: EoFieldOption[];
  validation_rules: EoValidationRules | null;
  settings: EoFieldSettings | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EoFieldDefinitionInsert {
  client_id: string;
  name: string;
  slug: string;
  description?: string | null;
  field_type?: string;
  is_required?: boolean;
  is_unique?: boolean;
  is_active?: boolean;
  display_order?: number;
  default_value?: unknown;
  options?: EoFieldOption[];
  validation_rules?: EoValidationRules;
  settings?: EoFieldSettings;
}

export interface EoFieldDefinitionUpdate {
  id: string;
  name?: string;
  slug?: string;
  description?: string | null;
  field_type?: string;
  is_required?: boolean;
  is_unique?: boolean;
  is_active?: boolean;
  display_order?: number;
  default_value?: unknown;
  options?: EoFieldOption[];
  validation_rules?: EoValidationRules;
  settings?: EoFieldSettings;
}

// Field values
export interface EoFieldValue {
  id: string;
  eo_id: string;
  field_definition_id: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useEoFieldDefinitions(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.eoFieldDefinitions.byClient(clientId!),
    queryFn: async () => {
      if (!clientId) return [];

      return await api.get<EoFieldDefinition[]>(
        `/api/organizational-entities/fields?client_id=${clientId}`
      );
    },
    enabled: !!clientId,
  });
}

export function useEoFieldValues(eoId?: string) {
  return useQuery({
    queryKey: queryKeys.eoFieldDefinitions.values(eoId),
    queryFn: async () => {
      if (!eoId) return [];

      return await api.get<(EoFieldValue & { eo_field_definitions: EoFieldDefinition })[]>(
        `/api/organizational-entities/${eoId}/values`
      );
    },
    enabled: !!eoId,
  });
}

// Fetch all field values for all entities of a client (batch)
export function useAllEoFieldValues(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.eoFieldDefinitions.valuesAll(clientId),
    queryFn: async () => {
      if (!clientId) return [];

      // The API should handle returning all values for a client's field definitions
      const fieldDefs = await api.get<{ id: string }[]>(
        `/api/organizational-entities/fields?client_id=${clientId}`
      );

      if (!fieldDefs || fieldDefs.length === 0) return [];

      // Fetch all values for all entities of this client via the API
      // We get all entities first, then fetch values for each
      const entities = await api.get<{ id: string }[]>(
        `/api/organizational-entities?client_id=${clientId}`
      );

      if (!entities || entities.length === 0) return [];

      // Fetch values for all entities in parallel (batched)
      const allValues: EoFieldValue[] = [];
      const batchSize = 10;
      for (let i = 0; i < entities.length; i += batchSize) {
        const batch = entities.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(eo => api.get<EoFieldValue[]>(`/api/organizational-entities/${eo.id}/values`))
        );
        for (const values of results) {
          allValues.push(...values);
        }
      }

      return allValues;
    },
    enabled: !!clientId,
  });
}

// ---------------------------------------------------------------------------
// System fields queries + ensure mutations (kept here due to hook deps)
// ---------------------------------------------------------------------------

export function useEoSystemNameField(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.eoFieldDefinitions.systemNameField(clientId!),
    queryFn: async () => {
      if (!clientId) return null;

      // Fetch all fields and find the system name field
      const fields = await api.get<EoFieldDefinition[]>(
        `/api/organizational-entities/fields?client_id=${clientId}`
      );

      return fields.find(f => f.slug === '__system_name') ?? null;
    },
    enabled: !!clientId,
  });
}

export function useEnsureSystemNameField(clientId?: string) {
  const { data: existingField, isLoading } = useEoSystemNameField(clientId);

  return useMutationWithToast({
    mutationFn: async () => {
      if (!clientId || existingField || isLoading) return existingField;

      // Check again to avoid race conditions
      const fields = await api.get<EoFieldDefinition[]>(
        `/api/organizational-entities/fields?client_id=${clientId}`
      );
      const check = fields.find(f => f.slug === '__system_name');
      if (check) return check;

      return await api.post<EoFieldDefinition>(
        '/api/organizational-entities/fields',
        {
          client_id: clientId,
          name: 'Nom',
          slug: '__system_name',
          field_type: 'text',
          is_required: true,
          is_unique: false,
          is_active: true,
          display_order: -1,
          settings: { is_system_field: true },
        }
      );
    },
    invalidateKeys: [queryKeys.eoFieldDefinitions.systemNameField("")],
  });
}

export function useEoSystemIsActiveField(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.eoFieldDefinitions.systemIsActiveField(clientId!),
    queryFn: async () => {
      if (!clientId) return null;

      const fields = await api.get<EoFieldDefinition[]>(
        `/api/organizational-entities/fields?client_id=${clientId}`
      );

      return fields.find(f => f.slug === '__system_is_active') ?? null;
    },
    enabled: !!clientId,
  });
}

export function useEnsureSystemIsActiveField(clientId?: string) {
  const { data: existingField, isLoading } = useEoSystemIsActiveField(clientId);

  return useMutationWithToast({
    mutationFn: async () => {
      if (!clientId || existingField || isLoading) return existingField;

      const fields = await api.get<EoFieldDefinition[]>(
        `/api/organizational-entities/fields?client_id=${clientId}`
      );
      const check = fields.find(f => f.slug === '__system_is_active');
      if (check) return check;

      return await api.post<EoFieldDefinition>(
        '/api/organizational-entities/fields',
        {
          client_id: clientId,
          name: 'Statut actif',
          slug: '__system_is_active',
          field_type: 'checkbox',
          is_required: true,
          is_unique: false,
          is_active: true,
          display_order: -2,
          default_value: 'true',
          settings: { is_system_field: true, boolean_labels: { true_label: 'Actif', false_label: 'Inactif' } },
        }
      );
    },
    invalidateKeys: [queryKeys.eoFieldDefinitions.systemIsActiveField("")],
  });
}
