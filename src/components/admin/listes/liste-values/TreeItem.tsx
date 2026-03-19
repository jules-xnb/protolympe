import { Button } from '@/components/ui/button';
import { Plus, Pencil, ChevronRight, ChevronDown, Archive, ArchiveRestore } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ListeValue } from '@/hooks/useListes';
import type { TreeNode } from './types';

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  editingId: string | null;
  onEdit: (value: ListeValue) => void;
  onArchive: (value: ListeValue) => void;
  onRestore?: (value: ListeValue) => void;
  onAddChild: (parentId: string) => void;
  isArchiving: boolean;
  expandedIds: Set<string>;
  toggleExpanded: (id: string) => void;
  showArchived?: boolean;
}

export function TreeItem({ node, depth, editingId, onEdit, onArchive, onRestore, onAddChild, isArchiving, expandedIds, toggleExpanded, showArchived }: TreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isArchived = !node.is_active;

  return (
    <div className="w-full overflow-hidden">
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg border bg-card transition-colors hover:bg-muted/50 overflow-hidden",
          editingId === node.id && "ring-2 ring-primary",
          isArchived && "opacity-60"
        )}
        style={{ marginLeft: depth * 20, maxWidth: `calc(100% - ${depth * 20}px)` }}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => toggleExpanded(node.id)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}

        {node.color && (
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
        )}
        <div className="flex-1 w-0 min-w-0 overflow-hidden">
          <div className="font-medium text-sm truncate">{node.label}</div>
          <div className="text-xs text-muted-foreground font-mono truncate">{node.code}</div>
        </div>
        <div className="flex gap-1 shrink-0">
          {isArchived ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary hover:text-primary"
              onClick={() => onRestore?.(node)}
              disabled={isArchiving}
              title="Restaurer"
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(node.id)} title="Ajouter une sous-valeur">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(node)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onArchive(node)}
                disabled={isArchiving}
                title="Archiver"
              >
                <Archive className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {node.children.map(child => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              editingId={editingId}
              onEdit={onEdit}
              onArchive={onArchive}
              onRestore={onRestore}
              onAddChild={onAddChild}
              isArchiving={isArchiving}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              showArchived={showArchived}
            />
          ))}
        </div>
      )}
    </div>
  );
}
