import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Building2, Loader2, ChevronsDownUp, ChevronsUpDown, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { api } from '@/lib/api-client';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import { useT } from '@/hooks/useT';

interface EoNode {
  id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  path: string;
  level: number;
  is_active: boolean;
  has_children: boolean;
  metadata?: Record<string, unknown> | null;
}

interface EoProgressiveTreeViewProps {
  clientId: string;
  rootEntityIds: string[];
  rootEntityPaths: string[];
  onEntityClick?: (entity: EoNode) => void;
  selectedEntityId?: string;
  className?: string;
  height?: string;
  /** Total count of entities matching filters (for display in toolbar) */
  totalFilteredCount?: number;
  /** If provided, only show entities whose IDs are in this set (filter mode) */
  filteredEntityIds?: string[] | null;
  /** Enable drag & drop reparenting */
  enableDragDrop?: boolean;
  /** Called when a node is dropped on a new parent */
  onReparent?: (entityId: string, newParentId: string | null) => void;
}

// ── Draggable + Droppable tree node ──────────────────────────
function DraggableDroppableNode({
  node,
  depth,
  children,
  enableDrag,
}: {
  node: EoNode;
  depth: number;
  children: (opts: { isDragging: boolean; isOver: boolean }) => React.ReactNode;
  enableDrag: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: node.id,
    data: { node },
    disabled: !enableDrag,
  });

  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: `drop-${node.id}`,
    data: { node },
    disabled: !enableDrag,
  });

  return (
    <div
      ref={(el) => { setDragRef(el); setDropRef(el); }}
      {...attributes}
      className={cn(isDragging && 'opacity-40')}
    >
      {children({
        isDragging,
        isOver,
      })}
      {enableDrag && (
        <div
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab opacity-0 group-hover/node:opacity-100 transition-opacity"
          style={{ left: `${depth * 16 + 2}px` }}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function EoProgressiveTreeView({
  clientId,
  rootEntityIds,
  rootEntityPaths: _rootEntityPaths,
  onEntityClick,
  selectedEntityId,
  className,
  height: _height = "h-[400px]",
  totalFilteredCount: _totalFilteredCount,
  filteredEntityIds,
  enableDragDrop = false,
  onReparent,
}: EoProgressiveTreeViewProps) {
  const { t } = useT();

  // Track which nodes are expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  // Track which nodes are currently loading
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  // Store loaded children by parent ID
  const [loadedChildren, setLoadedChildren] = useState<Map<string, EoNode[]>>(new Map());
  // DnD state
  const [draggedNode, setDraggedNode] = useState<EoNode | null>(null);

  // Build filtered IDs set for quick lookup
  const filteredIdSet = useMemo(() => {
    if (!filteredEntityIds) return null;
    return new Set(filteredEntityIds);
  }, [filteredEntityIds]);

  // Fetch root entities (user's EOs)
  const { data: rootEntities = [], isLoading: isLoadingRoots } = useQuery({
    queryKey: queryKeys.organizationalEntities.progressiveRoots(rootEntityIds),
    queryFn: async () => {
      if (rootEntityIds.length === 0) return [];
      return api.post<EoNode[]>('/api/organizational-entities/tree/roots', { ids: rootEntityIds });
    },
    enabled: rootEntityIds.length > 0,
  });

  // Load children of a specific node
  const loadChildren = useCallback(async (parentId: string) => {
    if (loadedChildren.has(parentId)) return;

    setLoadingNodes(prev => new Set(prev).add(parentId));

    try {
      const children = await api.get<EoNode[]>(`/api/organizational-entities/tree/children?parent_id=${parentId}&client_id=${clientId}`);
      setLoadedChildren(prev => new Map(prev).set(parentId, children));
    } catch (error) {
      console.error('Failed to load children:', error);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(parentId);
        return newSet;
      });
    }
  }, [clientId, loadedChildren]);

  // Toggle node expansion
  const toggleExpand = useCallback(async (nodeId: string, hasChildren: boolean) => {
    const isCurrentlyExpanded = expandedNodes.has(nodeId);

    if (isCurrentlyExpanded) {
      // Collapse
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    } else {
      // Expand - load children if needed
      if (hasChildren && !loadedChildren.has(nodeId)) {
        await loadChildren(nodeId);
      }
      setExpandedNodes(prev => new Set(prev).add(nodeId));
    }
  }, [expandedNodes, loadedChildren, loadChildren]);

  // Expand all nodes recursively
  const expandAll = useCallback(async () => {
    const allNodeIds = new Set<string>();

    const collectIds = (nodes: EoNode[]) => {
      nodes.forEach(node => {
        if (node.has_children) {
          allNodeIds.add(node.id);
          const children = loadedChildren.get(node.id);
          if (children) {
            collectIds(children);
          }
        }
      });
    };

    collectIds(rootEntities);
    setExpandedNodes(allNodeIds);
  }, [rootEntities, loadedChildren]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // ── DnD handlers ──────────────────────────────────────
  // Build a set of all descendant IDs for a given node (to prevent dropping on self/descendants)
  const getDescendantIds = useCallback((nodeId: string): Set<string> => {
    const ids = new Set<string>();
    const walk = (id: string) => {
      ids.add(id);
      const children = loadedChildren.get(id);
      if (children) children.forEach(c => walk(c.id));
    };
    walk(nodeId);
    return ids;
  }, [loadedChildren]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const node = event.active.data.current?.node as EoNode | undefined;
    if (node) setDraggedNode(node);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggedNode(null);
    const { active, over } = event;
    if (!over || !onReparent) return;

    const draggedId = active.id as string;
    const targetNode = over.data.current?.node as EoNode | undefined;
    if (!targetNode) return;

    const targetId = targetNode.id;

    // Don't drop on self or current parent
    if (draggedId === targetId) return;
    const draggedData = active.data.current?.node as EoNode | undefined;
    if (draggedData?.parent_id === targetId) return;

    // Don't drop on descendants
    const descendants = getDescendantIds(draggedId);
    if (descendants.has(targetId)) return;

    onReparent(draggedId, targetId);
  }, [onReparent, getDescendantIds]);

  const handleDragCancel = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Render a single node
  const renderNode = (node: EoNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isLoading = loadingNodes.has(node.id);
    const isSelected = selectedEntityId === node.id;
    const allChildren = loadedChildren.get(node.id) || [];
    const children = filteredIdSet ? allChildren.filter(c => filteredIdSet.has(c.id)) : allChildren;

    const maxVisualDepth = 8;
    const visualDepth = Math.min(depth, maxVisualDepth);

    const nodeContent = (isOver: boolean) => (
      <>
        <div
          className={cn(
            'group/node relative flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors',
            isSelected
              ? 'bg-primary/10 ring-1 ring-primary/30'
              : 'hover:bg-muted/50',
            !node.is_active && 'opacity-60',
            isOver && enableDragDrop && 'ring-2 ring-primary/50 bg-primary/5',
          )}
          style={{ paddingLeft: `${visualDepth * 16 + 12}px` }}
          onClick={() => onEntityClick?.(node)}
        >
          {node.has_children ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id, node.has_children);
              }}
              className="p-0.5 hover:bg-muted rounded shrink-0 h-5 w-5"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          ) : (
            <div className="w-5 shrink-0" />
          )}

          <Building2 className={cn(
            'h-4 w-4 shrink-0',
            isSelected ? 'text-primary' : 'text-muted-foreground'
          )} />

          <span className={cn(
            'flex-1 text-sm truncate',
            isSelected && 'font-medium text-primary'
          )}>
            {node.name}
          </span>

          {depth > maxVisualDepth && (
            <Chip variant="outline" className="text-xs shrink-0">
              {t('eo.level_short')} {node.level}
            </Chip>
          )}

          {!node.is_active && (
            <Chip variant="default" className="text-xs shrink-0">{t('status.inactive')}</Chip>
          )}
        </div>

        {/* Children */}
        {isExpanded && children.length > 0 && (
          <div className="flex flex-col">
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </>
    );

    if (enableDragDrop) {
      return (
        <DraggableDroppableNode
          key={node.id}
          node={node}
          depth={visualDepth}
          enableDrag
        >
          {({ isOver }) => nodeContent(isOver)}
        </DraggableDroppableNode>
      );
    }

    return (
      <div key={node.id} className="flex flex-col">
        {nodeContent(false)}
      </div>
    );
  };

  if (isLoadingRoots) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rootEntities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t('eo.no_entities_to_display')}
      </div>
    );
  }

  const filteredRoots = filteredIdSet
    ? rootEntities.filter(e => filteredIdSet.has(e.id))
    : rootEntities;

  const treeContent = (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground">
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={expandAll}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            {t('eo.expand_all')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={collapseAll}
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            {t('eo.collapse_all')}
          </Button>
        </div>
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2">
          {filteredRoots.map(entity => renderNode(entity, 0))}
        </div>
      </ScrollArea>
    </div>
  );

  if (enableDragDrop) {
    return (
      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {treeContent}
        <DragOverlay dropAnimation={null}>
          {draggedNode && (
            <div className="flex items-center gap-2 bg-background border rounded-md shadow-lg px-3 py-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{draggedNode.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    );
  }

  return treeContent;
}
