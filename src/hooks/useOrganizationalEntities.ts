import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Tables, TablesInsert, TablesUpdate } from '@/types/database';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

export type OrganizationalEntity = Tables<'organizational_entities'>;
export type OrganizationalEntityInsert = TablesInsert<'organizational_entities'>;
export type OrganizationalEntityUpdate = TablesUpdate<'organizational_entities'>;

export type OrganizationalEntityWithClient = OrganizationalEntity & {
  clients: { name: string } | null;
  parent: { name: string }[] | null;
};

export function useOrganizationalEntities(clientId?: string) {
  return useQuery({
    queryKey: queryKeys.organizationalEntities.byClient(clientId!),
    queryFn: async () => {
      if (!clientId) return [];

      const entities = await api.get<OrganizationalEntityWithClient[]>(
        `/api/organizational-entities?client_id=${clientId}`
      );

      const nameById = new Map(entities.map((e) => [e.id, e.name] as const));

      return entities.map((e) => {
        const parentName = e.parent_id ? nameById.get(e.parent_id) : undefined;
        return {
          ...e,
          parent: parentName ? [{ name: parentName }] : null,
        };
      });
    },
    enabled: !!clientId,
  });
}

export function useOrganizationalEntity(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizationalEntities.detail(id!),
    queryFn: async () => {
      if (!id) return null;
      const data = await api.get<OrganizationalEntityWithClient>(
        `/api/organizational-entities/${id}`
      );
      return { ...data, parent: null };
    },
    enabled: !!id,
  });
}

export function useCreateOrganizationalEntity() {
  return useMutationWithToast({
    mutationFn: async (entity: OrganizationalEntityInsert) => {
      return await api.post<OrganizationalEntity>(
        '/api/organizational-entities',
        entity
      );
    },
    invalidateKeys: [queryKeys.organizationalEntities.root()],
    successMessage: 'Entité créée avec succès',
  });
}

export function useUpdateOrganizationalEntity() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...updates }: OrganizationalEntityUpdate & { id: string }) => {
      return await api.patch<OrganizationalEntity>(
        `/api/organizational-entities/${id}`,
        updates
      );
    },
    invalidateKeys: [
      queryKeys.organizationalEntities.root(),
      queryKeys.organizationalEntities.userEos(),
      queryKeys.organizationalEntities.forDrawer(""),
      ['user_organizational_entities'],
      ['user_eo_descendants'],
      [...queryKeys.organizationalEntities.root(), 'archived'],
      queryKeys.profileTemplates.byClient(""),
    ],
    successMessage: 'Entité mise à jour avec succès',
  });
}

export function useArchivedOrganizationalEntities(clientId?: string) {
  return useQuery({
    queryKey: [...queryKeys.organizationalEntities.byClient(clientId!), 'archived'],
    queryFn: async () => {
      if (!clientId) return [];
      // The API returns all entities for the client; we filter archived on the backend
      // For now, use the same endpoint and filter — backend should support ?is_archived=true
      const entities = await api.get<OrganizationalEntityWithClient[]>(
        `/api/organizational-entities?client_id=${clientId}&is_archived=true`
      );
      const nameById = new Map(entities.map((e) => [e.id, e.name] as const));
      return entities.map((e) => ({
        ...e,
        parent: e.parent_id && nameById.get(e.parent_id) ? [{ name: nameById.get(e.parent_id)! }] : null,
      }));
    },
    enabled: !!clientId,
  });
}

export function useDeleteOrganizationalEntity() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/organizational-entities/${id}`);
    },
    invalidateKeys: [queryKeys.organizationalEntities.root()],
    successMessage: 'Entité supprimée avec succès',
  });
}
