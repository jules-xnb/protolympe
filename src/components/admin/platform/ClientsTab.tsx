import { useState } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { Plus, Building2, Pencil, Trash2, Eye } from 'lucide-react';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { ClientFormDialog } from '@/components/admin/clients/ClientFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { ClientDetailsDrawer } from '@/components/admin/platform/ClientDetailsDrawer';
import { DataTable } from '@/components/admin/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import type { Client } from '@/hooks/useClients';

export function ClientsTab() {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  
  const formDialog = useDialogState<Client>();
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          onClick={() => setViewingClient(row.original)}
          className="flex items-center gap-2 text-left h-auto px-1 py-1 justify-start hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.original.name}</div>
          </div>
        </Button>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Statut',
      cell: ({ row }) => (
        <StatusChip status={row.original.is_active ? 'actif' : 'inactif'} />
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewingClient(row.original)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => formDialog.open(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingClient(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (values: { name: string; is_active: boolean }) => {
    if (formDialog.item) {
      await updateClient.mutateAsync({ id: formDialog.item.id, ...values });
    } else {
      await createClient.mutateAsync(values);
    }
    formDialog.close();
  };

  const handleDelete = async () => {
    if (deletingClient) {
      await deleteClient.mutateAsync(deletingClient.id);
      setDeletingClient(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              Créez et gérez les clients de la plateforme Olympe.
            </CardDescription>
          </div>
          <Button onClick={() => formDialog.open()}>
            Nouveau client
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={clients || []}
          searchColumn="name"
          searchPlaceholder="Rechercher un client..."
          isLoading={isLoading}
        />
      </CardContent>

      <ClientFormDialog
        open={formDialog.isOpen}
        onOpenChange={formDialog.onOpenChange}
        client={formDialog.item}
        onSubmit={handleSubmit}
        isSubmitting={createClient.isPending || updateClient.isPending}
      />

      <DeleteConfirmDialog
        open={!!deletingClient}
        onOpenChange={(open) => !open && setDeletingClient(null)}
        onConfirm={handleDelete}
        title="Supprimer le client"
        description={`Êtes-vous sûr de vouloir supprimer "${deletingClient?.name}" ? Cette action supprimera également tous les modules, entités et utilisateurs associés.`}
        isDeleting={deleteClient.isPending}
      />

      <ClientDetailsDrawer
        open={!!viewingClient}
        onOpenChange={(open) => !open && setViewingClient(null)}
        client={viewingClient}
      />
    </Card>
  );
}
