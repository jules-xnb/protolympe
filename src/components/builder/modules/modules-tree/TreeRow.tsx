import { useCallback } from 'react';
import { getLucideIconFromKebab } from '@/lib/lucide-icon-lookup';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  FileText,
  Eye,
  EyeOff,
  Copy,
  FolderPlus,
  FilePlus,
  Puzzle,
  Settings,
} from 'lucide-react';
import type { TreeRowProps } from './types';

export function TreeRow({
  item,
  depth,
  expanded,
  isLast,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onViewClick,
  onAddGroup,
  onAddView,
  allItems,
  activeId,
  dropTarget,
}: TreeRowProps) {
  const { attributes, listeners, setNodeRef: setDragRef } = useDraggable({
    id: item.id,
    data: { item, depth },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: item.id,
    data: { item, depth },
  });

  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expanded.has(item.id);
  const isView = !!item.view_config_id;
  const isModule = !!item.client_module_id || item.type === 'module';
  const isBeingDragged = activeId === item.id;

  const isDropTarget = dropTarget?.id === item.id;
  const dropPosition = isDropTarget ? dropTarget.position : null;

  const getIcon = () => {
    if (item.icon) {
      const IconComp = getLucideIconFromKebab(item.icon);
      if (IconComp) return <IconComp className="h-4 w-4" />;
    }
    if (isModule) return <Puzzle className="h-4 w-4" />;
    return null;
  };

  const combinedRef = useCallback((el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
  }, [setDragRef, setDropRef]);

  const isLastVisible = isLast && (!hasChildren || !isExpanded);

  return (
    <>
      <div className="relative">
        {/* Drop indicator - before */}
        {dropPosition === 'before' && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-primary z-10"
            style={{ top: 0 }}
          />
        )}

        <div
          ref={combinedRef}
          className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 group transition-colors ${
            !isLastVisible ? 'border-b' : ''
          } ${
            isBeingDragged ? 'opacity-30' : ''
          } ${
            dropPosition === 'inside' && !isView
              ? 'bg-primary/10'
              : isModule
                ? 'bg-primary/5 hover:bg-primary/10'
                : !isView
                  ? 'bg-muted/40 hover:bg-muted/60'
                  : 'hover:bg-muted/30'
          }`}
        >
          {/* Column 1: Element name with indent + icons */}
          <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: `${depth * 24}px` }}>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
            </div>

            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-5 w-5 p-0.5 rounded hover:bg-muted"
                onClick={() => onToggle(item.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ) : (
              <div className="w-5 shrink-0" />
            )}

            {getIcon() && (
              <div className={`shrink-0 ${isModule ? 'text-primary' : isView ? 'text-primary' : 'text-muted-foreground'}`}>
                {getIcon()}
              </div>
            )}

            <span className={`truncate ${depth === 0 ? 'font-semibold' : 'font-medium'} ${isView ? 'text-foreground' : ''}`}>
              {item.label}
            </span>

            {item.display_label && item.display_label !== item.label && (
              <span className="text-xs text-muted-foreground truncate shrink-0">
                → {item.display_label}
              </span>
            )}
          </div>

          {/* Column 2: Status */}
          <div className="shrink-0">
            {item.is_active ? (
              <span
                className="inline-flex items-center text-xs font-medium leading-none"
                style={{
                  backgroundColor: "hsl(var(--success))",
                  color: "hsl(var(--success-foreground))",
                  borderRadius: 9999,
                  padding: "7px 10px",
                }}
              >
                Actif
              </span>
            ) : (
              <span
                className="inline-flex items-center text-xs font-medium leading-none"
                style={{
                  backgroundColor: "transparent",
                  color: "hsl(var(--foreground))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 9999,
                  padding: "7px 10px",
                }}
              >
                Inactif
              </span>
            )}
          </div>

          {/* Column 3: Actions */}
          <div className="flex items-center gap-0.5 w-[140px] justify-end shrink-0">
            {isModule && (
              <Button
                variant="text"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewClick?.(item);
                }}
              >
                Configurer
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {isView && !isModule && (
              <Button
                variant="text"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewClick?.(item);
                }}
              >
                Builder
                <Edit className="h-4 w-4" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isView && !isModule && (
                  <>
                    <DropdownMenuItem onClick={() => onAddGroup?.(item.id)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Ajouter un groupe
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddView?.(item.id)}>
                      <FilePlus className="h-4 w-4 mr-2" />
                      Ajouter une vue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {isModule && (
                  <>
                    <DropdownMenuItem onClick={() => onViewClick?.(item)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Renommer
                </DropdownMenuItem>
                {!isModule && (
                  <DropdownMenuItem onClick={() => onDuplicate(item)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                )}
                {isView && !isModule && (
                  <DropdownMenuItem onClick={() => onViewClick?.(item)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Ouvrir le Builder
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onToggleActive(item)}>
                  {item.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {item.is_active ? 'Désactiver' : 'Activer'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Drop indicator - after */}
        {dropPosition === 'after' && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-primary z-10"
            style={{ bottom: 0 }}
          />
        )}
      </div>

      {hasChildren && isExpanded && (
        <>
          {item.children!.map((child, childIndex) => (
            <TreeRow
              key={child.id}
              item={child}
              depth={depth + 1}
              expanded={expanded}
              isLast={isLast && childIndex === item.children!.length - 1}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onToggleActive={onToggleActive}
              onViewClick={onViewClick}
              onAddGroup={onAddGroup}
              onAddView={onAddView}
              allItems={allItems}
              activeId={activeId}
              dropTarget={dropTarget}
            />
          ))}
        </>
      )}
    </>
  );
}
