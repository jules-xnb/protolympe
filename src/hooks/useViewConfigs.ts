import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';
import type { Database, Json } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

type ViewType = Database['public']['Enums']['view_type'];
type WidgetType = Database['public']['Enums']['widget_type'];

export interface ViewConfig {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ViewType;
  bo_definition_id: string | null;
  config: Json;
  is_default: boolean;
  is_active: boolean;
  is_published: boolean;
  published_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ViewConfigWidget {
  id: string;
  view_config_id: string;
  widget_type: WidgetType;
  title: string | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: Json;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ViewConfigInsert {
  client_id: string;
  name: string;
  slug: string;
  description?: string;
  type?: ViewType;
  bo_definition_id?: string | null;
  config?: Json;
  is_default?: boolean;
  is_active?: boolean;
  display_order?: number;
}

export interface ViewConfigUpdate {
  name?: string;
  slug?: string;
  description?: string;
  type?: ViewType;
  bo_definition_id?: string | null;
  config?: Json;
  is_default?: boolean;
  is_active?: boolean;
  is_published?: boolean;
  published_at?: string;
  display_order?: number;
}

export interface WidgetInsert {
  view_config_id: string;
  widget_type: WidgetType;
  title?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  config?: Json;
  display_order?: number;
  is_active?: boolean;
}

export interface WidgetUpdate {
  widget_type?: WidgetType;
  title?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  config?: Json;
  display_order?: number;
  is_active?: boolean;
}

// Fetch all view configs for current client
export function useViewConfigs() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.viewConfigs.byClient(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];

      const data = await api.get<ViewConfig[]>(`/api/view-configs?client_id=${selectedClient.id}`);
      return data;
    },
    enabled: !!selectedClient?.id,
  });
}

// Fetch single view config with widgets
export function useViewConfig(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.viewConfigs.detail(id!),
    queryFn: async () => {
      if (!id) return null;

      const data = await api.get<ViewConfig>(`/api/view-configs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// Fetch widgets for a view config
export function useViewConfigWidgets(viewConfigId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.viewConfigs.widgets(viewConfigId!),
    queryFn: async () => {
      if (!viewConfigId) return [];

      const data = await api.get<ViewConfigWidget[]>(`/api/view-configs/${viewConfigId}/widgets`);
      return data;
    },
    enabled: !!viewConfigId,
  });
}

// Fetch a lightweight view config by ID (for DynamicPageView)
export function useViewConfigById(viewId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.viewConfigs.byId(viewId!),
    queryFn: async () => {
      if (!viewId) return null;
      const data = await api.get<ViewConfig>(`/api/view-configs/${viewId}`);
      return { id: data.id, name: data.name, config: data.config } as { id: string; name: string; config: Json };
    },
    enabled: !!viewId,
  });
}

// Create view config
export function useCreateViewConfig() {
  return useMutationWithToast({
    mutationFn: async (config: ViewConfigInsert) => {
      const data = await api.post<ViewConfig>('/api/view-configs', config);
      return data;
    },
    invalidateKeys: [queryKeys.viewConfigs.all()],
    successMessage: 'Vue créée',
  });
}

// Update view config
export function useUpdateViewConfig() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...updates }: ViewConfigUpdate & { id: string }) => {
      const data = await api.patch<ViewConfig>(`/api/view-configs/${id}`, updates);
      return data;
    },
    invalidateKeys: [queryKeys.viewConfigs.all()],
    successMessage: 'Vue mise à jour',
  });
}

// Delete view config
export function useDeleteViewConfig() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/view-configs/${id}`);
    },
    invalidateKeys: [queryKeys.viewConfigs.all()],
    successMessage: 'Vue supprimée',
  });
}

// Create widget
export function useCreateWidget() {
  return useMutationWithToast({
    mutationFn: async (widget: WidgetInsert) => {
      const data = await api.post<ViewConfigWidget>('/api/view-configs/widgets', widget);
      return data;
    },
    invalidateKeys: [queryKeys.viewConfigs.widgets("")],
  });
}

// Update widget
export function useUpdateWidget() {
  return useMutationWithToast({
    mutationFn: async ({ id, viewConfigId, ...updates }: WidgetUpdate & { id: string; viewConfigId: string }) => {
      const data = await api.patch<ViewConfigWidget>(`/api/view-configs/widgets/${id}`, updates);
      return { ...data, viewConfigId } as ViewConfigWidget & { viewConfigId: string };
    },
    invalidateKeys: [queryKeys.viewConfigs.widgets("")],
  });
}

// Delete widget
export function useDeleteWidget() {
  return useMutationWithToast({
    mutationFn: async ({ id, viewConfigId }: { id: string; viewConfigId: string }) => {
      await api.delete(`/api/view-configs/widgets/${id}`);
      return { viewConfigId };
    },
    invalidateKeys: [queryKeys.viewConfigs.widgets("")],
  });
}

// Batch update widget positions
export function useUpdateWidgetPositions() {
  return useMutationWithToast({
    mutationFn: async ({ viewConfigId, widgets }: {
      viewConfigId: string;
      widgets: Array<{ id: string; position_x: number; position_y: number; width: number; height: number }>
    }) => {
      const updates = widgets.map(w =>
        api.patch(`/api/view-configs/widgets/${w.id}`, {
          position_x: w.position_x,
          position_y: w.position_y,
          width: w.width,
          height: w.height,
        })
      );

      await Promise.all(updates);
      return { viewConfigId };
    },
    invalidateKeys: [queryKeys.viewConfigs.widgets("")],
  });
}
