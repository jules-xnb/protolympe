import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ZoomIn, ZoomOut, Maximize2, Move, MousePointer, ChevronRight, ChevronDown } from 'lucide-react';
import { buildTree } from '@/lib/tree-utils';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  calculateLayout,
  calculateCanvasSize,
  countVisibleNodes,
  findNodePosition,
  collectExpandableIds,
} from '@/lib/eo/canvas-layout';
import { EoCanvasNode } from './EoCanvasNode';

interface BaseEntity {
  id: string;
  code: string | null;
  name: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
}

interface TreeNode extends BaseEntity {
  children: TreeNode[];
}

interface EoCanvasViewProps<T extends BaseEntity> {
  entities: T[];
  /** All entities including ancestors for tree context (optional) */
  allEntities?: T[];
  onEntityClick?: (entity: T) => void;
  selectedEntityId?: string;
}

export function EoCanvasView<T extends BaseEntity>({
  entities,
  allEntities,
  onEntityClick,
  selectedEntityId
}: EoCanvasViewProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<'pan' | 'select'>('pan');
  const [initialized, setInitialized] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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

  // Build tree structure from flat list
  const treeData = useMemo(() => {
    if (!allEntities) {
      return buildTree(entities, {
        parentKey: 'parent_id',
        sort: (a, b) => a.name.localeCompare(b.name),
      }) as TreeNode[];
    }

    // With allEntities: include nodes that are ancestors of filtered entities or the filtered entities themselves
    const entitiesToInclude = new Set<string>();
    entities.forEach(e => entitiesToInclude.add(e.id));

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

    const includedEntities = allEntities.filter(e => entitiesToInclude.has(e.id));
    return buildTree(includedEntities, {
      parentKey: 'parent_id',
      sort: (a, b) => a.name.localeCompare(b.name),
    }) as TreeNode[];
  }, [entities, allEntities]);

  // Track which node to center on after layout change
  const [centerOnNodeId, setCenterOnNodeId] = useState<string | null>(null);

  // Toggle node expansion and request centering
  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCenterOnNodeId(id);
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    setExpandedNodes(collectExpandableIds(treeData));
  }, [treeData]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Calculate tree layout with expansion state
  const { positions: nodePositions } = useMemo(
    () => calculateLayout(treeData, expandedNodes),
    [treeData, expandedNodes]
  );

  // Calculate canvas size
  const canvasSize = useMemo(() => calculateCanvasSize(nodePositions), [nodePositions]);

  // Count visible nodes
  const visibleNodeCount = useMemo(() => countVisibleNodes(nodePositions), [nodePositions]);
  const totalNodes = entities.length;

  // Center on mount
  useEffect(() => {
    if (containerRef.current && nodePositions.length > 0 && !initialized) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const firstRoot = nodePositions[0];
      const centerX = firstRoot.x + NODE_WIDTH / 2;
      const centerY = firstRoot.y + NODE_HEIGHT / 2;

      const initialScale = 1;
      const x = (containerWidth / 2) - (centerX * initialScale);
      const y = (containerHeight / 3) - (centerY * initialScale);

      setTransform({ x, y, scale: initialScale });
      setInitialized(true);
    }
  }, [nodePositions, initialized]);

  useEffect(() => {
    setInitialized(false);
  }, [entities.length]);

  // Center on toggled node after layout recalculation
  useEffect(() => {
    if (!centerOnNodeId || !containerRef.current) return;

    const nodePos = findNodePosition(nodePositions, centerOnNodeId);
    if (nodePos) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const nodeCenterX = nodePos.x + NODE_WIDTH / 2;
      const nodeCenterY = nodePos.y + NODE_HEIGHT / 2;

      const x = (containerWidth / 2) - (nodeCenterX * transform.scale);
      const y = (containerHeight / 3) - (nodeCenterY * transform.scale);

      setTransform(prev => ({ ...prev, x, y }));
    }

    setCenterOnNodeId(null);
  }, [centerOnNodeId, nodePositions, transform.scale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'pan' && e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && mode === 'pan') {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.2, transform.scale * delta), 3);

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleRatio = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleRatio;
      const newY = mouseY - (mouseY - transform.y) * scaleRatio;

      setTransform({ x: newX, y: newY, scale: newScale });
    }
  };

  const handleZoomIn = () => {
    setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale / 1.2) }));
  };

  const handleFitToScreen = () => {
    if (containerRef.current && canvasSize.width > 0) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const scaleX = (containerWidth - 60) / canvasSize.width;
      const scaleY = (containerHeight - 60) / canvasSize.height;
      const fitScale = Math.min(Math.max(0.2, Math.min(scaleX, scaleY)), 1);

      const scaledWidth = canvasSize.width * fitScale;
      const scaledHeight = canvasSize.height * fitScale;
      const x = (containerWidth - scaledWidth) / 2;
      const y = (containerHeight - scaledHeight) / 2;

      setTransform({ x, y, scale: fitScale });
    }
  };

  const handleEntityClick = useCallback((entityId: string) => {
    const originalEntity = entityById.get(entityId);
    if (originalEntity && onEntityClick) {
      onEntityClick(originalEntity);
    }
  }, [entityById, onEntityClick]);

  if (entities.length === 0) {
    return (
      <div className="relative w-full h-full min-h-[400px] border rounded-lg bg-muted/20 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Aucune entité à afficher</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-280px)] border rounded-lg bg-muted/20 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-sm border rounded-lg p-1 shadow-sm">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => { if (v) setMode(v as 'pan' | 'select'); }}
          variant="outline"
          className="gap-0 rounded-lg overflow-hidden"
        >
          <ToggleGroupItem value="pan" className="rounded-none" title="Mode déplacement">
            <Move className="h-[18px] w-[18px]" />
          </ToggleGroupItem>
          <ToggleGroupItem value="select" className="rounded-none" title="Mode sélection">
            <MousePointer className="h-[18px] w-[18px]" />
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">
          {Math.round(transform.scale * 100)}%
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleFitToScreen}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={expandAll} title="Tout déplier">
          Tout
          <ChevronDown className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={collapseAll} title="Tout replier">
          Replier
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Node count */}
      <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm border rounded-lg px-2 py-1 text-xs text-muted-foreground">
        {visibleNodeCount} / {totalNodes} entité{totalNodes > 1 ? 's' : ''}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-full ${mode === 'pan' ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg width="100%" height="100%">
          <defs>
            <pattern id="entities-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.25" className="text-border" />
            </pattern>
          </defs>
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
            <rect x="-500" y="-500" width={canvasSize.width + 1000} height={canvasSize.height + 1000} fill="url(#entities-grid)" />
            {nodePositions.map((pos) => (
              <EoCanvasNode
                key={pos.entity.id}
                position={pos}
                selectedEntityId={selectedEntityId}
                filteredEntityIds={filteredEntityIds}
                hasAllEntities={!!allEntities}
                onEntityClick={handleEntityClick}
                onToggleExpand={toggleExpand}
              />
            ))}
          </g>
        </svg>
      </div>

      <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 text-xs text-muted-foreground">
        Molette pour zoomer • Glisser pour déplacer • Cliquer sur le bouton pour déplier
      </div>
    </div>
  );
}
