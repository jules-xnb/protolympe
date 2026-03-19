import { useMemo } from 'react';
import {
  Loader2,
  Building2,
  Columns3,
  Eye,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ViewSelectionStepProps {
  views: { id: string; name: string; config: unknown; moduleName: string | null; roles: string[] }[];
  viewsLoading: boolean;
  selections: Record<string, { columns: boolean; visibility: boolean }>;
  onToggleSelection: (viewId: string, type: 'columns' | 'visibility') => void;
  onToggleAllColumns: () => void;
  onToggleAllVisibility: () => void;
  allColumnsChecked: boolean;
  allVisibilityChecked: boolean;
  hasAnySelection: boolean;
  savingViews: boolean;
  isPending: boolean;
  onBack: () => void;
  onSkip: () => void;
  onCreateAndAdd: () => void;
}

export function ViewSelectionStep({
  views,
  viewsLoading,
  selections,
  onToggleSelection,
  onToggleAllColumns,
  onToggleAllVisibility,
  allColumnsChecked,
  allVisibilityChecked,
  hasAnySelection,
  savingViews,
  isPending,
  onBack,
  onSkip,
  onCreateAndAdd,
}: ViewSelectionStepProps) {
  // Group views by module
  const groupedViews = useMemo(() => {
    const groups = new Map<string, typeof views>();
    views.forEach(v => {
      const key = v.moduleName || 'Autres';
      const list = groups.get(key) || [];
      list.push(v);
      groups.set(key, list);
    });
    // Sort groups: named modules first (alphabetical), "Autres" last
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === 'Autres') return 1;
      if (b[0] === 'Autres') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [views]);

  return (
    <>
      {viewsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : views.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Aucune vue avec un bloc Organisation
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header row */}
          <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span className="flex-1">Vue</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-1.5 h-auto py-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground w-24 justify-center"
                  onClick={onToggleAllColumns}
                >
                  <Checkbox
                    checked={allColumnsChecked}
                    onCheckedChange={onToggleAllColumns}
                    className="h-3.5 w-3.5"
                  />
                  Tableau
                  <Columns3 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Afficher comme colonne dans le tableau des entités</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-1.5 h-auto py-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground w-24 justify-center"
                  onClick={onToggleAllVisibility}
                >
                  <Checkbox
                    checked={allVisibilityChecked}
                    onCheckedChange={onToggleAllVisibility}
                    className="h-3.5 w-3.5"
                  />
                  Fiche
                  <Eye className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Afficher dans la fiche détail de l'entité</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Grouped view rows */}
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {groupedViews.map(([moduleName, moduleViews]) => (
              <div key={moduleName}>
                {/* Module header */}
                <div className="flex items-center gap-2 px-3 py-1.5 mt-1 first:mt-0">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{moduleName}</span>
                  <div className="flex-1 border-t border-border/50" />
                </div>

                {/* Views in this module */}
                {moduleViews.map((view) => (
                  <div
                    key={view.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{view.name}</span>
                      </div>
                      {view.roles.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 ml-6 flex-wrap">
                          {view.roles.map(role => (
                            <Chip key={role} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
                              {role}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="w-24 flex justify-center">
                      <Checkbox
                        checked={selections[view.id]?.columns ?? false}
                        onCheckedChange={() => onToggleSelection(view.id, 'columns')}
                      />
                    </div>
                    <div className="w-24 flex justify-center">
                      <Checkbox
                        checked={selections[view.id]?.visibility ?? false}
                        onCheckedChange={() => onToggleSelection(view.id, 'visibility')}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 footer */}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={savingViews}
          className="mr-auto"
        >
          Retour
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={savingViews || isPending}
        >
          Passer
        </Button>
        {views.length > 0 && (
          <Button
            onClick={onCreateAndAdd}
            disabled={!hasAnySelection || savingViews || isPending}
          >
            Créer et ajouter
            {(savingViews || isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
