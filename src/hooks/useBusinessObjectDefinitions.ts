import { useQuery } from '@tanstack/react-query';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface BusinessObjectDefinition {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  settings: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client_id: string | null;
}

export interface BusinessObjectDefinitionWithRelations extends BusinessObjectDefinition {
  _count?: {
    fields: number;
    objects: number;
  };
}

export function useBusinessObjectDefinitions() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.businessObjectDefinitions.all(selectedClient?.id),
    queryFn: () =>
      api.get<BusinessObjectDefinitionWithRelations[]>(
        `/api/business-object-definitions?client_id=${selectedClient!.id}`
      ),
    enabled: !!selectedClient?.id,
  });
}

export function useBusinessObjectDefinition(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.businessObjectDefinitions.detail(id!),
    queryFn: () =>
      api.get<BusinessObjectDefinitionWithRelations>(
        `/api/business-object-definitions/${id}`
      ),
    enabled: !!id,
  });
}

// Lightweight list of all BO definitions (id + name only, no client filter)
export function useBoDefinitionsList() {
  return useQuery({
    queryKey: queryKeys.businessObjectDefinitions.list(),
    queryFn: () =>
      api.get<{ id: string; name: string }[]>(
        '/api/business-object-definitions/list'
      ),
  });
}

export function useCreateBusinessObjectDefinition() {
  return useMutationWithToast({
    mutationFn: (data: {
      name: string;
      slug: string;
      description?: string | null;
      icon?: string;
      color?: string;
      client_id: string;
    }) => api.post<BusinessObjectDefinition>('/api/business-object-definitions', data),
    invalidateKeys: [queryKeys.businessObjectDefinitions.all()],
  });
}

export function useUpdateBusinessObjectDefinition() {
  return useMutationWithToast({
    mutationFn: ({ id, ...data }: { id: string; name?: string; slug?: string; description?: string | null; is_active?: boolean }) =>
      api.patch<BusinessObjectDefinition>(`/api/business-object-definitions/${id}`, data),
    invalidateKeys: [queryKeys.businessObjectDefinitions.all(), ['business_object_definition'] as const],
  });
}

export function useDeleteBusinessObjectDefinition() {
  return useMutationWithToast({
    mutationFn: (id: string) =>
      api.delete<{ success: boolean }>(`/api/business-object-definitions/${id}`),
    invalidateKeys: [queryKeys.businessObjectDefinitions.all()],
  });
}

// Archive = set is_active to false
export function useArchiveBusinessObjectDefinition() {
  return useMutationWithToast({
    mutationFn: (id: string) =>
      api.patch<BusinessObjectDefinition>(`/api/business-object-definitions/${id}`, { is_active: false }),
    invalidateKeys: [queryKeys.businessObjectDefinitions.all()],
  });
}

// Restore = set is_active to true
export function useRestoreBusinessObjectDefinition() {
  return useMutationWithToast({
    mutationFn: (id: string) =>
      api.patch<BusinessObjectDefinition>(`/api/business-object-definitions/${id}`, { is_active: true }),
    invalidateKeys: [queryKeys.businessObjectDefinitions.all()],
  });
}
