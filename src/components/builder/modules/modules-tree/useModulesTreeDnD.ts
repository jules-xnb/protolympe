import { useState, useMemo, useCallback } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragMoveEvent,
} from '@dnd-kit/core';
import {
  type NavigationConfigWithRelations,
  useMoveNavigationConfig,
} from '@/hooks/useNavigationConfigs';
import type { DropPosition } from './types';

export function useModulesTreeDnD(items: NavigationConfigWithRelations[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: DropPosition } | null>(null);
  const moveMutation = useMoveNavigationConfig();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return items.find(item => item.id === activeId) || null;
  }, [activeId, items]);

  const isDescendant = useCallback((itemId: string, targetId: string): boolean => {
    const children = items.filter(i => i.parent_id === itemId);
    for (const child of children) {
      if (child.id === targetId) return true;
      if (isDescendant(child.id, targetId)) return true;
    }
    return false;
  }, [items]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setDropTarget(null);
      return;
    }

    const overItem = items.find(i => i.id === over.id);
    const activeItemData = items.find(i => i.id === active.id);

    if (!overItem || !activeItemData) {
      setDropTarget(null);
      return;
    }

    if (overItem.id === activeItemData.id || isDescendant(activeItemData.id, overItem.id)) {
      setDropTarget(null);
      return;
    }

    const rect = over.rect;
    if (rect) {
      const pointerY = (event.activatorEvent as PointerEvent)?.clientY || 0;
      const deltaY = event.delta.y;
      const currentY = pointerY + deltaY;

      const topThreshold = rect.top + rect.height * 0.25;
      const bottomThreshold = rect.top + rect.height * 0.75;

      const isModule = !overItem.view_config_id;

      let position: DropPosition;
      if (currentY < topThreshold) {
        position = 'before';
      } else if (currentY > bottomThreshold) {
        position = 'after';
      } else if (isModule) {
        position = 'inside';
      } else {
        position = 'after';
      }

      setDropTarget({ id: overItem.id, position });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    const currentDropTarget = dropTarget;
    setDropTarget(null);

    if (!over || active.id === over.id || !currentDropTarget) return;

    const draggedItem = items.find(i => i.id === active.id);
    const overItem = items.find(i => i.id === over.id);

    if (!draggedItem || !overItem) return;

    if (overItem.id === draggedItem.id || isDescendant(draggedItem.id, overItem.id)) {
      return;
    }

    let newParentId: string | null;
    let newDisplayOrder: number;
    let siblingsToReorder: { id: string; display_order: number }[] = [];

    if (currentDropTarget.position === 'inside' && !overItem.view_config_id) {
      newParentId = overItem.id;
      const childrenOfTarget = items.filter(i => i.parent_id === overItem.id);
      newDisplayOrder = childrenOfTarget.length;
    } else {
      newParentId = overItem.parent_id;

      if (newParentId === draggedItem.id) {
        return;
      }

      const siblings = items
        .filter(i => i.parent_id === newParentId && i.id !== draggedItem.id)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

      const overIndex = siblings.findIndex(s => s.id === overItem.id);

      if (currentDropTarget.position === 'before') {
        newDisplayOrder = overIndex >= 0 ? overIndex : 0;
        siblingsToReorder = siblings.slice(overIndex >= 0 ? overIndex : 0).map((s, index) => ({
          id: s.id,
          display_order: newDisplayOrder + index + 1,
        }));
      } else {
        newDisplayOrder = overIndex >= 0 ? overIndex + 1 : siblings.length;
        siblingsToReorder = siblings.slice(overIndex >= 0 ? overIndex + 1 : siblings.length).map((s, index) => ({
          id: s.id,
          display_order: newDisplayOrder + index + 1,
        }));
      }
    }

    moveMutation.mutate({
      id: draggedItem.id,
      parent_id: newParentId,
      display_order: newDisplayOrder,
      siblingsToReorder,
      previousParentId: draggedItem.parent_id,
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDropTarget(null);
  };

  return {
    sensors,
    activeId,
    activeItem,
    dropTarget,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}
