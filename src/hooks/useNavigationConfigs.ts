import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useViewMode } from '@/contexts/ViewModeContext';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface NavigationConfig {
  id: string;
  client_id: string;
  parent_id: string | null;
  label: string;
  display_label: string | null;
  slug: string;
  icon: string | null;
  type: 'group' | 'page' | 'module';
  view_config_id: string | null;
  client_module_id: string | null;
  url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NavigationConfigWithRelations extends NavigationConfig {
  view_configs: {
    id: string;
    name: string;
    type: string;
  } | null;
  children?: NavigationConfigWithRelations[];
}

export interface NavigationConfigInsert {
  client_id: string;
  parent_id?: string | null;
  label: string;
  display_label?: string | null;
  slug: string;
  icon?: string | null;
  type?: 'group' | 'page' | 'module';
  view_config_id?: string | null;
  client_module_id?: string | null;
  url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface NavigationConfigUpdate {
  parent_id?: string | null;
  label?: string;
  display_label?: string | null;
  slug?: string;
  icon?: string | null;
  view_config_id?: string | null;
  url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

// Fetch all navigation configs for current client
export function useNavigationConfigs() {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: queryKeys.navigationConfigs.byClient(selectedClient?.id),
    queryFn: async () => {
      if (!selectedClient?.id) return [];

      return api.get<NavigationConfigWithRelations[]>(
        `/api/navigation?client_id=${selectedClient.id}`
      );
    },
    enabled: !!selectedClient?.id,
  });
}

// Deep-link friendly: fetch navigation configs for an explicit clientId
export function useNavigationConfigsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.navigationConfigs.byClientExplicit(clientId!),
    queryFn: async () => {
      if (!clientId) return [];

      return api.get<NavigationConfigWithRelations[]>(
        `/api/navigation?client_id=${clientId}`
      );
    },
    enabled: !!clientId,
  });
}

// Deep-link friendly: fetch one navigation config by its id
// NOTE: The API doesn't expose a single-item GET endpoint yet,
// so we fetch all configs for the same client and filter client-side.
// TODO: Add GET /api/navigation/:id endpoint for a direct fetch.
export function useNavigationConfig(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.navigationConfigs.byId(id!),
    queryFn: async () => {
      if (!id) return null;

      return api.get<NavigationConfigWithRelations>(
        `/api/navigation/${id}`
      );
    },
    enabled: !!id,
  });
}

