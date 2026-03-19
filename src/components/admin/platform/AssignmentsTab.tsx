import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Trash2, Building2, ArrowRight } from 'lucide-react';
import { useIntegratorAssignments, useRemoveIntegratorFromClient } from '@/hooks/useAdminData';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { DataTable } from '@/components/admin/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { AssignIntegratorDialog } from './AssignIntegratorDialog';
import { formatFullName } from '@/lib/format-name';

type AssignmentRow = {
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
};

export function AssignmentsTab() {
  const { data: assignments, isLoading } = useIntegratorAssignments();
  const removeAssignment = useRemoveIntegratorFromClient();
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<AssignmentRow | null>(null);

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.[0]?.toUpperCase() ?? 'U';
  };

  const columns: ColumnDef<AssignmentRow>[] = [
    {
      accessorKey: 'profiles.first_name',
      header: 'Intégrateur',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(formatFullName(row.original.profiles?.first_name, row.original.profiles?.last_name), row.original.profiles?.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{formatFullName(row.original.profiles?.first_name, row.original.profiles?.last_name)}</div>
            <div className="text-xs text-muted-foreground">{row.original.profiles?.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'arrow',
      cell: () => (
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      ),
    },
    {
      accessorKey: 'clients.name',
      header: 'Client',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.original.clients?.name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'persona',
      header: 'Rôle',
      cell: ({ row }) => (
        <Chip variant="outline">
          {row.original.persona === 'admin_delta' ? 'Admin' : 'Intégrateur'}
        </Chip>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Assigné le',
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
            onClick={() => setDeletingAssignment(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (deletingAssignment) {
      await removeAssignment.mutateAsync(deletingAssignment.id);
      setDeletingAssignment(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assignations</CardTitle>
            <CardDescription>
              Associez les intégrateurs aux clients qu'ils peuvent gérer.
            </CardDescription>
          </div>
          <Button onClick={() => setAssignDialogOpen(true)}>
            Nouvelle assignation
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={assignments || []}
          searchColumn="clients.name"
          searchPlaceholder="Rechercher par client..."
          isLoading={isLoading}
        />
      </CardContent>

      <AssignIntegratorDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
      />

      <DeleteConfirmDialog
        open={!!deletingAssignment}
        onOpenChange={(open) => !open && setDeletingAssignment(null)}
        onConfirm={handleDelete}
        title="Supprimer l'assignation"
        description={`Êtes-vous sûr de vouloir retirer l'accès de "${deletingAssignment ? formatFullName(deletingAssignment.profiles?.first_name, deletingAssignment.profiles?.last_name) : ''}" au client "${deletingAssignment?.clients?.name}" ?`}
        isDeleting={removeAssignment.isPending}
      />
    </Card>
  );
}
