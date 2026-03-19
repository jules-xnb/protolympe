import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  type EdgeTypes,
  Handle,
  Position,
  useReactFlow,
  type EdgeProps,
  BaseEdge,
  getSmoothStepPath,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FileText, CheckCircle2, Users, AlertCircle, X } from 'lucide-react';
import type { ValidationStep } from '../types';
import type { InheritedRole } from '../block-config/BlockConfigPanel';
import { WorkflowNodePanel } from './WorkflowNodePanel';
import { CanvasOverlay, WorkflowToolbar } from './WorkflowToolbar';
import { useWorkflowGraph } from './useWorkflowGraph';

// --- Draggable Edge: click & drag to bend the line via a single midpoint ---

function EditableEdge({
  id: _id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  data,
  selected,
}: EdgeProps) {
  // Multiple control points stored externally
  const controlPoints: Array<{ x: number; y: number }> = useMemo(
    () => (data?.controlPoints as Array<{ x: number; y: number }>) || [],
    [data?.controlPoints],
  );
  const onControlPointsChange = data?.onControlPointsChange as ((points: Array<{ x: number; y: number }>) => void) | undefined;

  const [isDragging, setIsDragging] = useState(false);
  const [localPoints, setLocalPoints] = useState<Array<{ x: number; y: number }>>(controlPoints);
  const svgRef = useRef<SVGGElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (!isDragging) setLocalPoints(controlPoints);
  }, [controlPoints, isDragging]);

  const screenToFlow = (clientX: number, clientY: number) => {
    return screenToFlowPosition({ x: clientX, y: clientY });
  };

  const pointToSegmentDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.sqrt((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2);
  };

  const commitPoints = (pts: Array<{ x: number; y: number }>) => {
    const filtered = pts.filter((pt, i) => {
      const before = i === 0 ? { x: sourceX, y: sourceY } : pts[i - 1];
      const after = i === pts.length - 1 ? { x: targetX, y: targetY } : pts[i + 1];
      return pointToSegmentDist(pt.x, pt.y, before.x, before.y, after.x, after.y) >= 15;
    });
    onControlPointsChange?.(filtered);
    return filtered;
  };

  // Drag on edge to create a new control point on nearest segment
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
    const dragIdxRef = { current: -1 };

    const onMove = (ev: PointerEvent) => {
      const dxx = ev.clientX - (dragStartRef.current?.x || 0);
      const dyy = ev.clientY - (dragStartRef.current?.y || 0);
      if (!didDragRef.current && Math.sqrt(dxx * dxx + dyy * dyy) > 5) {
        didDragRef.current = true;
        setIsDragging(true);
        const startPos = screenToFlow(dragStartRef.current!.x, dragStartRef.current!.y);
        if (startPos) {
          setLocalPoints(prev => {
            const allPts = [{ x: sourceX, y: sourceY }, ...prev, { x: targetX, y: targetY }];
            let bestSeg = 0, bestDist = Infinity;
            for (let i = 0; i < allPts.length - 1; i++) {
              const d = pointToSegmentDist(startPos.x, startPos.y, allPts[i].x, allPts[i].y, allPts[i + 1].x, allPts[i + 1].y);
              if (d < bestDist) { bestDist = d; bestSeg = i; }
            }
            dragIdxRef.current = bestSeg;
            const newPts = [...prev];
            newPts.splice(bestSeg, 0, startPos);
            return newPts;
          });
        }
      }
      if (didDragRef.current && dragIdxRef.current >= 0) {
        const pos = screenToFlow(ev.clientX, ev.clientY);
        if (pos) setLocalPoints(prev => { const u = [...prev]; u[dragIdxRef.current] = pos; return u; });
      }
    };

    const onUp = () => {
      if (didDragRef.current) {
        setIsDragging(false);
        setLocalPoints(prev => commitPoints(prev));
      }
      dragStartRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Drag an existing control point
  const handlePointPointerDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);

    const onMove = (ev: PointerEvent) => {
      const pos = screenToFlow(ev.clientX, ev.clientY);
      if (pos) setLocalPoints(prev => { const u = [...prev]; u[index] = pos; return u; });
    };

    const onUp = () => {
      setIsDragging(false);
      setLocalPoints(prev => commitPoints(prev));
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const selectedStroke = selected ? 3 : undefined;
  const allPoints = [{ x: sourceX, y: sourceY }, ...localPoints, { x: targetX, y: targetY }];

  const buildPath = () => {
    if (localPoints.length === 0) {
      return getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })[0];
    }
    const radius = 12;
    let d = `M ${allPoints[0].x} ${allPoints[0].y}`;
    for (let i = 1; i < allPoints.length - 1; i++) {
      const prev = allPoints[i - 1], curr = allPoints[i], next = allPoints[i + 1];
      const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (len1 === 0 || len2 === 0) { d += ` L ${curr.x} ${curr.y}`; continue; }
      const r = Math.min(radius, len1 / 2, len2 / 2);
      d += ` L ${curr.x - (dx1 / len1) * r} ${curr.y - (dy1 / len1) * r}`;
      d += ` Q ${curr.x} ${curr.y} ${curr.x + (dx2 / len2) * r} ${curr.y + (dy2 / len2) * r}`;
    }
    d += ` L ${allPoints[allPoints.length - 1].x} ${allPoints[allPoints.length - 1].y}`;
    return d;
  };

  const pathD = buildPath();
  const midIdx = Math.floor(allPoints.length / 2);
  const labelPosX = allPoints[midIdx].x;
  const labelPosY = allPoints[midIdx].y;

  return (
    <g ref={svgRef}>
      {selected && (
        <path d={pathD} fill="none" stroke="hsl(var(--primary))" strokeWidth={6} strokeOpacity={0.2} style={{ pointerEvents: 'none' }} />
      )}
      {localPoints.length === 0 ? (
        <BaseEdge path={pathD} markerEnd={markerEnd as string} style={{ ...style, strokeWidth: selectedStroke || (style?.strokeWidth as number) || 2 }} />
      ) : (
        <path
          d={pathD} fill="none"
          stroke={(style?.stroke as string) || 'hsl(var(--muted-foreground))'}
          strokeWidth={selectedStroke || (style?.strokeWidth as number) || 2}
          strokeDasharray={(style?.strokeDasharray as string) || undefined}
          markerEnd={markerEnd as string}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <path d={pathD} fill="none" stroke="transparent" strokeWidth={20} style={{ cursor: 'pointer' }} onPointerDown={handlePointerDown} />

      {/* Control point handles */}
      {localPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r={selected ? 5 : 4}
          fill="hsl(var(--background))"
          stroke={selected ? 'hsl(var(--primary))' : ((style?.stroke as string) || 'hsl(var(--muted-foreground))')}
          strokeWidth={2} style={{ cursor: 'grab', pointerEvents: 'all' }}
          onPointerDown={(e) => handlePointPointerDown(e, i)}
        />
      ))}

      {/* Grab handle when selected and no points */}
      {selected && localPoints.length === 0 && (
        <circle cx={(sourceX + targetX) / 2} cy={(sourceY + targetY) / 2} r={5}
          fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2}
          style={{ cursor: 'grab' }}
          onPointerDown={(e) => {
            e.stopPropagation(); e.preventDefault();
            const pos = screenToFlow(e.clientX, e.clientY);
            if (pos) {
              setLocalPoints([pos]);
              setIsDragging(true);
              const onMove = (ev: PointerEvent) => { const p = screenToFlow(ev.clientX, ev.clientY); if (p) setLocalPoints([p]); };
              const onUp = () => { setIsDragging(false); setLocalPoints(prev => commitPoints(prev)); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
              window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
            }
          }}
        />
      )}

      {label && (
        <text x={labelPosX} y={labelPosY - 12} textAnchor="middle" className="text-xs fill-muted-foreground font-medium" style={{ pointerEvents: 'none' }}>
          {String(label)}
        </text>
      )}
    </g>
  );
}

