import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ZoomIn, ZoomOut, Maximize2, Move, MousePointer, ChevronRight, ChevronDown } from 'lucide-react';

interface MappedEntity {
  code: string;
  name: string;
  parent_code: string | null;
  parent_name: string | null;
  level: number;
  children: MappedEntity[];
  hasError: boolean;
  errorMessage?: string;
  is_active: boolean;
}

interface NodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  entity: MappedEntity;
  children: NodePosition[];
  isExpanded: boolean;
  hasChildren: boolean;
}

interface EoTreeCanvasProps {
  entities: MappedEntity[];
  onEntityClick?: (entity: MappedEntity) => void;
  selectedEntityCode?: string;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const HORIZONTAL_GAP = 30;
const VERTICAL_GAP = 60;

export function EoTreeCanvas({ entities, onEntityClick, selectedEntityCode }: EoTreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<'pan' | 'select'>('pan');
  const [initialized, setInitialized] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Toggle node expansion
  const toggleExpand = useCallback((code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  }, []);

  // Expand all nodes
  const expandAll = useCallback(() => {
    const allCodes = new Set<string>();
    const collectCodes = (nodes: MappedEntity[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allCodes.add(node.code);
          collectCodes(node.children);
        }
      });
    };
    collectCodes(entities);
    setExpandedNodes(allCodes);
  }, [entities]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  // Calculate tree layout with expansion state
  const calculateLayout = useCallback((
    nodes: MappedEntity[], 
    startX: number = 0, 
    startY: number = 0
  ): { positions: NodePosition[], totalWidth: number } => {
    const positions: NodePosition[] = [];
    let currentX = startX;

    nodes.forEach((node) => {
      const isExpanded = expandedNodes.has(node.code);
      const hasChildren = node.children.length > 0;
      let childResult = { positions: [] as NodePosition[], totalWidth: 0 };
      
      // Only calculate children if expanded
      if (hasChildren && isExpanded) {
        childResult = calculateLayout(node.children, currentX, startY + NODE_HEIGHT + VERTICAL_GAP);
      }

      const subtreeWidth = Math.max(NODE_WIDTH, childResult.totalWidth);
      const nodeX = currentX + (subtreeWidth - NODE_WIDTH) / 2;

      positions.push({
        x: nodeX,
        y: startY,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        entity: node,
        children: childResult.positions,
        isExpanded,
        hasChildren,
      });

      currentX += subtreeWidth + HORIZONTAL_GAP;
    });

    const totalWidth = currentX - startX - (nodes.length > 0 ? HORIZONTAL_GAP : 0);

    return { positions, totalWidth };
  }, [expandedNodes]);

  const { positions: nodePositions } = useMemo(() => calculateLayout(entities), [calculateLayout, entities]);

