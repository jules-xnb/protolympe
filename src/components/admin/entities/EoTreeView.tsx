import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Building2, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Chip } from '@/components/ui/chip';
import { StatusChip } from '@/components/ui/status-chip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { buildTree } from '@/lib/tree-utils';

interface BaseEntity {
  id: string;
  code: string | null;
  name: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  city?: string | null;
  manager_name?: string | null;
}

interface TreeNode extends BaseEntity {
  children: TreeNode[];
}

interface EoTreeViewProps<T extends BaseEntity> {
  entities: T[];
  /** All entities including ancestors for tree context (optional) */
  allEntities?: T[];
  onEntityClick?: (entity: T) => void;
  selectedEntityId?: string;
  className?: string;
}

export function EoTreeView<T extends BaseEntity>({ 
  entities, 
  allEntities,
  onEntityClick, 
  selectedEntityId,
  className 
}: EoTreeViewProps<T>) {
  // Start fully collapsed: collect all parent IDs after tree is built
  const allParentIds = useMemo(() => {
    const ids = new Set<string>();
    const entitiesForCalc = allEntities || entities;
    const childSet = new Set(entitiesForCalc.map(e => e.parent_id).filter(Boolean) as string[]);
    entitiesForCalc.forEach(e => {
      if (childSet.has(e.id)) ids.add(e.id);
    });
    // Only include IDs present in entitiesForCalc
    return ids;
  }, [entities, allEntities]);

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Initialize collapsed state once data is available
  if (!initialized && allParentIds.size > 0) {
    setCollapsedNodes(new Set(allParentIds));
    setInitialized(true);
  }

  // Set of filtered entity IDs (the ones matching filters)
  const filteredEntityIds = useMemo(() => new Set(entities.map(e => e.id)), [entities]);

  // Use allEntities if provided for tree context, otherwise just use filtered entities
  const entitiesForTree = allEntities || entities;

  // Store original entities by ID for click handler
  const entityById = useMemo(() => {
    const map = new Map<string, T>();
    entitiesForTree.forEach(e => map.set(e.id, e));
    return map;
  }, [entitiesForTree]);

  // Build tree structure from flat list, but only include ancestors of filtered entities
  const treeData = useMemo(() => {
    // If no allEntities provided, use the original simple logic
    if (!allEntities) {
      return buildTree(entities, {
        parentKey: 'parent_id',
        sort: (a, b) => a.name.localeCompare(b.name),
      }) as TreeNode[];
    }

    // With allEntities: build full tree but only include nodes that are ancestors of filtered entities
    // or the filtered entities themselves

    // First, determine which entities to include (filtered + their ancestors)
    const entitiesToInclude = new Set<string>();

    // Add all filtered entities
    entities.forEach(e => entitiesToInclude.add(e.id));

    // For each filtered entity, trace back to root and add all ancestors
    const entityMap = new Map(allEntities.map(e => [e.id, e]));
    entities.forEach(entity => {
      let current = entity;
      while (current.parent_id) {
        entitiesToInclude.add(current.parent_id);
        const parent = entityMap.get(current.parent_id);
        if (!parent) break;
        current = parent;
      }
    });

    // Filter to included entities and build tree
    const includedEntities = allEntities.filter(e => entitiesToInclude.has(e.id));
    return buildTree(includedEntities, {
      parentKey: 'parent_id',
      sort: (a, b) => a.name.localeCompare(b.name),
    }) as TreeNode[];
  }, [entities, allEntities]);

  const toggleCollapse = (id: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const expandAll = () => setCollapsedNodes(new Set());
  
  const collapseAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(treeData);
    setCollapsedNodes(allIds);
  };

  const countTotal = (nodes: TreeNode[]): number => {
    return nodes.reduce((sum, node) => sum + 1 + countTotal(node.children), 0);
  };

  const handleNodeClick = (node: TreeNode) => {
    const originalEntity = entityById.get(node.id);
    if (originalEntity && onEntityClick) {
      onEntityClick(originalEntity);
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);
    const isSelected = selectedEntityId === node.id;
    const isFiltered = filteredEntityIds.has(node.id);
    const isAncestorOnly = allEntities && !isFiltered;
    
    const maxVisualDepth = 8;
    const visualDepth = Math.min(depth, maxVisualDepth);

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors',
            isSelected
              ? 'bg-primary/10 ring-1 ring-primary/30'
              : 'hover:bg-muted/50',
            isAncestorOnly && 'opacity-50',
            !node.is_active && 'opacity-60'
          )}
          style={{ paddingLeft: `${visualDepth * 16 + 12}px` }}
          onClick={() => handleNodeClick(node)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="p-0.5 hover:bg-muted rounded shrink-0 h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse(node.id);
              }}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
            'text-sm truncate min-w-0',
            isSelected && 'font-medium text-primary'
          )}>
            {node.name}
          </span>

          {!node.is_active && (
            <StatusChip status="entite_inactive" className="shrink-0 ml-2" />
          )}

          <span className="flex-1" />

          {depth > maxVisualDepth && (
            <Chip variant="outline" className="text-xs shrink-0">
              Niv. {node.level}
            </Chip>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <div className="flex flex-col">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (entities.length === 0) {
    return (
      <EmptyState icon={Building2} title="Aucune entité à afficher" />
    );
  }

  return (
    <div className={cn('border rounded-lg bg-card h-full flex flex-col', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={expandAll}>
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Tout déplier
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={collapseAll}>
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Replier
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {treeData.map(node => renderNode(node))}
        </div>
      </ScrollArea>
    </div>
  );
}