// --- Custom Node Components ---

function RespondentNode({ data }: { data: { name: string; isSelected: boolean; hasRoles: boolean; hasApprove: boolean; hasReject: boolean } }) {
  const isComplete = data.hasApprove;
  return (
    <div className={`px-5 py-3 rounded-xl border-2 shadow-sm min-w-[140px] text-center cursor-pointer transition-all ${
      data.isSelected
        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
        : !isComplete
          ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500'
          : 'border-primary/40 bg-primary/5 hover:border-primary/60'
    }`}>
      <Handle type="target" position={Position.Left} id="target" className="!bg-primary !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} id="source" className="!bg-primary !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 justify-center">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">{data.name}</span>
      </div>
      {!data.hasRoles && (
        <div className="flex items-center gap-1 justify-center mt-1">
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">Aucun rôle</span>
        </div>
      )}
      {!isComplete && data.hasRoles && (
        <div className="flex items-center gap-1 justify-center mt-1">
          <AlertCircle className="h-3 w-3 text-warning" />
          <span className="text-xs text-warning">Lien de soumission manquant</span>
        </div>
      )}
    </div>
  );
}

function ValidatedNode({ data }: { data: { name: string; hasIncomingApproval: boolean } }) {
  return (
    <div className={`px-5 py-3 rounded-xl border-2 shadow-sm min-w-[140px] text-center ${
      data.hasIncomingApproval
        ? 'border-primary/40 bg-primary/5'
        : 'border-amber-500/50 bg-amber-500/5'
    }`}>
      <Handle type="target" position={Position.Left} id="target" className="!bg-primary !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 justify-center">
        <CheckCircle2 className={`h-4 w-4 ${data.hasIncomingApproval ? 'text-primary' : 'text-warning'}`} />
        <span className={`text-sm font-semibold ${data.hasIncomingApproval ? 'text-primary' : 'text-warning'}`}>{data.name}</span>
      </div>
      {!data.hasIncomingApproval && (
        <div className="flex items-center gap-1 justify-center mt-1">
          <AlertCircle className="h-3 w-3 text-warning" />
          <span className="text-xs text-warning">Aucun lien entrant</span>
        </div>
      )}
    </div>
  );
}

