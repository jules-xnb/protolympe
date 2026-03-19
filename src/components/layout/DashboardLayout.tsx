import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { Loader2, Menu } from 'lucide-react';

function DashboardLayoutContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden relative">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Mobile header with hamburger */}
          <header className="flex items-center h-12 border-b px-4 md:hidden shrink-0">
            <SidebarTrigger className="h-8 w-8">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <span className="ml-3 font-semibold text-sm">Olympe</span>
          </header>
          {/* Main content */}
          <main className="flex-1 overflow-auto px-3 pt-3 pb-4 sm:px-4 sm:pt-4 sm:pb-6 lg:px-6 lg:pt-6 lg:pb-6 has-[.full-bleed]:!p-0 has-[.full-bleed]:!overflow-hidden min-h-0">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

import { ViewModeProvider } from '@/contexts/ViewModeContext';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';

export function DashboardLayout() {
  return (
    <ViewModeProvider>
      <BreadcrumbProvider>
        <DashboardLayoutContent />
      </BreadcrumbProvider>
    </ViewModeProvider>
  );
}
