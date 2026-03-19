import { useMemo, useState } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { ColumnDef } from '@tanstack/react-table';
import { useIntegrators, useIntegratorAssignments, useRemoveSystemRole, useIsAdminDelta } from '@/hooks/useAdminData';

import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { AddIntegratorDialog } from '@/components/admin/platform/AddIntegratorDialog';
import { IntegratorDetailsDrawer } from '@/components/admin/platform/IntegratorDetailsDrawer';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { formatFullName } from '@/lib/format-name';

interface IntegratorRow {
  id: string;
  user_id: string;
  persona: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

interface AssignmentRow {
  id: string;
  user_id: string;
  client_id: string;
  persona: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  clients: {
    id: string;
    name: string;
  } | null;
}

export default function AdminIntegratorsPage() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdminDelta();
  const { data: integrators = [], isLoading: loadingIntegrators } = useIntegrators();
  const { data: assignments = [] } = useIntegratorAssignments();
  
  const removeSystemRole = useRemoveSystemRole();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const deleteDialog = useDialogState<IntegratorRow>();
  const integratorDrawer = useDialogState<IntegratorRow>();
  const [clientFilter, setClientFilter] = useState<string>('all');

  const typedAssignments = assignments as AssignmentRow[];

  // Extract unique clients for filter
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    typedAssignments.forEach(a => {
      if (a.clients) map.set(a.clients.id, a.clients.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [typedAssignments]);

  // User IDs assigned to the selected client
  const filteredUserIds = useMemo(() => {
    if (clientFilter === 'all') return null;
    return new Set(typedAssignments.filter(a => a.client_id === clientFilter).map(a => a.user_id));
  }, [typedAssignments, clientFilter]);

  // Count assignments per integrator
  const clientCountByUser = typedAssignments.reduce((acc, a) => {
    acc[a.user_id] = (acc[a.user_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get unique integrators, filtered by client
  const uniqueIntegrators = integrators.reduce((acc, curr) => {
    if (!acc.find(i => i.user_id === curr.user_id)) {
      if (!filteredUserIds || filteredUserIds.has(curr.user_id)) {
        acc.push(curr);
      }
    }
    return acc;
  }, [] as IntegratorRow[]);

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Vérification des permissions...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Accès refusé</CardTitle>
            <CardDescription>
              Seuls les administrateurs Delta peuvent accéder à cette page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleDeleteIntegrator = async () => {
    if (deleteDialog.item) {
      await removeSystemRole.mutateAsync({
        roleId: deleteDialog.item.id,
        userId: deleteDialog.item.user_id
      });
      deleteDialog.close();
    }
  };

  const integratorColumns: ColumnDef<IntegratorRow>[] = [
    {
      accessorKey: 'name',
      header: 'Intégrateurs',
      cell: ({ row }) => (
        <div 
          className="cursor-pointer"
          onClick={() => integratorDrawer.open(row.original)}
        >
          <div className="font-medium hover:underline">
            {formatFullName(row.original.profiles?.first_name, row.original.profiles?.last_name)}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.profiles?.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Créé le',
      size: 100,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.created_at), 'dd/MM/yy', { locale: fr })}
        </span>
      ),
    },
    {
      id: 'client_count',
      header: 'Nb clients',
      size: 100,
      cell: ({ row }) => (
        <span>{row.original.persona === 'admin_delta' ? 'Tous' : (clientCountByUser[row.original.user_id] || 0)}</span>
      ),
    },
    {
      accessorKey: 'persona',
      header: 'Rôle',
      size: 120,
      cell: ({ row }) => (
        <Chip variant="default">
          {row.original.persona === 'admin_delta' ? 'Admin Delta' : 'Intégrateur'}
        </Chip>
      ),
    },
    {
      id: 'actions',
      size: 1,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => integratorDrawer.open(row.original)}
          >
            Modifier
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Intégrateurs"
        action={{
          label: "Nouveau intégrateur",
          onClick: () => setAddDialogOpen(true),
        }}
      />

      <DataTable
        columns={integratorColumns}
        data={uniqueIntegrators}
        searchColumn="name"
        searchPlaceholder="Rechercher un intégrateur..."
        isLoading={loadingIntegrators}
        hideColumnSelector
        toolbarRight={
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Tous les clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clientOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <AddIntegratorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <DeleteConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={handleDeleteIntegrator}
        title="Retirer le rôle d'intégrateur"
        description={`Êtes-vous sûr de vouloir retirer le rôle de "${formatFullName(deleteDialog.item?.profiles?.first_name, deleteDialog.item?.profiles?.last_name, deleteDialog.item?.profiles?.email || '')}" ?`}
        isDeleting={removeSystemRole.isPending}
      />

      <IntegratorDetailsDrawer
        integrator={integratorDrawer.item}
        assignments={assignments as AssignmentRow[]}
        open={integratorDrawer.isOpen}
        onOpenChange={integratorDrawer.onOpenChange}
      />
    </div>
  );
}
