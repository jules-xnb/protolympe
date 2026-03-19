import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FIELD_LABELS,
  IGNORED_DIFF_FIELDS,
  LEGACY_SYSTEM_FIELDS,
  SNAPSHOT_LABELS,
  SNAPSHOT_HIDDEN_KEYS,
} from '@/lib/eo/eo-history-constants';

interface SnapshotDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  snapshot: Record<string, unknown> | null;
  changedFields: Record<string, { old: unknown; new: unknown; field_name?: string }> | null;
  entityName: string;
  date: string;
  entityNameMap: Record<string, string>;
}

export function SnapshotDialog({
  open,
  onOpenChange,
  snapshot,
  changedFields,
  entityName,
  date,
  entityNameMap,
}: SnapshotDialogProps) {
  if (!snapshot) return null;

  const displayKeys = Object.keys(snapshot).filter(
    k => !SNAPSHOT_HIDDEN_KEYS.includes(k) && !LEGACY_SYSTEM_FIELDS.includes(k),
  );

  const fmtVal = (val: unknown, key: string) => {
    if (val === null || val === undefined) return '\u2014';
    if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
    if (key === 'parent_id' && typeof val === 'string') return entityNameMap[val] || val;
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  // Filter changed_fields to meaningful ones
  const diffKeys = changedFields
    ? Object.keys(changedFields).filter(k => !IGNORED_DIFF_FIELDS.includes(k) && !LEGACY_SYSTEM_FIELDS.includes(k))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Snapshot — {entityName}
          </DialogTitle>
          <DialogDescription>
            {'\u00c9'}tat complet au {date ? format(new Date(date), "dd MMMM yyyy '\u00e0' HH:mm", { locale: fr }) : ''}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Before / After diff */}
          {diffKeys.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Modifications</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Champ</TableHead>
                    <TableHead>Avant</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Apr{'\u00e8'}s</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diffKeys.map(key => {
                    const change = changedFields![key];
                    const label = change?.field_name || SNAPSHOT_LABELS[key] || FIELD_LABELS[key] || key;
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium text-xs">{label}</TableCell>
                        <TableCell className="text-xs text-destructive">{fmtVal(change.old, key)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground text-center">{'\u2192'}</TableCell>
                        <TableCell className="text-xs text-primary">{fmtVal(change.new, key)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Full state */}
          <h4 className="text-sm font-semibold mb-2">{'\u00c9'}tat complet</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Champ</TableHead>
                <TableHead>Valeur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayKeys.map(key => (
                <TableRow key={key}>
                  <TableCell className="font-medium text-xs">{SNAPSHOT_LABELS[key] || key}</TableCell>
                  <TableCell className="text-xs">{fmtVal(snapshot[key], key)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
