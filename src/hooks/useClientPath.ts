import { useViewMode } from '@/contexts/ViewModeContext';

/**
 * Returns a function that prefixes a relative dashboard path
 * with the current client ID when in integrator or user_final mode.
 *
 * Usage:
 *   const cp = useClientPath();
 *   navigate(cp('/business-objects'));
 *   // => /dashboard/{clientId}/business-objects
 */
export function useClientPath() {
  const { selectedClient, mode } = useViewMode();

  return (relativePath: string): string => {
    if (mode === 'admin' || !selectedClient) {
      return `/dashboard${relativePath}`;
    }
    return `/dashboard/${selectedClient.id}${relativePath}`;
  };
}
