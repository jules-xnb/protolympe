import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Building2, Check, ChevronsUpDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { useT } from '@/hooks/useT';
import type { EntitySummary } from '@/lib/eo/eo-details-calculator';

interface EoDetailsHierarchySectionProps {
  entity: {
    id: string;
    name: string;
    parent_id?: string | null;
  };
  parentEntity: { id: string; name: string } | null | undefined;
  parentCandidates: EntitySummary[];
  children: EntitySummary[];
  activeChildren: EntitySummary[];
  isFieldVisible: (field: string) => boolean;
  isFieldEditable: (field: string) => boolean;
  onNavigateToEntity?: (entityId: string) => void;
  onUpdateParent: (parentId: string | null) => Promise<void>;
}

export function EoDetailsHierarchySection({
  entity,
  parentEntity,
  parentCandidates,
  children,
  activeChildren,
  isFieldVisible,
  isFieldEditable,
  onNavigateToEntity,
  onUpdateParent,
}: EoDetailsHierarchySectionProps) {
  const { t } = useT();
  const [editingParent, setEditingParent] = useState(false);
  const [showAllChildren, setShowAllChildren] = useState(false);
  const [showInactiveChildren, setShowInactiveChildren] = useState(false);

  const inactiveChildrenCount = children.length - activeChildren.length;
  const displayedChildren = showInactiveChildren ? children : activeChildren;

  return (
    <>
      {/* Parent field */}
      {isFieldVisible('parent') && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">{t('labels.parent')}</span>
          {editingParent ? (
            <Popover open onOpenChange={(o) => { if (!o) setEditingParent(false); }}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="h-8 w-full justify-between text-sm font-normal">
                  {entity.parent_id
                    ? parentCandidates.find(e => e.id === entity.parent_id)?.name || t('empty.no_parent')
                    : t('empty.no_parent')}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('placeholders.search_entity')} />
                  <CommandList>
                    <CommandEmpty>{t('empty.no_results')}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__none__"
                        onSelect={async () => {
                          try { await onUpdateParent(null); setEditingParent(false); } catch { /* intentionally ignored */ }
                        }}
                      >
                        <Check className={`mr-2 h-3.5 w-3.5 ${!entity.parent_id ? 'opacity-100' : 'opacity-0'}`} />
                        {t('empty.no_parent')}
                      </CommandItem>
                      {parentCandidates.map(e => (
                        <CommandItem
                          key={e.id}
                          value={e.name}
                          onSelect={async () => {
                            try { await onUpdateParent(e.id); setEditingParent(false); } catch { /* intentionally ignored */ }
                          }}
                        >
                          <Check className={`mr-2 h-3.5 w-3.5 ${entity.parent_id === e.id ? 'opacity-100' : 'opacity-0'}`} />
                          {e.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-1.5 group">
              {parentEntity?.name ? (
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm font-medium"
                  onClick={() => onNavigateToEntity?.(parentEntity.id)}
                >
                  {parentEntity.name}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
              {isFieldEditable('parent') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5"
                  onClick={() => setEditingParent(true)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('eo.child_entities')} ({activeChildren.length}{inactiveChildrenCount > 0 ? ` / ${children.length}` : ''})
          </h4>
          <div className="space-y-1">
            {(showAllChildren ? displayedChildren : displayedChildren.slice(0, 5)).map((child) => (
              <Button
                key={child.id}
                variant="ghost"
                type="button"
                className="flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors h-auto justify-start"
                onClick={() => onNavigateToEntity?.(child.id)}
              >
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className={cn("truncate", child.is_active === false && "text-muted-foreground")}>{child.name}</span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0 ml-auto",
                    child.is_active !== false ? "bg-primary" : "bg-destructive/60"
                  )}
                  title={child.is_active !== false ? t('status.active') : t('status.inactive')}
                />
              </Button>
            ))}
          </div>
          {displayedChildren.length > 5 && !showAllChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowAllChildren(true)}
            >
              {t('eo.show_more', { count: String(displayedChildren.length - 5) })}
            </Button>
          )}
          {showAllChildren && children.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowAllChildren(false)}
            >
              {t('eo.collapse')}
            </Button>
          )}
          {inactiveChildrenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => setShowInactiveChildren(prev => !prev)}
            >
              {showInactiveChildren
                ? t('buttons.hide_inactive')
                : t('eo.show_inactive', { count: String(inactiveChildrenCount) })}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
