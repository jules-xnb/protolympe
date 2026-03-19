import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';

export interface TranslationRow {
  id: string;
  client_id: string;
  scope: string;
  key: string;
  language: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export function useClientTranslations() {
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id;

  return useQuery({
    queryKey: queryKeys.translations.byClient(clientId),
    queryFn: async () => {
      if (!clientId) return [];
      const data = await api.get<TranslationRow[]>(`/api/translations?client_id=${clientId}`);
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useUpsertTranslation() {
  const queryClient = useQueryClient();
  const { selectedClient } = useViewMode();

  return useMutation({
    mutationFn: async (row: { scope: string; key: string; language: string; value: string }) => {
      if (!selectedClient?.id) throw new Error('No client selected');
      // Use POST for upsert — the API handles conflict resolution
      await api.post('/api/translations', {
        client_id: selectedClient.id,
        ...row,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.translations.crudKey] });
    },
  });
}

export function useDeleteTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/translations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.translations.crudKey] });
    },
  });
}

export function useBulkUpsertTranslations() {
  const queryClient = useQueryClient();
  const { selectedClient } = useViewMode();

  return useMutation({
    mutationFn: async (rows: { scope: string; key: string; language: string; value: string }[]) => {
      if (!selectedClient?.id) throw new Error('No client selected');
      const now = new Date().toISOString();
      const payload = rows.map(r => ({ client_id: selectedClient.id, ...r, updated_at: now }));
      await api.post('/api/translations/batch', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.translations.crudKey] });
    },
  });
}
