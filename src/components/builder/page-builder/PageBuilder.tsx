import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Loader2, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn, generateId } from '@/lib/utils';
import { BlockPalette } from './BlockPalette';
import { PageBuilderPreviewPane } from './PageBuilderPreviewPane';
import { BlockConfigPanel } from './block-config/BlockConfigPanel';
import { PageBuilderHeader } from './PageBuilderHeader';
import { getGridCellSizes, wouldOverlap } from './page-builder-utils';
import { useBoDefinitions, useInheritedRoles } from './usePageBuilderQueries';
import { BLOCK_DEFINITIONS, type PageBlock, type PageBuilderConfig, type BlockType } from './types';

interface PageBuilderProps {
  viewId: string;
  viewName: string;
  clientId?: string | null;
  onClose: () => void;
}

export function PageBuilder({ viewId, viewName, clientId, onClose }: PageBuilderProps) {
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isPublished, setIsPublished] = useState(false);
  const isInitialMount = useRef(true);

  const { data: boDefinitions = [] } = useBoDefinitions(clientId);
  const { data: inheritedRoles = [] } = useInheritedRoles(viewId, clientId);

  // Load view configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await api.get<{ config: PageBuilderConfig | null; is_published: boolean } | null>(
          `/api/view-configs/${viewId}`
        );

        if (data) {
          setIsPublished(data.is_published ?? false);
          if (data.config) {
            const config = data.config as PageBuilderConfig;
            if (config.blocks && Array.isArray(config.blocks)) {
              let nextRow = 1;
              const blocksWithRows = config.blocks.map((b: PageBlock) => {
                if (!b.position.rowStart) {
                  const rs = nextRow;
                  nextRow += (b.position.rowSpan || 2);
                  return { ...b, position: { ...b.position, rowStart: rs } };
                }
                nextRow = b.position.rowStart + (b.position.rowSpan || 2);
                return b;
              });
              setBlocks(blocksWithRows);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load view config:', error);
        toast.error('Erreur lors du chargement de la configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [viewId]);

  // Auto-save: doSave function
  const doSave = useCallback(async () => {
    try {
      const config: PageBuilderConfig = {
        blocks,
        settings: { gap: 16, padding: 16 },
      };
      await api.patch(`/api/view-configs/${viewId}`, { config: config as Record<string, unknown> });
      queryClient.invalidateQueries({ queryKey: queryKeys.viewConfigs.byId(viewId) });
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  }, [blocks, viewId, queryClient]);

  const doSaveRef = useRef(doSave);
  useEffect(() => { doSaveRef.current = doSave; }, [doSave]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSave = useCallback(() => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await doSaveRef.current();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  }, []);

  // Trigger auto-save when blocks change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    triggerSave();
  }, [blocks, triggerSave]);

  // Cleanup save timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Publish (one-way, no unpublish)
  const handlePublish = async () => {
    if (isPublished) return;
    try {
      const config: PageBuilderConfig = { blocks, settings: { gap: 16, padding: 16 } };
      await api.patch(`/api/view-configs/${viewId}`, {
        config: config as Record<string, unknown>,
        is_published: true,
        published_at: new Date().toISOString(),
      });
      setIsPublished(true);
      toast.success('Vue publiée');
    } catch (error) {
      console.error('Failed to publish:', error);
      toast.error('Erreur lors de la publication');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const dragStartPos = useRef<{ colStart: number; rowStart: number } | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    const activeData = event.active.data.current;
    if (activeData?.type === 'canvas-block') {
      const block = blocks.find(b => b.id === event.active.id);
      if (block) {
        dragStartPos.current = {
          colStart: block.position.colStart || 1,
          rowStart: block.position.rowStart || 1,
        };
      }
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, delta } = event;
    const activeData = active.data.current;
    if (activeData?.type !== 'canvas-block' || !dragStartPos.current) return;

    const sizes = getGridCellSizes();
    if (!sizes) return;

    const colDelta = Math.round(delta.x / sizes.colWidth);
    const rowDelta = Math.round(delta.y / sizes.rowHeight);

    const block = blocks.find(b => b.id === active.id);
    if (!block) return;

    const colSpan = block.position.colSpan;
    const rowSpan = block.position.rowSpan || 2;
    const newColStart = Math.max(1, Math.min(13 - colSpan, dragStartPos.current.colStart + colDelta));
    const newRowStart = Math.max(1, dragStartPos.current.rowStart + rowDelta);

    // Only update if position actually changed and no overlap
    if (block.position.colStart !== newColStart || block.position.rowStart !== newRowStart) {
      if (!wouldOverlap(String(active.id), newColStart, colSpan, newRowStart, rowSpan, blocks)) {
        setBlocks(prev => prev.map(b =>
          b.id === active.id
            ? { ...b, position: { ...b.position, colStart: newColStart, rowStart: newRowStart } }
            : b
        ));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    dragStartPos.current = null;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Check if it's a drop from the palette
    if (activeData?.type === 'palette-block') {
      const blockType = activeData.blockType as BlockType;
      const category = activeData.category as 'structure' | 'business';
      const definition = BLOCK_DEFINITIONS.find((d) => d.type === blockType);
      if (!definition) return;

      const defaultConfig = { ...definition.defaultConfig };

      // Check if dropping a business block onto a section
      const droppedOnSection = overData?.type === 'section-drop-zone'
        ? (overData.sectionId as string)
        : null;

      // Business blocks must be dropped into a section
      if (category === 'business' && !droppedOnSection) {
        // Find a section to auto-assign, or reject the drop
        const sections = blocks.filter(b => b.type === 'section' || b.type === 'sub_section');
        if (sections.length > 0) {
          // Drop into the last section by default
          const targetSection = sections[sections.length - 1];
          const newBlock = {
            id: generateId(),
            type: blockType,
            parentId: targetSection.id,
            position: {
              colStart: 1,
              colSpan: definition.defaultPosition.colSpan || 12,
              rowSpan: 2,
              rowIndex: blocks.filter(b => b.parentId === targetSection.id).length,
              rowStart: 1,
            },
            isActive: true,
            config: defaultConfig,
          } as PageBlock;

          setBlocks((prev) => [...prev, newBlock]);
          setSelectedBlockId(newBlock.id);
          return;
        }
        // No sections exist - allow dropping directly on canvas (backward compat)
      }

      if (category === 'business' && droppedOnSection) {
        // Drop business block inside a section
        const newBlock = {
          id: generateId(),
          type: blockType,
          parentId: droppedOnSection,
          position: {
            colStart: 1,
            colSpan: definition.defaultPosition.colSpan || 12,
            rowSpan: 2,
            rowIndex: blocks.filter(b => b.parentId === droppedOnSection).length,
            rowStart: 1,
          },
          isActive: true,
          config: defaultConfig,
        } as PageBlock;

        setBlocks((prev) => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
        return;
      }

      // Structure block or business block without section → drop on canvas
      // Calculate the next available rowStart (only from top-level blocks)
      let maxRowEnd = 0;
      blocks.filter(b => !b.parentId).forEach(b => {
        const rs = b.position.rowStart || 1;
        const rSpan = b.position.rowSpan || 2;
        maxRowEnd = Math.max(maxRowEnd, rs + rSpan);
      });

      const newBlock = {
        id: generateId(),
        type: blockType,
        position: {
          colStart: 1,
          colSpan: definition.defaultPosition.colSpan || 12,
          rowSpan: blockType === 'separator' ? 2 : (blockType === 'section' || blockType === 'sub_section' ? 6 : 4),
          rowIndex: blocks.filter(b => !b.parentId).length,
          rowStart: maxRowEnd > 0 ? maxRowEnd : 1,
        },
        isActive: true,
        config: defaultConfig,
      } as PageBlock;

      setBlocks((prev) => [...prev, newBlock]);
      setSelectedBlockId(newBlock.id);
      return;
    }
    // canvas-block positions are already updated in real-time via handleDragMove
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id && b.parentId !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const handleUpdateBlock = (updatedBlock: PageBlock) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
    );
  };

  const handleResizeBlock = (id: string, colSpan: number) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, position: { ...b.position, colSpan } } : b
      )
    );
  };

  const handleResizeBlockHeight = (id: string, rowSpan: number) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, position: { ...b.position, rowSpan } } : b
      )
    );
  };

  const handleMoveBlock = (id: string, colStart: number) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, position: { ...b.position, colStart } } : b
      )
    );
  };

  const handleMoveBlockRow = (id: string, rowStart: number) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, position: { ...b.position, rowStart } } : b
      )
    );
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
        <PageBuilderHeader
          viewName={viewName}
          onClose={onClose}
          inheritedRoles={inheritedRoles}
          saveStatus={saveStatus}
          isPublished={isPublished}
          onPublish={handlePublish}
        />

        {/* Builder Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 min-h-0 flex">
            {/* Left: Block Palette as nav icons */}
            <div className={cn("border-r shrink-0 overflow-y-auto", leftPanelCollapsed ? "w-14" : "w-44")}>
              <BlockPalette collapsed={leftPanelCollapsed} />
            </div>
            {/* Center: Live Preview */}
            <div className="flex-1 min-w-0 p-4 overflow-auto relative">
              {/* Toggle buttons */}
              <div className="absolute top-2 left-2 z-10 flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                >
                  <PanelLeftClose className={cn("h-4 w-4", leftPanelCollapsed && "rotate-180")} />
                </Button>
              </div>
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                >
                  <PanelRightClose className={cn("h-4 w-4", rightPanelCollapsed && "rotate-180")} />
                </Button>
              </div>
              <PageBuilderPreviewPane
                viewId={viewId}
                viewName={viewName}
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onDeleteBlock={handleDeleteBlock}
                onResizeBlock={handleResizeBlock}
                onResizeBlockHeight={handleResizeBlockHeight}
                onMoveBlock={handleMoveBlock}
                onMoveBlockRow={handleMoveBlockRow}
                settings={{ gap: 16, padding: 16 }}
                boDefinitions={boDefinitions}
              />
            </div>

            {/* Right: Config Panel */}
            {!rightPanelCollapsed && (
              <div className="w-[340px] border-l shrink-0 p-4 pr-5 overflow-auto">
                <BlockConfigPanel
                  block={selectedBlock}
                  boDefinitions={boDefinitions}
                  inheritedRoles={inheritedRoles}
                  clientId={clientId}
                  onUpdate={handleUpdateBlock}
                  onDelete={() => selectedBlockId && handleDeleteBlock(selectedBlockId)}
                />
              </div>
            )}
          </div>

          <DragOverlay>
            {activeId && activeId.startsWith('palette-') && (() => {
              const blockType = activeId.replace('palette-', '');
              const def = BLOCK_DEFINITIONS.find(d => d.type === blockType);
              return (
                <div className="bg-card border rounded-lg p-3 shadow-lg opacity-80">
                  {def?.label || 'Nouveau bloc'}
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
    </div>,
    document.body,
  );
}
