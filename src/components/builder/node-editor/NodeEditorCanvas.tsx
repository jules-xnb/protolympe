import { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  Panel,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Save, Trash2, Loader2 } from 'lucide-react';
import { GenericNode } from './nodes/GenericNode';
import { NodeConfigPanel } from './NodeConfigPanel';
import { NodeBuilderPage } from './NodeBuilderPage';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const nodeTypes: NodeTypes = {
  generic: GenericNode,
};

interface ViewConfigData {
  nodes: Node[];
  edges: Edge[];
}

interface NodeEditorCanvasProps {
  viewId: string;
  viewName: string;
  onClose: () => void;
}

export function NodeEditorCanvas({ viewId, viewName, onClose }: NodeEditorCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [builderNodeId, setBuilderNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialMount = useRef(true);

  // Load existing config from database
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await api.get<{ config: ViewConfigData | null }>(`/api/view-configs/${viewId}`);

        if (data?.config) {
          const config = data.config;
          if (config.nodes) setNodes(config.nodes);
          if (config.edges) setEdges(config.edges);
        }
      } catch (error) {
        console.error('Error loading view config:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger la configuration',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [viewId, setNodes, setEdges]);

  // Track changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setHasUnsavedChanges(true);
  }, [nodes, edges]);

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: 'hsl(var(--primary))' } }, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleAddNode = useCallback(() => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'generic',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { label: 'Nouveau nœud', widgets: [] },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  }, [setNodes]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const handleNodeConfigChange = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }, [setNodes]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // Prepare config data - clean nodes to remove measured properties
      const cleanNodes = nodes.map(({ measured: _measured, ...node }) => node);
      const configData: ViewConfigData = {
        nodes: cleanNodes as Node[],
        edges,
      };

      await api.patch(`/api/view-configs/${viewId}`, { config: JSON.parse(JSON.stringify(configData)) });

      setHasUnsavedChanges(false);
      toast({
        title: 'Succès',
        description: 'Configuration enregistrée',
      });
    } catch (error) {
      console.error('Error saving view config:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer la configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [viewId, nodes, edges]);

  const handleCloseRequest = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmExit = useCallback(() => {
    setShowExitDialog(false);
    onClose();
  }, [onClose]);

  const handleOpenBuilder = useCallback((nodeId: string) => {
    setBuilderNodeId(nodeId);
  }, []);

  const handleCloseBuilder = useCallback(() => {
    setBuilderNodeId(null);
  }, []);

  const handleSaveWidgets = useCallback((nodeId: string, widgets: Array<{ id: string; type: string; title?: string }>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, widgets } } : n))
    );
    setBuilderNodeId(null);
  }, [setNodes]);

  const builderNode = builderNodeId ? nodes.find((n) => n.id === builderNodeId) : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-background/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleCloseRequest}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-lg">{viewName}</h1>
              {hasUnsavedChanges && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Non enregistré
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Éditeur de vue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddNode} disabled={isLoading}>
            Ajouter un nœud
            <Plus className="h-4 w-4" />
          </Button>
          {selectedNode && (
            <Button variant="outline" size="sm" onClick={handleDeleteNode} className="text-destructive hover:text-destructive">
              Supprimer
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/20"
            defaultEdgeOptions={{
              animated: true,
              style: { strokeWidth: 2 },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
            <Controls className="!bg-background !border !shadow-md" />
            <MiniMap 
              className="!bg-background !border !shadow-md"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'start': return 'hsl(var(--primary))';
                  case 'state': return 'hsl(var(--chart-1))';
                  case 'action': return 'hsl(var(--chart-2))';
                  case 'condition': return 'hsl(var(--chart-3))';
                  default: return 'hsl(var(--muted))';
                }
              }}
            />
            <Panel position="bottom-center" className="text-xs text-muted-foreground">
              Glissez pour connecter les nœuds • Double-cliquez pour modifier
            </Panel>
          </ReactFlow>
        </div>

        {/* Right panel: Node config */}
        <div
          className={cn(
            'w-80 border-l bg-background transition-all duration-300 overflow-hidden shrink-0',
            selectedNode ? 'translate-x-0' : 'translate-x-full w-0 border-l-0'
          )}
        >
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onChange={(data) => handleNodeConfigChange(selectedNode.id, data)}
              onClose={() => setSelectedNode(null)}
              onOpenBuilder={() => handleOpenBuilder(selectedNode.id)}
            />
          )}
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non enregistrées</AlertDialogTitle>
            <AlertDialogDescription>
              Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter sans sauvegarder ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quitter sans sauvegarder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Node Builder Page */}
      {builderNode && (
        <NodeBuilderPage
          nodeId={builderNode.id}
          nodeName={(builderNode.data as { label?: string }).label || 'Nœud'}
          initialWidgets={(builderNode.data as { widgets?: Array<{ id: string; type: string; title?: string }> }).widgets || []}
          onSave={(widgets) => handleSaveWidgets(builderNode.id, widgets)}
          onClose={handleCloseBuilder}
        />
      )}
    </div>
  );
}
