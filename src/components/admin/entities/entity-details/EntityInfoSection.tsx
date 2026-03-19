import React, { useState } from 'react';
import { StatusChip } from '@/components/ui/status-chip';
import { Button } from '@/components/ui/button';
import {
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Download, X, Archive } from 'lucide-react';

// Flexible entity type that accepts both admin and user-side entity shapes
export type DrawerEntity = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  level?: number;
  is_active: boolean;
  parent_id?: string | null;
  path?: string;
  slug?: string;
  client_id?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  clients?: { name: string } | null;
  parent?: { name: string }[] | null;
};

interface EntityInfoSectionProps {
  entity: DrawerEntity;
  ancestors: DrawerEntity[];
  activeChildren: DrawerEntity[];
  inactiveChildren: DrawerEntity[];
  onNavigateToEntity?: (entityId: string) => void;
  onToggleActive: (checked: boolean) => Promise<void>;
  savedIndicator: boolean;
  onArchive?: () => void;
}

export function EntityInfoSection({
  entity,
  ancestors,
  activeChildren,
  inactiveChildren,
  onNavigateToEntity,
  savedIndicator: _savedIndicator,
  onArchive,
}: EntityInfoSectionProps) {
  const [showAllChildren, setShowAllChildren] = useState(false);

  return (
    <>
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-xl font-semibold">
                {entity.name}
              </SheetTitle>
              <StatusChip status={entity.is_active ? 'actif' : 'inactif'} />
            </div>
            <div className="flex items-center gap-3">
              {onArchive && (
                <Button variant="ghost" onClick={onArchive}>
                  Archiver
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" className="h-10">
                Exporter
                <Download className="h-4 w-4" />
              </Button>
              <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-4 w-4" />
                <span className="sr-only">Fermer</span>
              </SheetClose>
            </div>
          </div>
          {/* Breadcrumb */}
          {ancestors.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap text-sm text-muted-foreground">
              {ancestors.map((ancestor) => (
                <span key={ancestor.id} className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto p-0 text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
                    onClick={() => onNavigateToEntity?.(ancestor.id)}
                  >
                    {ancestor.name}
                  </Button>
                  <span className="text-muted-foreground/50">/</span>
                </span>
              ))}
              <span className="font-medium text-foreground">{entity.name}</span>
            </div>
          )}
          {entity.code && !ancestors.length && (
            <div className="text-sm text-muted-foreground font-mono">{entity.code}</div>
          )}
        </SheetHeader>
      </div>

      {/* Children section */}
      <div className="px-6 mt-3 space-y-3">

        {/* Liste des enfants */}
        {(activeChildren.length > 0 || inactiveChildren.length > 0) && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Enfants ({activeChildren.length + inactiveChildren.length})
            </span>
            <div className="flex flex-col gap-0.5">
              {(showAllChildren ? activeChildren : activeChildren.slice(0, 5)).map(child => (
                <Button
                  key={child.id}
                  type="button"
                  variant="ghost"
                  className="justify-start gap-2 px-2 py-1.5 h-auto text-sm"
                  onClick={() => onNavigateToEntity?.(child.id)}
                >
                  <span className="h-2 w-2 rounded-full shrink-0 bg-emerald-500" />
                  {child.name}
                </Button>
              ))}
              {showAllChildren && inactiveChildren.map(child => (
                <Button
                  key={child.id}
                  type="button"
                  variant="ghost"
                  className="justify-start gap-2 px-2 py-1.5 h-auto text-sm text-muted-foreground"
                  onClick={() => onNavigateToEntity?.(child.id)}
                >
                  <span className="h-2 w-2 rounded-full shrink-0 bg-muted-foreground/50" />
                  {child.name}
                </Button>
              ))}
            </div>
            {(activeChildren.length > 5 || inactiveChildren.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1 px-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllChildren(prev => !prev)}
              >
                {showAllChildren
                  ? 'Voir moins'
                  : `Voir plus (${activeChildren.length - 5 + inactiveChildren.length > 0 ? Math.max(0, activeChildren.length - 5) + inactiveChildren.length : activeChildren.length - 5})`
                }
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
