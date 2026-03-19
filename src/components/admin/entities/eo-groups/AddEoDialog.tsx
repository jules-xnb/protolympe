import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Building2, GitBranch, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EoEntity } from './types';

interface AddEoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEntities: EoEntity[];
  existingEoIds: Set<string>;
  selectedEoIds: string[];
  onToggleEo: (id: string) => void;
  eoDescendants: Record<string, boolean>;
  onToggleDescendants: (id: string) => void;
  eoSearch: string;
  onSearchChange: (v: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function AddEoDialog({
  open,
  onOpenChange,
  allEntities,
  existingEoIds: _existingEoIds,
  selectedEoIds,
  onToggleEo,
  eoDescendants,
  onToggleDescendants,
  eoSearch,
  onSearchChange,
  onConfirm,
  isPending,
}: AddEoDialogProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build a set of EO paths that are selected with descendants -> their children are implicitly included
  const implicitPaths = new Set<string>();
  selectedEoIds.forEach((id) => {
    if (eoDescendants[id]) {
      const entity = allEntities.find((e) => e.id === id);
      if (entity?.path) implicitPaths.add(entity.path);
    }
  });

  const isImplicitlySelected = (entity: EoEntity): boolean => {
    if (!entity.path) return false;
    for (const parentPath of implicitPaths) {
      if (entity.path.startsWith(parentPath + '.')) return true;
    }
    return false;
  };

  // Build tree from flat list
  type TreeNode = EoEntity & { children: TreeNode[] };
  const tree = (() => {
    const nodeMap = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    allEntities.forEach((e) => nodeMap.set(e.id, { ...e, children: [] }));
    allEntities.forEach((e) => {
      const node = nodeMap.get(e.id)!;
      if (e.parent_id && nodeMap.has(e.parent_id)) {
        nodeMap.get(e.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sort = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach((n) => sort(n.children));
    };
    sort(roots);
    return roots;
  })();

  // When searching, force-expand all nodes so results are visible
  const isSearching = eoSearch.trim().length > 0;

  // Filter: keep nodes matching search + their ancestors
  const matchesSearch = (node: TreeNode): boolean => {
    if (!isSearching) return true;
    const q = eoSearch.toLowerCase();
    if (node.name.toLowerCase().includes(q) || node.code?.toLowerCase().includes(q)) return true;
    return node.children.some(matchesSearch);
  };

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    if (!matchesSearch(node)) return null;

    const isSelected = selectedEoIds.includes(node.id);
    const isImplicit = isImplicitlySelected(node);
    const isClickable = !isImplicit;
    const hasChildren = node.children.length > 0;
    const isExpanded = isSearching || expandedIds.has(node.id);
    const hasDesc = eoDescendants[node.id];

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors',
            isImplicit
              ? 'opacity-40 cursor-default'
              : 'hover:bg-accent cursor-pointer',
            isSelected && !isImplicit && 'bg-primary/10'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => isClickable && onToggleEo(node.id)}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => toggleExpand(node.id, e)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          ) : (
            <span className="w-[22px] shrink-0" />
          )}
          <Checkbox
            checked={isSelected || isImplicit}
            disabled={isImplicit}
            className={isImplicit ? 'opacity-50' : ''}
          />
          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{node.name}</span>
          {node.code && (
            <span className="text-xs text-muted-foreground shrink-0">{node.code}</span>
          )}
          {isImplicit && (
            <span className="text-xs text-muted-foreground shrink-0 ml-auto">Via parent</span>
          )}
          {isSelected && !isImplicit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleDescendants(node.id);
                  }}
                  className={cn(
                    'h-6 w-6 shrink-0 ml-auto',
                    hasDesc ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {hasDesc
                  ? 'Descendance incluse — cliquez pour retirer'
                  : 'Inclure les sous-entités'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {hasChildren && isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Gérer les EOs du regroupement</DialogTitle>
        </DialogHeader>
        <div className="relative shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={eoSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-0.5 pr-2">
            {tree.map((node) => renderNode(node))}
          </div>
        </ScrollArea>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
          >
            Enregistrer{selectedEoIds.length > 0 ? ` (${selectedEoIds.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
