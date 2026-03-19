import {
  NODE_WIDTH,
  NODE_HEIGHT,
  VERTICAL_GAP,
  type NodePosition,
  truncateText,
} from '@/lib/eo/canvas-layout';

interface EoCanvasNodeProps {
  position: NodePosition;
  selectedEntityId?: string;
  filteredEntityIds: Set<string>;
  hasAllEntities: boolean;
  onEntityClick: (entityId: string) => void;
  onToggleExpand: (entityId: string, e: React.MouseEvent) => void;
}

export function EoCanvasNode({
  position,
  selectedEntityId,
  filteredEntityIds,
  hasAllEntities,
  onEntityClick,
  onToggleExpand,
}: EoCanvasNodeProps) {
  const { x, y, entity, children, isExpanded, hasChildren } = position;
  const isSelected = selectedEntityId === entity.id;
  const isFiltered = filteredEntityIds.has(entity.id);
  const isAncestorOnly = hasAllEntities && !isFiltered;

  const rectClassName = !entity.is_active
    ? 'fill-muted stroke-muted-foreground/50'
    : isSelected
      ? 'fill-primary/10 stroke-primary'
      : 'fill-card stroke-border hover:stroke-primary/60';

  return (
    <g key={entity.id} opacity={isAncestorOnly ? 0.5 : 1}>
      {/* Connection lines (only if expanded) */}
      {isExpanded && children.map((child) => {
        const startX = x + NODE_WIDTH / 2;
        const startY = y + NODE_HEIGHT;
        const endX = child.x + NODE_WIDTH / 2;
        const endY = child.y;
        const midY = startY + VERTICAL_GAP / 2;

        return (
          <path
            key={`line-${entity.id}-${child.entity.id}`}
            d={`M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
        );
      })}

      {/* Node */}
      <rect
        x={x}
        y={y}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        ry={8}
        strokeWidth={isSelected ? 2 : 1.5}
        className={`cursor-pointer transition-colors ${rectClassName}`}
        onClick={() => onEntityClick(entity.id)}
      />

      {/* Expand/collapse button for nodes with children */}
      {hasChildren && (
        <g
          className="cursor-pointer"
          onClick={(e) => onToggleExpand(entity.id, e)}
        >
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

      {/* Icon */}
      <circle
        cx={x + 18}
        cy={y + NODE_HEIGHT / 2}
        r={12}
        fill="currentColor"
        className={!entity.is_active ? 'text-muted-foreground/20' : 'text-primary/10'}
      />

      <g transform={`translate(${x + 10}, ${y + NODE_HEIGHT / 2 - 8})`}>
        <rect
          x="2" y="6" width="12" height="10" rx="1"
          fill="none" stroke="currentColor" strokeWidth="1.5"
          className={!entity.is_active ? 'text-muted-foreground' : 'text-primary'}
        />
        <rect x="5" y="9" width="2" height="2" fill="currentColor" className={!entity.is_active ? 'text-muted-foreground' : 'text-primary'} />
        <rect x="9" y="9" width="2" height="2" fill="currentColor" className={!entity.is_active ? 'text-muted-foreground' : 'text-primary'} />
        <rect x="7" y="12" width="2" height="4" fill="currentColor" className={!entity.is_active ? 'text-muted-foreground' : 'text-primary'} />
      </g>

      {/* Name */}
      <text
        x={x + 35} y={y + 20}
        fontSize="11" fontWeight="500"
        fill="currentColor"
        className="pointer-events-none select-none text-foreground"
      >
        {truncateText(entity.name, 14)}
      </text>

      {/* Level */}
      <text
        x={x + 35} y={y + 34}
        fontSize="9"
        fill="currentColor"
        className="pointer-events-none select-none text-muted-foreground"
      >
        Niv. {entity.level}
      </text>

      {/* Children count */}
      {hasChildren && (
        <>
          <rect
            x={x + NODE_WIDTH - 28} y={y + 6}
            width={22} height={14} rx={7}
            fill="currentColor" className="text-secondary"
          />
          <text
            x={x + NODE_WIDTH - 17} y={y + 16}
            fontSize="9" textAnchor="middle"
            fill="currentColor"
            className="pointer-events-none select-none text-secondary-foreground"
          >
            {entity.children.length}
          </text>
        </>
      )}

      {/* Render children recursively (only if expanded) */}
      {isExpanded && children.map((child) => (
        <EoCanvasNode
          key={child.entity.id}
          position={child}
          selectedEntityId={selectedEntityId}
          filteredEntityIds={filteredEntityIds}
          hasAllEntities={hasAllEntities}
          onEntityClick={onEntityClick}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </g>
  );
}
