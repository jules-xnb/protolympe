import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useComputedViewPermissions } from '@/hooks/useViewPermissions';
import { useAuth } from '@/hooks/useAuth';
import { useUserNavigationConfigs } from '@/hooks/useUserNavigationConfigs';
import { DynamicDashboard } from '@/components/user/views/DynamicDashboard';
import { DynamicListView } from '@/components/user/views/DynamicListView';
import { DynamicFormView } from '@/components/user/views/DynamicFormView';
import { DynamicPageView } from '@/components/user/views/DynamicPageView';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Lock, LayoutDashboard } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ViewConfig, ViewConfigWidget } from '@/hooks/useViewConfigs';
import type { PageBuilderConfig } from '@/components/builder/page-builder/types';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

export default function DynamicViewPage() {
  const { t } = useT();
  const { viewSlug, eoId } = useParams<{ viewSlug: string; eoId: string }>();
  const { selectedClient, mode } = useViewMode();
  const { user } = useAuth();
  const { data: navConfigs, isLoading: navLoading } = useUserNavigationConfigs();

  // Fetch view config by slug
  const { data: viewConfig, isLoading, error } = useQuery<ViewConfig | null>({
    queryKey: queryKeys.viewConfigs.bySlug(viewSlug!, selectedClient?.id),
    queryFn: async () => {
      if (!viewSlug || !selectedClient) return null;
      try {
        return await api.get<ViewConfig>(`/api/view-configs/by-slug/${viewSlug}?client_id=${selectedClient.id}`);
      } catch {
        return null;
      }
    },
    enabled: !!viewSlug && !!selectedClient,
  });

  // Fetch widgets for dashboard views
  const { data: widgets = [] } = useQuery<ViewConfigWidget[]>({
    queryKey: queryKeys.viewConfigs.viewWidgets(viewConfig?.id),
    queryFn: async () => {
      if (!viewConfig?.id) return [];
      return api.get<ViewConfigWidget[]>(`/api/view-configs/${viewConfig.id}/widgets?is_active=true&order=display_order`);
    },
    enabled: !!viewConfig?.id && viewConfig?.type === 'dashboard',
  });

  // Compute user permissions for this view
  const { data: permissions, isLoading: permissionsLoading } = useComputedViewPermissions(
    viewConfig?.id,
    user?.id
  );

  // In user_final mode, verify the view is in the user's navigation
  const isInNavigation = (() => {
    if (mode !== 'user_final' || !navConfigs || !viewConfig) return true;
    const collectViewIds = (items: typeof navConfigs): Set<string> => {
      const ids = new Set<string>();
      for (const item of items) {
        if (item.view_config_id) ids.add(item.view_config_id);
        if (item.children?.length) {
          for (const id of collectViewIds(item.children)) ids.add(id);
        }
      }
      return ids;
    };
    return collectViewIds(navConfigs).has(viewConfig.id);
  })();

  // Loading state
  if (isLoading || permissionsLoading || (mode === 'user_final' && navLoading)) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errors.generic')}</AlertTitle>
        <AlertDescription>
          {t('views.load_view_error')}
        </AlertDescription>
      </Alert>
    );
  }

  // Not found
  if (!viewConfig) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="text-center py-12">
          <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold mb-2">{t('views.view_not_found')}</h2>
          <p className="text-muted-foreground">
            {t('views.view_not_found_description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // In user_final mode, block access to views not in the user's navigation
  if (!isInNavigation) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="text-center py-12">
          <Lock className="h-12 w-12 mx-auto mb-4 text-destructive/50" />
          <h2 className="text-lg font-semibold mb-2">{t('views.access_denied')}</h2>
          <p className="text-muted-foreground">
            {t('views.no_permission')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Permission denied - only block if explicitly denied (can_view === false)
  // If permissions are null (no view_permissions configured), allow access (fallback to nav permissions)
  if (permissions !== null && permissions?.can_view === false) {
    return (
      <Card className="max-w-lg mx-auto mt-12">
        <CardContent className="text-center py-12">
          <Lock className="h-12 w-12 mx-auto mb-4 text-destructive/50" />
          <h2 className="text-lg font-semibold mb-2">{t('views.access_denied')}</h2>
          <p className="text-muted-foreground">
            {t('views.no_permission')}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Check if view uses Page Builder (has blocks in config)
  const pageBuilderConfig = viewConfig.config as PageBuilderConfig | null;
  const hasPageBuilderBlocks = pageBuilderConfig?.blocks && pageBuilderConfig.blocks.length > 0;

  // If view has Page Builder blocks, use DynamicPageView regardless of type
  if (hasPageBuilderBlocks) {
    return <DynamicPageView viewId={viewConfig.id} eoId={eoId} />;
  }

  // Render based on view type (legacy widget-based dashboards)
  switch (viewConfig.type) {
    case 'dashboard':
      return <DynamicDashboard viewConfig={viewConfig} widgets={widgets} />;
    case 'list':
      return <DynamicListView viewConfig={viewConfig} />;
    case 'detail':
      // Detail view requires an itemId - needs to be accessed via a different route
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('views.detail_view')}</AlertTitle>
          <AlertDescription>
            {t('views.detail_view_requires_item')}
          </AlertDescription>
        </Alert>
      );
    case 'form':
      // Form view requires context (create/edit mode with optional itemId)
      return <DynamicFormView viewConfig={viewConfig} />;
    default:
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('views.unsupported_view_type')}</AlertTitle>
          <AlertDescription>
            {t('views.view_type_not_implemented')}
          </AlertDescription>
        </Alert>
      );
  }
}
