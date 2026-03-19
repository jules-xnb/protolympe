import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useClients, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { ClientFormDialog } from '@/components/admin/clients/ClientFormDialog';
import { ClientEditDrawer } from '@/components/admin/clients/ClientEditDrawer';
import { Button } from '@/components/ui/button';
import { Pencil, Settings, ArchiveRestore, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsAdminDelta } from '@/hooks/useAdminData';
import { useViewMode } from '@/contexts/ViewModeContext';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import type { Client } from '@/hooks/useClients';

export default function AdminClientsPage() {
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdminDelta();
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const { switchToIntegratorMode } = useViewMode();
  const navigate = useNavigate();

  const [formOpen, setFormOpen] = useState(false);
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Client | null>(null);

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Vérification des permissions...</div>
      </div>
    );
  }

  // isAdmin is now used to conditionally show admin actions (non-admins get read-only view)

  const activeClients = clients.filter(c => c.is_active);
  const archivedClients = clients.filter(c => !c.is_active);
  const displayedClients = showArchived ? archivedClients : activeClients;

  const handleCreate = () => {
    setFormOpen(true);
  };

  const handleEdit = (client: Client) => {
    setDrawerClient(client);
  };

  const handleConfigure = (client: Client) => {
    switchToIntegratorMode(client);
    navigate(`/dashboard/${client.id}/modules`);
  };

  const handleCreateSubmit = async (data: Partial<Client>) => {
    const slug = (data.name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    await createClient.mutateAsync({ ...data, slug } as Parameters<typeof createClient.mutateAsync>[0]);
    setFormOpen(false);
  };

  const handleEditSubmit = async (data: Partial<Client>) => {
    if (drawerClient) {
      await updateClient.mutateAsync({ id: drawerClient.id, ...data });
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    await updateClient.mutateAsync({ id: archiveTarget.id, is_active: false });
    setArchiveTarget(null);
  };

  const handleRestore = async (client: Client) => {
    await updateClient.mutateAsync({ id: client.id, is_active: true });
  };

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      size: 400,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Créé le',
      size: 120,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.created_at), 'dd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
    {
      id: 'actions',
      size: 1,
      cell: ({ row }) => {
        const client = row.original;
        if (showArchived && isAdmin) {
          return (
            <div className="flex items-center gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => handleRestore(client)}>
                Restaurer
                <ArchiveRestore className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 justify-end w-fit ml-auto">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => handleEdit(client)}>
                <span className="hidden sm:inline">Modifier</span>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" onClick={() => handleConfigure(client)}>
              <span className="hidden sm:inline">Configurer</span>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={showArchived ? 'Clients archivés' : 'Clients'}
        description={showArchived ? 'Clients archivés pouvant être restaurés.' : isAdmin ? 'Créez et gérez les clients de la plateforme.' : 'Consultez les clients de la plateforme.'}
        action={isAdmin && !showArchived ? {
          label: 'Nouveau client',
          onClick: handleCreate,
        } : undefined}
      >
        {isAdmin && showArchived ? (
          <Button variant="outline" size="sm" onClick={() => setShowArchived(false)}>
            ← Retour aux clients actifs
          </Button>
        ) : isAdmin ? (
          <Button variant="ghost" onClick={() => setShowArchived(true)}>
            Archives
            <Archive className="h-4 w-4" />
          </Button>
        ) : null}
      </PageHeader>

      <DataTable
        columns={columns}
        data={displayedClients}
        searchColumn="name"
        searchPlaceholder="Rechercher un client..."
        isLoading={isLoading}
        hideColumnSelector
      />

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={null}
        onSubmit={handleCreateSubmit}
        isSubmitting={createClient.isPending}
      />

      <ClientEditDrawer
        open={!!drawerClient}
        onOpenChange={(open) => !open && setDrawerClient(null)}
        client={drawerClient}
        onSubmit={handleEditSubmit}
        isSubmitting={updateClient.isPending}
        onArchive={(client) => { setDrawerClient(null); setArchiveTarget(client); }}
      />

      <DeleteConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archiver le client"
        description={`Êtes-vous sûr de vouloir archiver le client « ${archiveTarget?.name} » ? Il ne sera plus accessible mais pourra être restauré.`}
      />
    </div>
  );
}
