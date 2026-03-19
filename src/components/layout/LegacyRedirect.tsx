import { Navigate, useLocation } from 'react-router-dom';
import { useViewMode } from '@/contexts/ViewModeContext';

/**
 * Redirects old URLs without clientId to the new format.
 * e.g. /dashboard/modules -> /dashboard/{clientId}/modules
 */
export function LegacyRedirect({ base }: { base: string }) {
  const { selectedClient } = useViewMode();
  const location = useLocation();

  if (!selectedClient) {
    return <Navigate to="/dashboard/admin/clients" replace />;
  }

  const remainingPath = location.pathname.replace(`/dashboard/${base}`, '');
  return <Navigate to={`/dashboard/${selectedClient.id}/${base}${remainingPath}`} replace />;
}
