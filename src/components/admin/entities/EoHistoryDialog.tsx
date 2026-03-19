import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { History, RotateCcw, Plus, Pencil, Trash2, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEoAuditLog, useRestoreEoSnapshot, type EoAuditLogEntry } from '@/hooks/useEoAuditLog';

// Human-readable labels for entity fields
const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  code: 'Code',
  description: 'Description',
  is_active: 'Actif',
  level: 'Niveau',
  parent_id: 'Parent',
  slug: 'Slug',
  address_line1: 'Adresse',
  address_line2: 'Adresse (ligne 2)',
  city: 'Ville',
  postal_code: 'Code postal',
  country: 'Pays',
  phone: 'Téléphone',
  email: 'Email',
  website: 'Site web',
  manager_name: 'Responsable',
  employee_count: 'Effectif',
  budget: 'Budget',
  cost_center: 'Centre de coût',
  metadata: 'Métadonnées',
  inherit_permissions: 'Héritage des permissions',
  updated_at: 'Date de modification',
};

const IGNORED_DIFF_FIELDS = ['updated_at', 'path', 'slug'];

const ACTION_CONFIG: Record<string, { label: string; variant: 'default' | 'error' | 'outline'; icon: React.ReactNode }> = {
  create: { label: 'Création', variant: 'default', icon: <Plus className="h-3 w-3" /> },
  update: { label: 'Modification', variant: 'default', icon: <Pencil className="h-3 w-3" /> },
  delete: { label: 'Suppression', variant: 'error', icon: <Trash2 className="h-3 w-3" /> },
  restore: { label: 'Restauration', variant: 'outline', icon: <Undo2 className="h-3 w-3" /> },
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

interface EoHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string | undefined;
  entityName: string;
}

export function EoHistoryDialog({ open, onOpenChange, entityId, entityName }: EoHistoryDialogProps) {
  const { data: logs = [], isLoading } = useEoAuditLog(entityId);
  const restoreMutation = useRestoreEoSnapshot();
  const [confirmEntry, setConfirmEntry] = useState<EoAuditLogEntry | null>(null);

  const handleRestore = () => {
    if (!confirmEntry || !entityId) return;
    restoreMutation.mutate(
      { entityId, snapshot: confirmEntry.snapshot },
      { onSuccess: () => setConfirmEntry(null) },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[var(--modal-width-lg)] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique — {entityName}
            </DialogTitle>
            <DialogDescription>
              Consultez les modifications et restaurez une version antérieure.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Chargement…</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Aucun historique disponible.</div>
            ) : (
              <div className="relative pl-6 space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

                {logs.map((entry, idx) => {
                  const actionCfg = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update;
                  const changedKeys = Object.keys(entry.changed_fields || {}).filter(
                    k => !IGNORED_DIFF_FIELDS.includes(k),
                  );

                  return (
                    <div key={entry.id} className="relative pb-6 last:pb-0">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-background bg-muted">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>

                      <div className="space-y-2">
                        {/* Header row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Chip variant={actionCfg.variant} className="text-xs gap-1">
                            {actionCfg.icon}
                            {actionCfg.label}
                          </Chip>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                          </span>
                          {entry.profiles && (
                            <span className="text-xs text-muted-foreground">
                              — {entry.profiles.full_name || entry.profiles.email}
                            </span>
                          )}
                        </div>

                        {/* Changed fields (only for update/restore) */}
                        {(entry.action === 'update' || entry.action === 'restore') && changedKeys.length > 0 && (
                          <div className="rounded-md border bg-muted/30 p-2 space-y-1">
                            {changedKeys.map(key => {
                              const change = entry.changed_fields[key];
                              const label = FIELD_LABELS[key] || key;
                              return (
                                <div key={key} className="flex items-start gap-2 text-xs">
                                  <span className="font-medium min-w-[100px] text-muted-foreground">{label}</span>
                                  <span className="text-destructive line-through">{formatValue(change?.old)}</span>
                                  <span>→</span>
                                  <span className="text-primary">{formatValue(change?.new)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Restore button (not on first = current, not on create) */}
                        {idx > 0 && entry.action !== 'delete' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setConfirmEntry(entry)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restaurer cette version
                          </Button>
                        )}
                      </div>

                      {idx < logs.length - 1 && <Separator className="mt-4" />}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmEntry} onOpenChange={(o) => !o && setConfirmEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la restauration</AlertDialogTitle>
            <AlertDialogDescription>
              L'entité sera restaurée à son état du{' '}
              {confirmEntry && format(new Date(confirmEntry.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}.
              Cette action créera une nouvelle entrée dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoreMutation.isPending}>
              {restoreMutation.isPending ? 'Restauration…' : 'Restaurer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
