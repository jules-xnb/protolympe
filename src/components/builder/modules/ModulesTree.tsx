import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import {
  type NavigationConfigWithRelations,
} from '@/hooks/useNavigationConfigs';
import { TreeRow } from './modules-tree/TreeRow';
import { DragOverlayContent } from './modules-tree/DragOverlayContent';
import { useModulesTreeDnD } from './modules-tree/useModulesTreeDnD';

interface ModulesTreeProps {
  tree: NavigationConfigWithRelations[];
  items: NavigationConfigWithRelations[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (item: NavigationConfigWithRelations) => void;
  onDelete: (item: NavigationConfigWithRelations) => void;
  onDuplicate: (item: NavigationConfigWithRelations) => void;
  onToggleActive: (item: NavigationConfigWithRelations) => void;
  onViewClick?: (item: NavigationConfigWithRelations) => void;
  onAddGroup?: (parentId: string) => void;
  onAddView?: (parentId: string) => void;
}

export function ModulesTree({
  tree,
  items,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onViewClick,
  onAddGroup,
  onAddView,
}: ModulesTreeProps) {
  const {
    sensors,
    activeId,
    activeItem,
    dropTarget,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  } = useModulesTreeDnD(items);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div>
        {tree.map((item, index) => (
          <TreeRow
            key={item.id}
            item={item}
            depth={0}
            expanded={expanded}
            isLast={index === tree.length - 1}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onToggleActive={onToggleActive}
            onViewClick={onViewClick}
            onAddGroup={onAddGroup}
            onAddView={onAddView}
            allItems={items}
            activeId={activeId}
            dropTarget={dropTarget}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem && <DragOverlayContent item={activeItem} />}
      </DragOverlay>
    </DndContext>
  );
}
