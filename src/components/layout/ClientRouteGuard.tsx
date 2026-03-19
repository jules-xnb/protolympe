import { useParams, Navigate, Outlet } from 'react-router-dom';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export function ClientRouteGuard() {
  const { clientId } = useParams<{ clientId: string }>();
  const {
    mode,
    selectedClient,
    availableClients,
    setSelectedClient,
    switchToIntegratorMode,
  } = useViewMode();

  const hasSynced = useRef(false);

  const urlClient = availableClients.find(c => c.id === clientId);

  // Sync URL client with context if different.
  // In user_final mode on refresh, wait for ViewModeContext to restore selectedClient
  // before syncing — calling setSelectedClient prematurely disrupts profile restoration.
  useEffect(() => {
    if (!urlClient || hasSynced.current) return;

    if (mode === 'user_final') {
      // Wait for context restore before deciding
      if (selectedClient) {
        hasSynced.current = true;
        if (urlClient.id !== selectedClient.id) {
          setSelectedClient(urlClient);
        }
        // else: already in sync, nothing to do
      }
      // selectedClient still null → ViewModeContext is restoring, wait
    } else {
      if (urlClient.id !== selectedClient?.id) {
        hasSynced.current = true;
        switchToIntegratorMode(urlClient);
      }
    }
  }, [urlClient, selectedClient, mode, setSelectedClient, switchToIntegratorMode]);

  // Reset sync flag when clientId changes
  useEffect(() => {
    hasSynced.current = false;
  }, [clientId]);

  // Clients still loading
  if (availableClients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid clientId -> redirect to clients list
  if (!urlClient) {
    return <Navigate to="/dashboard/admin/clients" replace />;
  }

  return <Outlet />;
}
