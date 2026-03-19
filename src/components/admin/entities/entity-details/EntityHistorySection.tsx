import React, { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataTable } from '@/components/admin/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Download,
  Pencil,
  Plus,
  Search,
  RotateCcw,
  Trash2,
  Undo2,
  History,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EoAuditLogEntry } from '@/hooks/useEoAuditLog';
import type { DrawerEntity } from './EntityInfoSection';

interface EntityHistorySectionProps {
  entity: DrawerEntity;
  allEntities: DrawerEntity[];
  auditLogs: EoAuditLogEntry[];
  auditLoading: boolean;
  onRevert: (revertInfo: { entityId: string; fieldKey: string; fieldLabel: string; oldValue: unknown }) => void;
  onViewFullHistory: () => void;
}

export function EntityHistorySection({
  entity,
  allEntities,
  auditLogs,
  auditLoading,
  onRevert,
  onViewFullHistory,
}: EntityHistorySectionProps) {
  const [search, setSearch] = useState('');

  if (auditLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Chargement…</div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <EmptyState icon={History} title="Aucun historique pour cette entité" />
    );
  }

  const FIELD_LABELS_H: Record<string, string> = {
    name: 'Renommage', code: 'Code', description: 'Description',
    parent_id: 'Reparentage',
  };
  const IGNORED_H = ['updated_at', 'path', 'slug', 'level'];
  const fmtExport = (v: unknown) => {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
    if (typeof v === 'object') return JSON.stringify(v);
    const match = allEntities.find(e => e.id === String(v));
    if (match) return match.name;
    return String(v);
  };
  const exportCsv = () => {
    const rows: string[][] = [['Date', 'Action', 'Champ', 'Avant', 'Après', 'Par']];
    auditLogs.forEach((entry) => {
      const userName = entry.profiles?.full_name || entry.profiles?.email || '';
      const dateFmt = format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: fr });
      if (entry.action === 'create') {
        rows.push([dateFmt, 'Création', '', '', entity.name, userName]);
      } else if (entry.action === 'delete') {
        rows.push([dateFmt, 'Suppression', '', entity.name, '', userName]);
      } else {
        Object.keys(entry.changed_fields || {}).filter(k => !IGNORED_H.includes(k)).forEach(key => {
          const change = entry.changed_fields[key];
          const label = change?.field_name || FIELD_LABELS_H[key] || key;
          rows.push([dateFmt, entry.action === 'field_update' ? 'Champ modifié' : 'Modification', label, fmtExport(change?.old), fmtExport(change?.new), userName]);
        });
      }
    });
    const csvContent = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-${entity.slug || entity.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const FIELD_LABELS: Record<string, string> = {
    name: 'Renommage', code: 'Code', description: 'Description',
    parent_id: 'Reparentage',
  };
  const IGNORED = ['updated_at', 'path', 'slug', 'level'];
  const ACTION_ICONS: Record<string, React.ReactNode> = {
    create: <Plus className="h-3 w-3" />, update: <Pencil className="h-3 w-3" />,
    delete: <Trash2 className="h-3 w-3" />, restore: <Undo2 className="h-3 w-3" />,
    field_update: <Pencil className="h-3 w-3" />, field_delete: <Trash2 className="h-3 w-3" />,
  };
  const ACTION_VARIANTS: Record<string, 'default' | 'error' | 'outline'> = {
    create: 'default', update: 'default', delete: 'error',
    restore: 'outline', field_update: 'default', field_delete: 'error',
  };
  const fmtVal = (v: unknown) => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
    if (typeof v === 'object') return JSON.stringify(v);
    // Resolve parent_id to name
    const parentMatch = allEntities.find(e => e.id === String(v));
    if (parentMatch) return parentMatch.name;
    return String(v);
  };

  const lines: { id: string; action: string; fieldLabel: string; oldValue: unknown; newValue: unknown; date: string; user: string | null; fieldKey: string | null }[] = [];
  auditLogs.slice(0, 50).forEach((entry) => {
    const userName = entry.profiles?.full_name || entry.profiles?.email || null;
    if (entry.action === 'create') {
      lines.push({ id: `${entry.id}-create`, action: 'create', fieldLabel: 'Création', oldValue: null, newValue: entity.name, date: entry.created_at, user: userName, fieldKey: null });
    } else if (entry.action === 'delete') {
      lines.push({ id: `${entry.id}-delete`, action: 'delete', fieldLabel: 'Suppression', oldValue: entity.name, newValue: null, date: entry.created_at, user: userName, fieldKey: null });
    } else {
      const changedKeys = Object.keys(entry.changed_fields || {}).filter(k => !IGNORED.includes(k));
      changedKeys.forEach(key => {
        const change = entry.changed_fields[key];
        const label = change?.field_name || FIELD_LABELS[key] || key;
        lines.push({ id: `${entry.id}-${key}`, action: entry.action, fieldLabel: label, oldValue: change?.old, newValue: change?.new, date: entry.created_at, user: userName, fieldKey: key });
      });
    }
  });

  type HistoryLine = typeof lines[number];

  const columns: ColumnDef<HistoryLine>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(row.original.date), 'dd MMM yyyy HH:mm', { locale: fr })}
        </span>
      ),
    },
    {
      accessorKey: 'fieldLabel',
      header: 'Action',
      cell: ({ row }) => (
        <Chip variant={ACTION_VARIANTS[row.original.action] || 'default'} className="text-xs gap-1">
          {ACTION_ICONS[row.original.action] || ACTION_ICONS.update}
          {row.original.fieldLabel}
        </Chip>
      ),
    },
    {
      accessorKey: 'oldValue',
      header: 'Avant',
      cell: ({ row }) => (
        <span className="text-xs max-w-[120px] truncate block">
          {row.original.action === 'create'
            ? <span className="text-muted-foreground">—</span>
            : <span className="text-destructive">{fmtVal(row.original.oldValue)}</span>}
        </span>
      ),
    },
    {
      accessorKey: 'newValue',
      header: 'Après',
      cell: ({ row }) => (
        <span className="text-xs max-w-[120px] truncate block">
          {row.original.action === 'delete'
            ? <span className="text-muted-foreground">—</span>
            : <span className="text-primary">{fmtVal(row.original.newValue)}</span>}
        </span>
      ),
    },
    {
      accessorKey: 'user',
      header: 'Par',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
          {row.original.user || '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.fieldKey ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title="Annuler cette modification"
          onClick={() => onRevert({ entityId: entity.id, fieldKey: row.original.fieldKey!, fieldLabel: row.original.fieldLabel, oldValue: row.original.oldValue })}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button variant="outline" className="h-10" onClick={exportCsv}>
          Exporter CSV
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={lines.filter(l => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            l.fieldLabel.toLowerCase().includes(q) ||
            (l.user || '').toLowerCase().includes(q) ||
            fmtVal(l.oldValue).toLowerCase().includes(q) ||
            fmtVal(l.newValue).toLowerCase().includes(q)
          );
        })}
        hideSearch
        hidePagination={lines.length <= 10}
        hideColumnSelector
      />
      <div className="text-center">
        <Button variant="link" className="text-sm font-medium" onClick={onViewFullHistory}>
          Voir l'historique complet
        </Button>
      </div>
    </div>
  );
}
