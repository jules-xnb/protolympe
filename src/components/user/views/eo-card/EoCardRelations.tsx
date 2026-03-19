import { EoTreeView } from '@/components/admin/entities/EoTreeView';
import { EoCanvasView } from '@/components/admin/entities/EoCanvasView';
import type { OrganizationalEntity } from './EoCardFields';

export interface EoCardTreeViewProps {
  selectedEoId: string | null;
  onEntityClick: (entity: OrganizationalEntity) => void;
  allVisibleEntities: OrganizationalEntity[];
  allBaseEntities: OrganizationalEntity[];
  hasActiveFilters: boolean;
  hasFixedPreFilters: boolean;
  searchQuery: string;
}

export function EoCardTreeView({
  selectedEoId,
  onEntityClick,
  allVisibleEntities,
  allBaseEntities,
  hasActiveFilters,
  hasFixedPreFilters,
  searchQuery,
}: EoCardTreeViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <EoTreeView
          entities={hasActiveFilters || hasFixedPreFilters ? allVisibleEntities : allBaseEntities}
          allEntities={hasActiveFilters || hasFixedPreFilters ? allBaseEntities : undefined}
          selectedEntityId={selectedEoId || undefined}
          onEntityClick={onEntityClick}
          className="h-full border-none rounded-none"
        />
      </div>
      {allVisibleEntities.length > 0 && (
        <div className="flex items-center px-4 py-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {allVisibleEntities.length} entité{allVisibleEntities.length !== 1 ? 's' : ''}
            {(hasActiveFilters || searchQuery.trim()) && allVisibleEntities.length !== allBaseEntities.length && (
              <span> sur {allBaseEntities.length}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface EoCardCanvasViewProps {
  allVisibleEntities: OrganizationalEntity[];
  allBaseEntities: OrganizationalEntity[];
  selectedEoId: string | null;
  onEntityClick: (entity: OrganizationalEntity) => void;
  hasActiveFilters: boolean;
  searchQuery: string;
}

export function EoCardCanvasView({
  allVisibleEntities,
  allBaseEntities,
  selectedEoId,
  onEntityClick,
  hasActiveFilters,
  searchQuery,
}: EoCardCanvasViewProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <EoCanvasView
          entities={allVisibleEntities}
          allEntities={allBaseEntities}
          selectedEntityId={selectedEoId ?? undefined}
          onEntityClick={onEntityClick}
        />
      </div>
      {allVisibleEntities.length > 0 && (
        <div className="flex items-center px-4 py-3 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {allVisibleEntities.length} entité{allVisibleEntities.length !== 1 ? 's' : ''}
            {(hasActiveFilters || searchQuery.trim()) && allVisibleEntities.length !== allBaseEntities.length && (
              <span> sur {allBaseEntities.length}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
