import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { useBoDefinitionAuditLogs, type BoAuditLogWithRef } from '@/hooks/useBoFieldAuditLog';
import { useBusinessObjectDefinition } from '@/hooks/useBusinessObjectDefinitions';
import { useClientUsers, type ClientUser } from '@/hooks/useClientUsers';
import { UserDetailsDrawer } from '@/components/admin/users/UserDetailsDrawer';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Download, History, Pencil, Plus, Trash2, PackagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const ACTION_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: typeof Pencil }> = {
  instance_create: { label: 'Nouvelle instance', variant: 'default', icon: PackagePlus },
  field_create: { label: 'Valeur initiale', variant: 'default', icon: Plus },
  field_update: { label: 'Modification', variant: 'secondary', icon: Pencil },
  field_delete: { label: 'Suppression', variant: 'destructive', icon: Trash2 },
};

const formatValue = (val: unknown): string => {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

export default function BusinessObjectHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);
  const { selectedClient } = useViewMode();
  const { data: definition } = useBusinessObjectDefinition(id);
  const { data: result, isLoading } = useBoDefinitionAuditLogs(id, page, PAGE_SIZE);
  const { data: clientUsers = [] } = useClientUsers(selectedClient?.id);
  const auditLogs = result?.data ?? [];
  const totalCount = result?.totalCount ?? 0;

  // CSV export (fetches all filtered data)
  const exportCsv = () => {
    const BOM = '\uFEFF';
    const sep = ';';
    const headers = ['Date', 'Instance', 'Nom', 'Action', 'Champ', 'Ancienne valeur', 'Nouvelle valeur', 'Auteur'];
    const escapeCSV = (val: string) => {
      if (val.includes(sep) || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = auditLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
      log.reference_number || '—',
      log.instance_name || '—',
      ACTION_CONFIG[log.action]?.label || log.action,
      log.field_name || '—',
      formatValue(log.old_value),
      formatValue(log.new_value),
      log.profiles?.full_name || log.profiles?.email || '—',
    ].map(escapeCSV).join(sep));

    const csvContent = BOM + [headers.join(sep), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-${definition?.slug || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const columns = useMemo<ColumnDef<BoAuditLogWithRef>[]>(() => [
    {
      accessorKey: 'created_at',
      header: 'Date',
      size: 150,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {format(new Date(row.original.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
        </span>
      ),
    },
    {
      accessorKey: 'reference_number',
      header: 'Instance',
      size: 120,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.reference_number || '—'}</span>
      ),
    },
    {
      id: 'instance_name',
      accessorFn: (row) => row.instance_name,
      header: 'Nom',
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs truncate max-w-[160px] block">
          {row.original.instance_name || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      size: 130,
      cell: ({ row }) => {
        const config = ACTION_CONFIG[row.original.action];
        if (!config) return row.original.action;
        const Icon = config.icon;
        return (
          <Badge variant={config.variant} className="text-xs gap-1">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'field_name',
      header: 'Champ',
      size: 160,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.field_name || '—'}</span>
      ),
    },
    {
      accessorKey: 'old_value',
      header: 'Avant',
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs max-w-[160px] truncate block">
          {row.original.action === 'field_create' || row.original.action === 'instance_create'
            ? <span className="text-muted-foreground">—</span>
            : <span className="text-destructive">{formatValue(row.original.old_value)}</span>}
        </span>
      ),
    },
    {
      accessorKey: 'new_value',
      header: 'Après',
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs max-w-[160px] truncate block">
          {row.original.action === 'field_delete'
            ? <span className="text-muted-foreground">—</span>
            : <span className="text-primary">{formatValue(row.original.new_value)}</span>}
        </span>
      ),
    },
    {
      id: 'user',
      header: 'Par',
      size: 140,
      cell: ({ row }) => {
        const name = row.original.profiles?.full_name || row.original.profiles?.email || '—';
        const userId = row.original.changed_by;
        if (!userId) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <button
            type="button"
            className="text-xs text-primary hover:underline truncate max-w-[140px] block text-left"
            onClick={(e) => {
              e.stopPropagation();
              const cu = clientUsers.find(u => u.user_id === userId);
              if (cu) setSelectedUser(cu);
            }}
          >
            {name}
          </button>
        );
      },
    },
  ], [clientUsers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Historique${definition ? ` — ${definition.name}` : ''}`}
        backAction={{ onClick: () => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECT_DETAIL(id!))) }}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={auditLogs.length === 0}>
            Exporter CSV <Download className="h-4 w-4" />
          </Button>
        }
      />

      {!isLoading && totalCount === 0 ? (
        <Alert variant="empty" className="flex flex-col items-center justify-center text-center gap-3 py-10">
          <AlertTitle className="flex flex-col items-center gap-3 text-base font-medium">
            <History className="h-10 w-10 opacity-50" />
            Aucun historique de modification
          </AlertTitle>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={auditLogs}
          searchColumns={['reference_number', 'instance_name', 'field_name']}
          searchPlaceholder="Rechercher par instance, nom ou champ..."
          isLoading={isLoading}
          hideColumnSelector
          serverPagination={{
            totalItems: totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / PAGE_SIZE) || 1,
            pageSize: PAGE_SIZE,
            onPageChange: setPage,
          }}
        />
      )}

      <UserDetailsDrawer
        open={!!selectedUser}
        onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
        user={selectedUser}
      />
    </div>
  );
}