function StepNode({ data }: { data: { label: string; hasRoles: boolean; isSelected: boolean; isComplete: boolean; hasApprove: boolean; hasReject: boolean; onDelete?: () => void } }) {
  return (
    <div className={`group relative px-5 py-3 rounded-xl border-2 shadow-sm min-w-[140px] text-center cursor-pointer transition-all ${
      data.isSelected
        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
        : !data.isComplete
          ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500'
          : data.hasRoles
            ? 'border-muted-foreground/30 bg-background hover:border-primary/50'
            : 'border-destructive/50 bg-destructive/5 hover:border-destructive'
    }`}>
      <Handle type="target" position={Position.Left} id="target" className="!bg-muted-foreground !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} id="source" className="!bg-muted-foreground !w-2.5 !h-2.5" />
      {data.onDelete && (
        <button
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive/90 z-10"
          onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <div className="flex items-center gap-2 justify-center">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      {!data.hasRoles && (
        <div className="flex items-center gap-1 justify-center mt-1">
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-xs text-destructive">Aucun rôle</span>
        </div>
      )}
      {!data.isComplete && data.hasRoles && (
        <div className="flex items-center gap-1 justify-center mt-1">
          <AlertCircle className="h-3 w-3 text-warning" />
          <span className="text-xs text-warning">
            {!data.hasApprove && !data.hasReject ? 'Validation + Rejet manquants' : !data.hasApprove ? 'Validation manquante' : 'Rejet manquant'}
          </span>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  respondent: RespondentNode,
  validated: ValidatedNode,
  step: StepNode,
};

const edgeTypes: EdgeTypes = {
  editable: EditableEdge,
};

// --- Main Component ---

export interface WorkflowGraphEditorProps {
  steps: ValidationStep[];
  onStepsChange: (steps: ValidationStep[]) => void;
  inheritedRoles: InheritedRole[];
  responderRoles?: string[];
  onResponderRolesChange?: (roles: string[]) => void;
  respondentViewerRoles?: string[];
  onRespondentViewerRolesChange?: (roles: string[]) => void;
  validatedViewerRoles?: string[];
  onValidatedViewerRolesChange?: (roles: string[]) => void;
  respondentLinks?: { on_approve?: string; on_reject?: string };
  onRespondentLinksChange?: (links: { on_approve?: string; on_reject?: string }) => void;
  nodePositions?: Record<string, { x: number; y: number }>;
  onNodePositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
  edgePoints?: Record<string, Array<{ x: number; y: number }>>;
  onEdgePointsChange?: (points: Record<string, Array<{ x: number; y: number }>>) => void;
  boDefinitionId?: string;
  startNodeId?: string | null;
  startNodeName?: string;
  endNodeName?: string;
  onStartNodeNameChange?: (name: string) => void;
  onEndNodeNameChange?: (name: string) => void;
}

function WorkflowGraphEditorInner(props: WorkflowGraphEditorProps) {
  const {
    inheritedRoles,
    responderRoles = [],
    onResponderRolesChange,
    respondentViewerRoles = [],
    onRespondentViewerRolesChange,
    validatedViewerRoles = [],
    onValidatedViewerRolesChange,
    startNodeName = 'Répondant',
    endNodeName = 'Validé',
    onStartNodeNameChange,
    onEndNodeNameChange,
  } = props;

  const {
    selectedNodeId: _selectedNodeId,
    selectedEdgeId,
    selectedStep,
    isRespondentSelected,
    isValidatedSelected,
    pendingConnection,
    showPanel,
    reactFlowWrapper,
    internalNodes,
    edges,
    onNodesChange,
    onNodeClick,
    onConnect,
    onEdgeClick,
    onPaneClick,
    handleConnectionTypeSelect,
    handleCancelConnection,
    handleAddStep,
    handleUpdateStep,
    handleDeleteStep,
    deleteSelectedEdge,
    handleClosePanel,
  } = useWorkflowGraph(props);

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Canvas */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 relative" ref={reactFlowWrapper}>
        <div className="absolute inset-0 bottom-[37px]">
          <ReactFlow
            nodes={internalNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onNodeClick={onNodeClick}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            panOnDrag
            zoomOnScroll={false}
            preventScrolling={false}
            minZoom={0.5}
            maxZoom={1.5}
            elementsSelectable
            nodesDraggable
            nodesConnectable
            edgesFocusable
            className="cursor-grab active:cursor-grabbing"
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>

          <CanvasOverlay
            selectedEdgeId={selectedEdgeId}
            onDeleteEdge={deleteSelectedEdge}
            pendingConnection={pendingConnection}
            onConnectionTypeSelect={handleConnectionTypeSelect}
            onConnectionCancel={handleCancelConnection}
          />
        </div>

        {/* Bottom toolbar: add step */}
        <WorkflowToolbar onAddStep={handleAddStep} />
      </div>

      {/* Side panel */}
      {showPanel && (
        <WorkflowNodePanel
          selectedStep={selectedStep}
          isRespondentSelected={isRespondentSelected}
          isValidatedSelected={isValidatedSelected}
          startNodeName={startNodeName}
          endNodeName={endNodeName}
          selectedEdgeId={selectedEdgeId}
          inheritedRoles={inheritedRoles}
          responderRoles={responderRoles}
          respondentViewerRoles={respondentViewerRoles}
          validatedViewerRoles={validatedViewerRoles}
          onResponderRolesChange={onResponderRolesChange}
          onRespondentViewerRolesChange={onRespondentViewerRolesChange}
          onValidatedViewerRolesChange={onValidatedViewerRolesChange}
          onStartNodeNameChange={onStartNodeNameChange}
          onEndNodeNameChange={onEndNodeNameChange}
          onUpdateStep={handleUpdateStep}
          onDeleteStep={handleDeleteStep}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}

export function WorkflowGraphEditor(props: WorkflowGraphEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowGraphEditorInner {...props} />
    </ReactFlowProvider>
  );
}
