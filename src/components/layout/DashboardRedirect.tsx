import { Navigate } from 'react-router-dom';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Loader2 } from 'lucide-react';

export function DashboardRedirect() {
  const {
    mode,
    isAdminLoading,
    selectedClient,
  } = useViewMode();

  // Wait for admin status to be determined
  if (isAdminLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Admin/platform mode or no client selected → go to clients list
  if (mode === 'admin' || !selectedClient) {
    return <Navigate to="/dashboard/admin/clients" replace />;
  }

  // Integrator mode with client → go to navigation
  if (mode === 'integrator' && selectedClient) {
    return <Navigate to={`/dashboard/${selectedClient.id}/modules`} replace />;
  }

  // User final mode → go to user simulation config
  if (mode === 'user_final' && selectedClient) {
    return <Navigate to={`/dashboard/${selectedClient.id}/user/simulation-config`} replace />;
  }

  // Default fallback
  return <Navigate to="/dashboard/admin/clients" replace />;
}
