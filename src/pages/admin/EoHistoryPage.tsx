import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { CLIENT_ROUTES } from '@/lib/routes';
import { PageHeader } from '@/components/admin/PageHeader';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { useAllEoAuditLogs, useRevertEoField, useEoExportHistory, useLogEoExport, type EoAuditLogEntry } from '@/hooks/useEoAuditLog';
import { useEoAuditLog } from '@/hooks/useEoAuditLog';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Pencil, Trash2, Undo2, RotateCcw, GitBranch, Download, Eye, FileDown } from 'lucide-react';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

import {
  ACTION_ICONS,
  ACTION_VARIANTS,
  formatDisplayValue,
  flattenLogsToActionLines,
  buildAuditCsvContent,
  type ActionLine,
} from '@/lib/eo/eo-history-constants';
import { SnapshotDialog } from './EoSnapshotDialog';

export default function EoHistoryPage() {
  const { entityId: urlEntityId } = useParams<{ entityId?: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient, mode } = useViewMode();
  const { data: entities = [] } = useOrganizationalEntities(selectedClient?.id);

  const [selectedEntityId, setSelectedEntityId] = useState<string>(urlEntityId || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmLine, setConfirmLine] = useState<ActionLine | null>(null);
  const [snapshotEntry, setSnapshotEntry] = useState<EoAuditLogEntry | null>(null);
  const revertFieldMutation = useRevertEoField();
  const logExportMutation = useLogEoExport();

  // Fetch logs
  const { data: allLogs = [], isLoading: isLoadingAll } = useAllEoAuditLogs(
    selectedEntityId === 'all' ? selectedClient?.id : undefined
  );
  const { data: entityLogs = [], isLoading: isLoadingEntity } = useEoAuditLog(
    selectedEntityId !== 'all' ? selectedEntityId : undefined
  );

  const logs = selectedEntityId === 'all' ? allLogs : entityLogs;
  const isLoading = selectedEntityId === 'all' ? isLoadingAll : isLoadingEntity;

  // Export history
  const { data: _exportHistory = [] } = useEoExportHistory(selectedClient?.id);

  // Build entity name map
  const entityNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    entities.forEach(e => { map[e.id] = e.name; });
    return map;
  }, [entities]);

  // Flatten logs into individual action lines
  const actionLines = useMemo<ActionLine[]>(
    () => flattenLogsToActionLines(logs, entityNameMap),
    [logs, entityNameMap],
  );

  const PAGE_SIZE = DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(actionLines.length / PAGE_SIZE));
  const paginatedLines = useMemo(
    () => actionLines.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [actionLines, currentPage]
  );

  // Reset page when filter changes
  const handleEntityChange = (val: string) => {
    setSelectedEntityId(val);
    setCurrentPage(1);
  };

  // ─── CSV Export ───
  const handleExportCSV = () => {
    if (!selectedClient || actionLines.length === 0) return;

    const csv = buildAuditCsvContent(
      actionLines,
      entityNameMap,
      (d) => format(d, 'dd/MM/yyyy HH:mm', { locale: fr }),
    );

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-eo-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logExportMutation.mutate({
      clientId: selectedClient.id,
      rowCount: actionLines.length,
      filters: { entityId: selectedEntityId },
      exportType: 'audit_log',
    });

    toast.success(`Export de ${actionLines.length} lignes effectu\u00e9`);
  };

  // Find snapshot entry for a given action line
  const findSnapshotEntry = (line: ActionLine) => {
    return logs.find(l => line.id.startsWith(l.id));
  };

  const handleRevert = () => {
    if (!confirmLine || !confirmLine.fieldKey) return;
    revertFieldMutation.mutate(
      { entityId: confirmLine.entityId, field: confirmLine.fieldKey, value: confirmLine.oldValue },
      { onSuccess: () => setConfirmLine(null) },
    );
  };

  if (!selectedClient) {
    return (
      <EmptyState icon={GitBranch} title="Sélectionnez un client pour voir l'historique" />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Historique des Entit\u00e9s"
        description="Consultez toutes les modifications et annulez une action sp\u00e9cifique."
        backAction={{ onClick: () => mode === 'user_final' ? navigate(-1) : navigate(cp(CLIENT_ROUTES.ENTITIES)) }}
        action={{
          label: 'Exporter CSV',
          onClick: handleExportCSV,
          icon: <Download className="mr-2 h-4 w-4" />,
          variant: 'outline',
        }}
      />

      {/* Filter bar */}
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Select value={selectedEntityId} onValueChange={handleEntityChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrer par entit\u00e9" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les entit{'\u00e9'}s</SelectItem>
              {entities.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} {e.code ? `(${e.code})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          {actionLines.length} action{actionLines.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Actions table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Chargement{'\u2026'}</div>
          ) : actionLines.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Aucun historique disponible.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Date</TableHead>
                    {selectedEntityId === 'all' && <TableHead>Entit{'\u00e9'}</TableHead>}
                    <TableHead className="w-[130px]">Action</TableHead>
                    <TableHead>Avant</TableHead>
                    <TableHead>Apr{'\u00e8'}s</TableHead>
                    <TableHead className="w-[140px]">Par</TableHead>
                    <TableHead className="w-[130px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLines.map((line) => {
                    const variant = ACTION_VARIANTS[line.action] || 'default';
                    const Icon = ACTION_ICONS[line.action] || ACTION_ICONS.update;

                    return (
                      <TableRow key={line.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(line.date), "dd MMM yyyy HH:mm", { locale: fr })}
                        </TableCell>
                        {selectedEntityId === 'all' && (
                          <TableCell className="text-sm font-medium">
                            {line.entityName}
                          </TableCell>
                        )}
                        <TableCell>
                          <Chip variant={variant} className="text-xs gap-1 w-fit whitespace-nowrap">
                            <Icon className="h-3 w-3" />
                            {line.fieldLabel}
                          </Chip>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {line.action === 'create' ? (
                            <span className="text-muted-foreground">{'\u2014'}</span>
                          ) : (
                            <span className="text-destructive">{formatDisplayValue(line.oldValue, line.fieldKey, entityNameMap)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {line.action === 'delete' ? (
                            <span className="text-muted-foreground">{'\u2014'}</span>
                          ) : (
                            <span className="text-primary">{formatDisplayValue(line.newValue, line.fieldKey, entityNameMap)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {line.user || '\u2014'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                const entry = findSnapshotEntry(line);
                                if (entry) setSnapshotEntry(entry);
                              }}
                              title="Voir le snapshot"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {line.canRevert && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => setConfirmLine(line)}
                              >
                                <RotateCcw className="h-3 w-3" />
                                Annuler
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <UnifiedPagination
          totalItems={actionLines.length}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={PAGE_SIZE}
          rangeStart={(currentPage - 1) * PAGE_SIZE + 1}
          rangeEnd={Math.min(currentPage * PAGE_SIZE, actionLines.length)}
        />
      )}

      {/* Snapshot dialog */}
      <SnapshotDialog
        open={!!snapshotEntry}
        onOpenChange={(o) => !o && setSnapshotEntry(null)}
        snapshot={snapshotEntry?.snapshot || null}
        changedFields={snapshotEntry?.changed_fields || null}
        entityName={snapshotEntry ? (entityNameMap[snapshotEntry.entity_id] || 'Entit\u00e9') : ''}
        date={snapshotEntry?.created_at || ''}
        entityNameMap={entityNameMap}
      />

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmLine} onOpenChange={(o) => !o && setConfirmLine(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette modification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le champ <strong>{confirmLine?.fieldLabel}</strong> de l'entit{'\u00e9'} <strong>{confirmLine?.entityName}</strong> sera
              r{'\u00e9'}tabli {'\u00e0'} la valeur {'\u00ab'} {confirmLine ? formatDisplayValue(confirmLine.oldValue, confirmLine.fieldKey, entityNameMap) : ''} {'\u00bb'}.
              Cette action cr{'\u00e9'}era une nouvelle entr{'\u00e9'}e dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={revertFieldMutation.isPending}>
              {revertFieldMutation.isPending ? 'Annulation\u2026' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
