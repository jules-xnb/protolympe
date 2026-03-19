import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Layers, FolderPlus, FilePlus } from 'lucide-react';
import {
  useNavigationConfigs,
  useDeleteNavigationConfig,
  useUpdateNavigationConfig,
  useDuplicateNavItem,
  buildNavigationConfigTree,
  type NavigationConfigWithRelations,
} from '@/hooks/useNavigationConfigs';
import { ModuleItemFormDialog } from './ModuleItemFormDialog';
import { ModulesTree } from './ModulesTree';
import { ViewConfigFormDialog } from '../ViewConfigFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useClientPath } from '@/hooks/useClientPath';
import { PageBuilder } from '../page-builder';
import { toast } from 'sonner';

export interface ModulesEditorHandle {
  expandAll: () => void;
  collapseAll: () => void;
  createModule: () => void;
  createView: () => void;
}

interface ModulesEditorProps {
  onEmptyChange?: (isEmpty: boolean) => void;
}

export const ModulesEditor = forwardRef<ModulesEditorHandle, ModulesEditorProps>(function ModulesEditor({ onEmptyChange }, ref) {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: items = [], isLoading } = useNavigationConfigs();
  const deleteMutation = useDeleteNavigationConfig();
  const updateMutation = useUpdateNavigationConfig();
  const duplicateNavMutation = useDuplicateNavItem();

  // Start with all items expanded by default
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hasInitializedExpansion, setHasInitializedExpansion] = useState(false);
  const moduleFormDialog = useDialogState<NavigationConfigWithRelations>();
  const [viewFormOpen, setViewFormOpen] = useState(false);
  const deleteDialog = useDialogState<NavigationConfigWithRelations>();
  const [editingView, setEditingView] = useState<NavigationConfigWithRelations | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  // Build tree with all items (modules + views)
  const tree = useMemo(() => buildNavigationConfigTree(items), [items]);

  // Get only modules for the form dialog parent selection
  const modules = useMemo(() => items.filter(i => !i.view_config_id), [items]);

  // Notify parent when empty state changes
  useEffect(() => {
    if (!isLoading) onEmptyChange?.(tree.length === 0);
  }, [tree.length, isLoading, onEmptyChange]);

  // Expand all items by default on first load
  useEffect(() => {
    if (!hasInitializedExpansion && items.length > 0 && !isLoading) {
      setExpanded(new Set(items.map(i => i.id)));
      setHasInitializedExpansion(true);
    }
  }, [items, isLoading, hasInitializedExpansion]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpanded(new Set(items.map((i) => i.id)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const handleCreateModule = (parentId?: string) => {
    setDefaultParentId(parentId || null);
    moduleFormDialog.open();
  };

  const handleCreateView = (parentId?: string) => {
    setDefaultParentId(parentId || null);
    setViewFormOpen(true);
  };

  useImperativeHandle(ref, () => ({
    expandAll,
    collapseAll,
    createModule: handleCreateModule,
    createView: handleCreateView,
  }));

  const handleEdit = (item: NavigationConfigWithRelations) => {
    moduleFormDialog.open(item);
  };

  const handleDelete = (item: NavigationConfigWithRelations) => {
    deleteDialog.open(item);
  };

  const handleDuplicate = async (item: NavigationConfigWithRelations) => {
    if (!selectedClient?.id) return;
    try {
      await duplicateNavMutation.mutateAsync({ item, clientId: selectedClient.id });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la duplication');
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog.item) return;
    try {
      await deleteMutation.mutateAsync(deleteDialog.item.id);
      deleteDialog.close();
    } catch {
      // Error handled by mutation
    }
  };

  const handleViewClick = (item: NavigationConfigWithRelations) => {
    // Module items navigate to the module config page
    if (item.client_module_id) {
      navigate(cp(`/modules/${item.client_module_id}`));
      return;
    }

    setEditingView(item);
  };

  const handleCloseViewEditor = () => {
    setEditingView(null);
  };

  // Show the node editor in fullscreen when a view is selected
  if (editingView) {
    return (
      <PageBuilder
        viewId={editingView.view_config_id || editingView.id}
        viewName={editingView.label}
        clientId={selectedClient?.id}
        onClose={handleCloseViewEditor}
      />
    );
  }

  if (!selectedClient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">Sélectionnez un client pour gérer la navigation</p>
      </div>
    );
  }

  return (
    <>
      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : tree.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Créer la navigation"
          description="Commencez par créer un groupe ou une vue pour structurer la navigation."
          action={
            <div className="flex gap-2 justify-center pt-1">
              <Button variant="outline" size="sm" onClick={() => handleCreateModule()}>
                Créer un groupe
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleCreateView()}>
                Créer une vue
                <FilePlus className="h-4 w-4" />
              </Button>
            </div>
          }
          className="py-8"
        />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Élément</span>
            <span>Statut</span>
            <span className="w-[140px] text-right">Actions</span>
          </div>
          <ModulesTree
            tree={tree}
            items={items}
            expanded={expanded}
            onToggle={toggleExpanded}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onToggleActive={(item) => {
              const newActive = !item.is_active;
              if (!newActive) {
                const getDescendantIds = (parentId: string): string[] => {
                  const children = items.filter(i => i.parent_id === parentId);
                  return children.flatMap(c => [c.id, ...getDescendantIds(c.id)]);
                };
                const descendantIds = getDescendantIds(item.id);
                updateMutation.mutate({ id: item.id, is_active: false });
                descendantIds.forEach(id => updateMutation.mutate({ id, is_active: false }));
              } else {
                updateMutation.mutate({ id: item.id, is_active: true });
              }
            }}
            onViewClick={handleViewClick}
            onAddGroup={(parentId) => handleCreateModule(parentId)}
            onAddView={(parentId) => handleCreateView(parentId)}
          />
        </div>
      )}

      <ModuleItemFormDialog
        open={moduleFormDialog.isOpen}
        onOpenChange={moduleFormDialog.onOpenChange}
        item={moduleFormDialog.item}
        parentItems={modules}
        defaultParentId={defaultParentId}
      />

      <ViewConfigFormDialog
        open={viewFormOpen}
        onOpenChange={setViewFormOpen}
        defaultParentId={defaultParentId}
      />

      <DeleteConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={confirmDelete}
        title={deleteDialog.item?.view_config_id ? "Supprimer la vue" : "Supprimer le groupe"}
        description={`Êtes-vous sûr de vouloir supprimer "${deleteDialog.item?.label}" ? ${
          deleteDialog.item?.children?.length
            ? 'Attention : les sous-éléments seront également supprimés.'
            : ''
        }`}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
});
