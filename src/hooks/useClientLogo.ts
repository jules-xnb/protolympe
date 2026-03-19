import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';

// TODO: Logo upload/delete requires Supabase Storage which doesn't have a direct API equivalent.
// These hooks need a server-side endpoint that handles file upload to storage and
// persists the logo_url in the design config. For now, we route through an API endpoint.

// ---------------------------------------------------------------------------
// Upload logo — validates, uploads via API, persists URL in design config
// ---------------------------------------------------------------------------

export function useUploadClientLogo() {
  const { selectedClient } = useViewMode();

  return useMutationWithToast<string, File>({
    mutationFn: async (file) => {
      if (!selectedClient?.id) throw new Error('Aucun client sélectionné');

      const ALLOWED_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg'] as const;
      const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

      // Validate MIME type
      if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
        throw new Error('Format non supporté. Utilisez SVG, PNG ou JPEG.');
      }

      // Validate file size
      if (file.size > MAX_SIZE_BYTES) {
        throw new Error(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Taille max : 2 MB.`);
      }

      // Upload via multipart form data to a server endpoint
      const formData = new FormData();
      formData.append('file', file);
      formData.append('client_id', selectedClient.id);

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE}/api/design/upload-logo`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Erreur ${res.status}`);
      }

      const data = await res.json();
      return data.logo_url as string;
    },
    invalidateKeys: [queryKeys.clientDesignConfig.root(), queryKeys.clientDesignConfig.byClient(selectedClient?.id)],
    successMessage: 'Logo mis à jour',
  });
}

// ---------------------------------------------------------------------------
// Delete logo — removes from storage (best-effort) and clears logo_url in DB
// ---------------------------------------------------------------------------

export function useDeleteClientLogo() {
  const { selectedClient } = useViewMode();

  return useMutationWithToast<void, string | null>({
    mutationFn: async (_currentLogoUrl) => {
      if (!selectedClient?.id) throw new Error('Aucun client sélectionné');

      await api.post('/api/design/delete-logo', {
        client_id: selectedClient.id,
      });
    },
    invalidateKeys: [queryKeys.clientDesignConfig.root(), queryKeys.clientDesignConfig.byClient(selectedClient?.id)],
    successMessage: 'Logo supprimé',
  });
}
