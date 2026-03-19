import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { getTextOnColor, isValidHex, DEFAULT_DESIGN_CONFIG } from '@/lib/design/color-utils';
import type { Tables } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

export type ClientDesignConfig = Tables<'client_design_configs'>;

export type ClientDesignConfigInput = {
  primary_color: string;
  secondary_color: string;
  border_radius: number;
  font_family: string;
  app_name?: string | null;
};



// ---------------------------------------------------------------------------
// Fetch design config for a specific client (used in user-final theme loading)
// ---------------------------------------------------------------------------

export function useClientDesignConfig(clientId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.clientDesignConfig.byClient(clientId!),
    queryFn: async () => {
      if (!clientId) return null;
      const data = await api.get<ClientDesignConfig[]>(`/api/design?client_id=${clientId}`);
      return data?.[0] ?? null;
    },
    enabled: !!clientId,
  });
}

// ---------------------------------------------------------------------------
// Hook for the integrator design page — scoped to the selected client
// ---------------------------------------------------------------------------

export function useCurrentClientDesignConfig() {
  const { selectedClient } = useViewMode();
  return useClientDesignConfig(selectedClient?.id);
}

// ---------------------------------------------------------------------------
// Upsert design config (create or update)
// ---------------------------------------------------------------------------

export function useUpsertClientDesignConfig() {
  const { selectedClient } = useViewMode();

  return useMutationWithToast<ClientDesignConfig, ClientDesignConfigInput>({
    mutationFn: async (input) => {
      if (!selectedClient?.id) throw new Error('Aucun client sélectionné');

      // Validate colors
      if (!isValidHex(input.primary_color)) {
        throw new Error('Couleur primaire invalide (format #RRGGBB attendu)');
      }
      if (!isValidHex(input.secondary_color)) {
        throw new Error('Couleur secondaire invalide (format #RRGGBB attendu)');
      }

      // Validate border radius
      if (input.border_radius < 0 || input.border_radius > 9999) {
        throw new Error('Border radius doit être entre 0 et 9999');
      }

      // Compute text_on_primary and text_on_secondary (source of truth)
      const text_on_primary = getTextOnColor(input.primary_color);
      const text_on_secondary = getTextOnColor(input.secondary_color);

      const payload = {
        client_id: selectedClient.id,
        primary_color: input.primary_color,
        secondary_color: input.secondary_color,
        text_on_primary,
        text_on_secondary,
        border_radius: input.border_radius,
        font_family: input.font_family,
        app_name: input.app_name ?? null,
      };

      // Try to get existing config first
      const existing = await api.get<ClientDesignConfig[]>(`/api/design?client_id=${selectedClient.id}`);

      if (existing && existing.length > 0) {
        const data = await api.patch<ClientDesignConfig>(`/api/design/${existing[0].id}`, payload);
        return data;
      } else {
        const data = await api.post<ClientDesignConfig>('/api/design', payload);
        return data;
      }
    },
    invalidateKeys: [queryKeys.clientDesignConfig.root(), queryKeys.clientDesignConfig.byClient(selectedClient?.id)],
    successMessage: 'Configuration design sauvegardée',
  });
}

// ---------------------------------------------------------------------------
// Helper: get effective design config (falls back to defaults if none saved)
// ---------------------------------------------------------------------------

export function getEffectiveDesignConfig(config: ClientDesignConfig | null | undefined) {
  return {
    primary_color: config?.primary_color ?? DEFAULT_DESIGN_CONFIG.primary_color,
    secondary_color: config?.secondary_color ?? DEFAULT_DESIGN_CONFIG.secondary_color,
    text_on_primary: config?.text_on_primary ?? DEFAULT_DESIGN_CONFIG.text_on_primary,
    text_on_secondary: config?.text_on_secondary ?? DEFAULT_DESIGN_CONFIG.text_on_secondary,
    border_radius: config?.border_radius ?? DEFAULT_DESIGN_CONFIG.border_radius,
    font_family: config?.font_family ?? DEFAULT_DESIGN_CONFIG.font_family,
    logo_url: config?.logo_url ?? null,
    app_name: config?.app_name ?? null,
  };
}
