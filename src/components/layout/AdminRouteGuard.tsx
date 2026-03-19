import { Outlet } from 'react-router-dom';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useEffect } from 'react';

export function AdminRouteGuard() {
  const { mode, switchToAdminMode } = useViewMode();

  useEffect(() => {
    if (mode !== 'admin') {
      switchToAdminMode();
    }
  }, [mode, switchToAdminMode]);

  return <Outlet />;
}
