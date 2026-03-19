import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useClientModules, useActivateModule } from '@/hooks/useModules';
import { useCreateNavigationConfig } from '@/hooks/useNavigationConfigs';
import { MODULE_CATALOG, type ModuleCatalogEntry } from '@/lib/module-catalog';
import { getLucideIcon } from '@/lib/lucide-icon-lookup';
import { Loader2, Puzzle } from 'lucide-react';
import { toast } from 'sonner';

interface AddModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  displayOrder?: number;
}

export function AddModuleDialog({
  open,
  onOpenChange,
  parentId,
  displayOrder,
}: AddModuleDialogProps) {
  const { selectedClient } = useViewMode();
  const { data: clientModules = [] } = useClientModules(selectedClient?.id);
  const activateModule = useActivateModule();
  const createNavConfig = useCreateNavigationConfig();
  const [activatingSlug, setActivatingSlug] = useState<string | null>(null);

  // Filter out modules already activated for this client
  const activatedSlugs = new Set(clientModules.map((m) => m.module_slug));
  const availableModules = Object.values(MODULE_CATALOG).filter(
    (entry) => !activatedSlugs.has(entry.slug),
  );

  const handleAddModule = async (catalog: ModuleCatalogEntry) => {
    if (!selectedClient?.id) return;

    setActivatingSlug(catalog.slug);
    try {
      // Step 1: activate the module for the client
      const activated = await activateModule.mutateAsync({
        clientId: selectedClient.id,
        moduleSlug: catalog.slug,
      });

      // Step 2: create a nav config entry for it
      await createNavConfig.mutateAsync({
        client_id: selectedClient.id,
        parent_id: parentId || null,
        label: catalog.label,
        slug: catalog.slug,
        icon: catalog.icon,
        type: 'module',
        client_module_id: activated.id,
        display_order: displayOrder || 0,
        is_active: true,
      });

      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de l'ajout du module",
      );
    } finally {
      setActivatingSlug(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un module</DialogTitle>
        </DialogHeader>

        {availableModules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Tous les modules disponibles sont déjà activés pour ce client.
          </p>
        ) : (
          <div className="grid gap-2 py-2">
            {availableModules.map((entry) => {
              const IconComp = getLucideIcon(entry.icon) || Puzzle;
              const isActivating = activatingSlug === entry.slug;

              return (
                <button
                  key={entry.slug}
                  type="button"
                  disabled={!!activatingSlug}
                  onClick={() => handleAddModule(entry)}
                  className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    {isActivating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <IconComp className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none">{entry.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {entry.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