  // Calculate total canvas size
  const canvasSize = useMemo(() => {
    let maxX = 0;
    let maxY = 0;

    const traverse = (nodes: NodePosition[]) => {
      nodes.forEach((node) => {
        maxX = Math.max(maxX, node.x + node.width);
        maxY = Math.max(maxY, node.y + node.height);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(nodePositions);
    return { width: Math.max(maxX + 50, 400), height: Math.max(maxY + 50, 300) };
  }, [nodePositions]);

  // Count visible nodes
  const visibleNodeCount = useMemo(() => {
    let count = 0;
    const countVisible = (positions: NodePosition[]) => {
      positions.forEach(pos => {
        count++;
        if (pos.children.length > 0) {
          countVisible(pos.children);
        }
      });
    };
    countVisible(nodePositions);
    return count;
  }, [nodePositions]);

  // Count total nodes in original data
  const totalNodeCount = useMemo(() => {
    const countAll = (nodes: MappedEntity[]): number => {
      return nodes.reduce((acc, node) => acc + 1 + countAll(node.children), 0);
    };
    return countAll(entities);
  }, [entities]);

  // Center canvas on the top-level entity on mount
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

  // Reset initialized when entities change
  useEffect(() => {
    setInitialized(false);
  }, [entities.length]);

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

  // Render node using pure SVG
  const renderNode = (position: NodePosition): React.ReactNode => {
    const { x, y, entity, children, isExpanded, hasChildren } = position;
    const isSelected = selectedEntityCode === entity.code;

    // Truncate text helper
    const truncateText = (text: string, maxLen: number) => 
      text.length > maxLen ? text.slice(0, maxLen) + '…' : text;

    const rectClassName = entity.hasError
      ? 'fill-destructive/10 stroke-destructive/50'
      : isSelected
        ? 'fill-primary/10 stroke-primary'
        : 'fill-card stroke-border hover:stroke-primary/60';

    return (
      <g key={entity.code}>
        {/* Connection lines to children (only if expanded) */}
        {isExpanded && children.map((child) => {
          const startX = x + NODE_WIDTH / 2;
          const startY = y + NODE_HEIGHT;
          const endX = child.x + NODE_WIDTH / 2;
          const endY = child.y;
          const midY = startY + VERTICAL_GAP / 2;

          return (
            <path
              key={`line-${entity.code}-${child.entity.code}`}
              d={`M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-border"
            />
          );
        })}

        {/* Node rectangle */}
        <rect
          x={x}
          y={y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={8}
          ry={8}
          strokeWidth={isSelected ? 2 : 1.5}
          className={`cursor-pointer transition-colors ${rectClassName}`}
          onClick={() => onEntityClick?.(entity)}
        />

        {/* Expand/collapse button for nodes with children */}
        {hasChildren && (
          <g 
            className="cursor-pointer"
            onClick={(e) => toggleExpand(entity.code, e)}
          >
            <circle
              cx={x + NODE_WIDTH / 2}
              cy={y + NODE_HEIGHT + 10}
              r={10}
              fill="currentColor"
              className="text-background"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle
              cx={x + NODE_WIDTH / 2}
              cy={y + NODE_HEIGHT + 10}
              r={10}
              fill="currentColor"
              className="text-secondary hover:text-secondary/80"
            />
            {isExpanded ? (
              <path
                d={`M ${x + NODE_WIDTH / 2 - 4} ${y + NODE_HEIGHT + 8} L ${x + NODE_WIDTH / 2} ${y + NODE_HEIGHT + 12} L ${x + NODE_WIDTH / 2 + 4} ${y + NODE_HEIGHT + 8}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-secondary-foreground"
              />
            ) : (
              <path
                d={`M ${x + NODE_WIDTH / 2 - 3} ${y + NODE_HEIGHT + 7} L ${x + NODE_WIDTH / 2 + 1} ${y + NODE_HEIGHT + 10} L ${x + NODE_WIDTH / 2 - 3} ${y + NODE_HEIGHT + 13}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-secondary-foreground"
              />
            )}
          </g>
        )}

        {/* Icon circle */}
        <circle
          cx={x + 18}
          cy={y + NODE_HEIGHT / 2}
          r={12}
          fill="currentColor"
          className={entity.hasError ? 'text-destructive/20' : 'text-primary/10'}
        />
        
        {/* Building icon (simplified) */}
        <g transform={`translate(${x + 10}, ${y + NODE_HEIGHT / 2 - 8})`}>
          <rect
            x="2"
            y="6"
            width="12"
            height="10"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={entity.hasError ? 'text-destructive' : 'text-primary'}
          />
          <rect x="5" y="9" width="2" height="2" fill="currentColor" className={entity.hasError ? 'text-destructive' : 'text-primary'} />
          <rect x="9" y="9" width="2" height="2" fill="currentColor" className={entity.hasError ? 'text-destructive' : 'text-primary'} />
          <rect x="7" y="12" width="2" height="4" fill="currentColor" className={entity.hasError ? 'text-destructive' : 'text-primary'} />
        </g>

        {/* Entity name */}
        <text
          x={x + 35}
          y={y + 20}
          fontSize="11"
          fontWeight="500"
          fill="currentColor"
          className="pointer-events-none select-none text-foreground"
        >
          {truncateText(entity.name, 14)}
        </text>

        {/* Entity level badge */}
        <text
          x={x + 35}
          y={y + 34}
          fontSize="9"
          fill="currentColor"
          className="pointer-events-none select-none text-muted-foreground"
        >
          Niv. {entity.level}
        </text>

        {/* Children count badge */}
        {hasChildren && (
          <>
            <rect
              x={x + NODE_WIDTH - 28}
              y={y + 6}
              width={22}
              height={14}
              rx={7}
              fill="currentColor"
              className="text-secondary"
            />
            <text
              x={x + NODE_WIDTH - 17}
              y={y + 16}
              fontSize="9"
              textAnchor="middle"
              fill="currentColor"
              className="pointer-events-none select-none text-secondary-foreground"
            >
              {entity.children.length}
            </text>
          </>
        )}

        {/* Render children recursively (only if expanded) */}
        {isExpanded && children.map((child) => renderNode(child))}
      </g>
    );
  };

  if (entities.length === 0) {
    return (
      <div className="relative w-full h-[500px] border rounded-lg bg-muted/20 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Aucune entité à afficher</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] border rounded-lg bg-muted/20 overflow-hidden">
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
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut} title="Dézoomer">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">
          {Math.round(transform.scale * 100)}%
        </span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn} title="Zoomer">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleFitToScreen} title="Ajuster à l'écran">
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
        {visibleNodeCount} / {totalNodeCount} entité{totalNodeCount > 1 ? 's' : ''}
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`w-full h-full ${mode === 'pan' ? 'cursor-grab' : 'cursor-default'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          width="100%"
          height="100%"
        >
          {/* Background grid */}
          <defs>
            <pattern id="canvas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.25"
                className="text-border"
              />
            </pattern>
          </defs>
          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
            <rect x="-500" y="-500" width={canvasSize.width + 1000} height={canvasSize.height + 1000} fill="url(#canvas-grid)" />

            {/* Render all nodes */}
            {nodePositions.map((pos) => renderNode(pos))}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 text-xs text-muted-foreground">
        Molette pour zoomer • Glisser pour déplacer • Cliquer sur le bouton pour déplier
      </div>
    </div>
  );
}