// Build tree structure from flat list
export function buildNavigationConfigTree(items: NavigationConfigWithRelations[]): NavigationConfigWithRelations[] {
  const itemMap = new Map<string, NavigationConfigWithRelations>();
  const roots: NavigationConfigWithRelations[] = [];
  
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });
  
  items.forEach(item => {
    const node = itemMap.get(item.id)!;
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  return roots;
}

// Create navigation config
export function useCreateNavigationConfig() {
  return useMutationWithToast({
    mutationFn: async (config: NavigationConfigInsert) => {
      return api.post<NavigationConfig>('/api/navigation', config);
    },
    invalidateKeys: [queryKeys.navigationConfigs.all()],
    successMessage: 'Élément de navigation créé',
  });
}

// Update navigation config
export function useUpdateNavigationConfig() {
  return useMutationWithToast({
    mutationFn: async ({ id, ...updates }: NavigationConfigUpdate & { id: string }) => {
      return api.patch<NavigationConfig>(`/api/navigation/${id}`, updates);
    },
    invalidateKeys: [queryKeys.navigationConfigs.all()],
    successMessage: 'Élément mis à jour',
  });
}

// Delete navigation config (API handles cascade deletion of children)
export function useDeleteNavigationConfig() {
  return useMutationWithToast({
    mutationFn: async (id: string) => {
      await api.delete(`/api/navigation/${id}`);
    },
    invalidateKeys: [queryKeys.navigationConfigs.all()],
    successMessage: 'Élément supprimé',
  });
}

// Reorder navigation configs (batch API)
export function useReorderNavigationConfigs() {
  return useMutationWithToast({
    mutationFn: async (items: { id: string; display_order: number; parent_id?: string | null }[]) => {
      await api.patch('/api/navigation/reorder', { items });
    },
    invalidateKeys: [queryKeys.navigationConfigs.all()],
  });
}

// Move navigation config (change parent and/or order)
// When parent changes, reset all permissions for this item and its descendants
export function useMoveNavigationConfig() {
  return useMutationWithToast({
    mutationFn: async ({
      id,
      parent_id,
      display_order,
      siblingsToReorder,
      previousParentId
    }: {
      id: string;
      parent_id: string | null;
      display_order: number;
      siblingsToReorder?: { id: string; display_order: number }[];
      previousParentId?: string | null;
    }) => {
      // Check if parent is actually changing
      const parentChanged = previousParentId !== parent_id;

      // Update the moved item via API
      await api.patch(`/api/navigation/${id}`, { parent_id, display_order });

      // Reorder siblings if provided (batch API)
      if (siblingsToReorder && siblingsToReorder.length > 0) {
        await api.patch('/api/navigation/reorder', { items: siblingsToReorder });
      }

      // If parent changed, reset permissions for this item and all its descendants
      if (parentChanged) {
        // Get all navigation configs to find descendants
        const allConfigs = await api.get<{ id: string; parent_id: string | null }[]>(
          `/api/navigation?client_id=${(await api.get<NavigationConfig>(`/api/navigation/${id}`)).client_id}`
        );

        if (allConfigs) {
          const descendantIds = getDescendantIds(id, allConfigs);
          const idsToReset = [id, ...descendantIds];

          // Delete all permissions for these items
          try {
            await api.post('/api/view-configs/nav-permissions/delete-by-nav-ids', {
              navigation_config_ids: idsToReset,
            });
          } catch (deleteError) {
            console.error('Error resetting permissions:', deleteError);
          }
        }
      }
    },
    invalidateKeys: [queryKeys.navigationConfigs.all(), queryKeys.navPermissions.byConfig(""), queryKeys.navPermissions.all()],
    onSuccess: (_, variables) => {
      const parentChanged = variables.previousParentId !== variables.parent_id;
      if (parentChanged) {
        toast.success('Élément déplacé et permissions réinitialisées');
      } else {
        toast.success('Élément déplacé');
      }
    },
  });
}

// Duplicate a view config and its widgets via API
async function duplicateViewConfig(viewConfigId: string): Promise<string> {
  const newView = await api.post<{ id: string }>(`/api/view-configs/duplicate/${viewConfigId}`);
  return newView.id;
}

// Recursively duplicate a nav item and its children
async function duplicateNavItemRecursive(
  item: NavigationConfigWithRelations,
  clientId: string,
  newParentId: string | null,
): Promise<void> {
  let newViewConfigId: string | undefined;
  if (item.view_config_id) {
    newViewConfigId = await duplicateViewConfig(item.view_config_id);
  }

  const navSlug = `${item.slug}-copie-${Date.now().toString(36)}`;
  const newNav = await api.post<NavigationConfig>('/api/navigation', {
    client_id: clientId,
    label: `${item.label} (copie)`,
    display_label: item.display_label || undefined,
    slug: navSlug,
    icon: item.icon || undefined,
    parent_id: newParentId || undefined,
    view_config_id: newViewConfigId || undefined,
    display_order: (item.display_order || 0) + 1,
    is_active: true,
  });
  if (!newNav) throw new Error('Erreur duplication nav');

  if (item.children && item.children.length > 0) {
    for (const child of item.children) {
      await duplicateNavItemRecursive(child, clientId, newNav.id);
    }
  }
}

export function useDuplicateNavItem() {
  return useMutationWithToast({
    mutationFn: async ({ item, clientId }: { item: NavigationConfigWithRelations; clientId: string }) => {
      await duplicateNavItemRecursive(item, clientId, item.parent_id || null);
    },
    invalidateKeys: [queryKeys.viewConfigs.all(), queryKeys.navigationConfigs.all()],
    successMessage: 'Élément dupliqué',
  });
}

// Helper function to get all descendant IDs
function getDescendantIds(parentId: string, allItems: { id: string; parent_id: string | null }[]): string[] {
  const directChildren = allItems.filter(item => item.parent_id === parentId);
  const descendants: string[] = [];
  
  for (const child of directChildren) {
    descendants.push(child.id);
    descendants.push(...getDescendantIds(child.id, allItems));
  }
  
  return descendants;
}
