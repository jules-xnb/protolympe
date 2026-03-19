import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';

import { Plus, Trash2, Shield, UserCog } from 'lucide-react';
import { useIntegrators, useRemoveSystemRole } from '@/hooks/useAdminData';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { DataTable } from '@/components/admin/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { AddIntegratorDialog } from './AddIntegratorDialog';
import { formatFullName } from '@/lib/format-name';

type IntegratorRow = {
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
};

export function IntegratorsTab() {
  const { data: integrators, isLoading } = useIntegrators();
  const removeRole = useRemoveSystemRole();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingIntegrator, setDeletingIntegrator] = useState<IntegratorRow | null>(null);


  const columns: ColumnDef<IntegratorRow>[] = [
    {
      accessorKey: 'profiles.first_name',
      header: 'Intégrateur',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{formatFullName(row.original.profiles?.first_name, row.original.profiles?.last_name)}</div>
          <div className="text-xs text-muted-foreground">{row.original.profiles?.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'persona',
      header: 'Rôle',
      cell: ({ row }) => {
        const isAdmin = row.original.persona === 'admin_delta';
        return (
          <Chip variant="default" className="flex items-center gap-1 w-fit">
            {isAdmin ? <Shield className="h-3 w-3" /> : <UserCog className="h-3 w-3" />}
            {isAdmin ? 'Admin Delta' : 'Intégrateur Delta'}
          </Chip>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Ajouté le',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingIntegrator(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (deletingIntegrator) {
      await removeRole.mutateAsync({ 
        roleId: deletingIntegrator.id, 
        userId: deletingIntegrator.user_id 
      });
      setDeletingIntegrator(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Intégrateurs Delta</CardTitle>
            <CardDescription>
              Gérez les intégrateurs qui peuvent configurer les clients.
            </CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            Ajouter un intégrateur
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={integrators || []}
          searchColumn="profiles.email"
          searchPlaceholder="Rechercher un intégrateur..."
          isLoading={isLoading}
        />
      </CardContent>

      <AddIntegratorDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <DeleteConfirmDialog
        open={!!deletingIntegrator}
        onOpenChange={(open) => !open && setDeletingIntegrator(null)}
        onConfirm={handleDelete}
        title="Retirer le rôle"
        description={`Êtes-vous sûr de vouloir retirer le rôle de "${deletingIntegrator ? formatFullName(deletingIntegrator.profiles?.first_name, deletingIntegrator.profiles?.last_name) : ''}" ? Il perdra ses accès intégrateur.`}
        isDeleting={removeRole.isPending}
      />
    </Card>
  );
}
