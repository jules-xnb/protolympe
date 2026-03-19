import { useState, useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { InviteUserDialog } from '@/components/admin/users/InviteUserDialog';
import { UserDetailsDrawer } from '@/components/admin/users/UserDetailsDrawer';
import { Button } from '@/components/ui/button';
import { StatusChip } from '@/components/ui/status-chip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserFieldDefinitions, type UserFieldDefinition } from '@/hooks/useUserFieldDefinitions';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableActionMenu } from '@/components/ui/table-action-menu';
import { useClientUsers, useRemoveClientUser, type ClientUser } from '@/hooks/useClientUsers';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Eye, UserX, Users, Upload, Download, ArrowUpDown, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

function renderFieldValue(value: unknown, fieldDef: UserFieldDefinition): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (fieldDef.field_type) {
    case 'boolean':
      return value ? 'Oui' : 'Non';
    case 'multiselect':
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    case 'date':
      try { return format(new Date(String(value)), 'dd/MM/yyyy', { locale: fr }); } catch { return String(value); }
    default:
      return String(value);
  }
}

export default function UsersPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: users = [], isLoading, refetch: refetchUsers } = useClientUsers();
  const removeMutation = useRemoveClientUser();
  const { data: fieldDefinitions = [] } = useUserFieldDefinitions(selectedClient?.id);

  const userIds = useMemo(() => users.map(u => u.user_id), [users]);

  const { data: allFieldValues = [] } = useQuery({
    queryKey: queryKeys.userFieldDefinitions.valuesBulk(selectedClient?.id, userIds),
    queryFn: async () => {
      if (userIds.length === 0) return [];
      return api.get<Array<{ user_id: string; field_definition_id: string; value: unknown }>>(
        `/api/client-users/field-values?user_ids=${userIds.join(',')}`
      );
    },
    enabled: !!selectedClient?.id && userIds.length > 0,
  });

  const fieldValuesMap = useMemo(() => {
    const map = new Map<string, Map<string, unknown>>();
    for (const fv of allFieldValues) {
      if (!map.has(fv.user_id)) map.set(fv.user_id, new Map());
      map.get(fv.user_id)!.set(fv.field_definition_id, fv.value);
    }
    return map;
  }, [allFieldValues]);
  
  const [inviteOpen, setInviteOpen] = useState(false);
  const detailsDrawer = useDialogState<ClientUser>();
  const deleteDialog = useDialogState<ClientUser>();

  // Derive fresh user data from query instead of stale state
  const currentUser = detailsDrawer.item ? users.find(u => u.id === detailsDrawer.item!.id) ?? detailsDrawer.item : null;

  const handleViewDetails = (user: ClientUser) => {
    detailsDrawer.open(user);
  };

  const handleRemoveClick = (user: ClientUser) => {
    deleteDialog.open(user);
  };

  const handleRemove = async () => {
    if (!deleteDialog.item) return;

    try {
      await removeMutation.mutateAsync(deleteDialog.item.id);
      await refetchUsers();
      toast.success('Utilisateur retiré du client');
      deleteDialog.close();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
      toast.error(message);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedClient?.id || users.length === 0) return;

    try {
      // Fetch profile template assignments for all users in this client
      const userIds = users.map(u => u.user_id);

      const assignments = await api.get<Array<{ user_id: string; profile_templates: { name: string } | null }>>(
        `/api/profile-templates/user-assignments/export?client_id=${selectedClient.id}&user_ids=${userIds.join(',')}`
      );

      // Group template names by user
      const templateNamesByUser = new Map<string, string[]>();
      assignments?.forEach(a => {
        const names = templateNamesByUser.get(a.user_id) || [];
        const tplName = (a.profile_templates as { name: string } | null)?.name;
        if (tplName) names.push(tplName);
        templateNamesByUser.set(a.user_id, names);
      });

      // Build CSV rows
      const csvRows: string[][] = [];
      const headers = ['email', 'nom_complet', 'profils'];

      for (const user of users) {
        const names = templateNamesByUser.get(user.user_id) || [];
        csvRows.push([
          user.profiles?.email || '',
          user.profiles?.full_name || '',
          names.join(';'),
        ]);
      }

      const escapeCSV = (value: string): string => {
        if (value.includes(';') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.join(';'),
        ...csvRows.map(row => row.map(escapeCSV).join(';')),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `utilisateurs_${selectedClient.slug || 'export'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${csvRows.length} ligne(s) exportée(s)`);
    } catch (error: unknown) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const dynamicColumns: ColumnDef<ClientUser>[] = useMemo(() =>
    fieldDefinitions.map(fd => ({
      id: `field_${fd.id}`,
      header: fd.name,
      cell: ({ row }: { row: { original: ClientUser } }) => {
        const value = fieldValuesMap.get(row.original.user_id)?.get(fd.id);
        return <span className="text-sm text-muted-foreground">{renderFieldValue(value, fd)}</span>;
      },
    })),
    [fieldDefinitions, fieldValuesMap]
  );

  const columns: ColumnDef<ClientUser>[] = useMemo(() => [
    {
      accessorKey: 'profiles.full_name',
      header: 'Utilisateur',
      size: 200,
      cell: ({ row }) => {
        const user = row.original;
        const hasNoProfiles = user.profile_templates_count === 0;
        return (
          <div>
            <div className="font-medium flex items-center gap-2">
              {user.profiles?.full_name || 'Sans nom'}
              </div>
            <div className="text-xs text-muted-foreground">
              {user.profiles?.email}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Statut',
      size: 120,
      cell: ({ row }) => {
        const { is_active, activated_at, profile_templates_count } = row.original;
        if (is_active) return <StatusChip status="actif" />;
        if (!activated_at && profile_templates_count === 0) return <StatusChip status="a_configurer" />;
        if (!activated_at && profile_templates_count > 0) return <StatusChip status="pret_a_activer" />;
        return <StatusChip status="inactif" />;
      },
    },
    {
      id: 'user_profiles',
      header: 'Profils',
      minSize: 200,
      maxSize: 500,
      cell: ({ row }) => {
        const names = row.original.profile_template_names;
        if (names.length === 0) {
          return <StatusChip status="sans_profil" />;
        }
        const text = names.join(', ');
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground truncate block max-w-[250px]">
                  {text}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px]">
                <div className="flex flex-col gap-1">
                  {names.map((name, i) => (
                    <span key={i} className="text-xs">{name}</span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Membre depuis',
      size: 130,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {format(new Date(row.original.created_at), 'dd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
    ...dynamicColumns,
    {
      id: 'actions',
      size: 1,
      cell: ({ row }) => {
        const user = row.original;
        
        return (
          <TableActionMenu
            align="start"
            items={[
              { label: 'Voir les détails', icon: Eye, onClick: () => handleViewDetails(user) },
              { label: 'Retirer du client', icon: UserX, onClick: () => handleRemoveClick(user), destructive: true },
            ]}
          />
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [dynamicColumns]);

  if (!selectedClient) {
    return (
      <EmptyState icon={Users} title="Sélectionnez un client pour gérer ses utilisateurs" />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les utilisateurs et leurs accès à ce client."
        action={{
          label: "Inviter un utilisateur",
          onClick: () => setInviteOpen(true),
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Import / Export
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.USERS_IMPORT))}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCSV} disabled={users.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={() => navigate(cp(CLIENT_ROUTES.USERS_FIELDS))}>
          Gérer les champs
          <Settings2 className="h-4 w-4" />
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={users}
        searchColumn="profiles.full_name"
        searchPlaceholder="Rechercher un utilisateur..."
        isLoading={isLoading}
        hideColumnSelector
        onRowClick={handleViewDetails}
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />

      <UserDetailsDrawer
        open={detailsDrawer.isOpen}
        onOpenChange={detailsDrawer.onOpenChange}
        user={currentUser}
      />

      <DeleteConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={handleRemove}
        title="Retirer l'utilisateur"
        description={`Êtes-vous sûr de vouloir retirer "${deleteDialog.item?.profiles?.full_name || deleteDialog.item?.profiles?.email}" de ce client ? L'utilisateur perdra l'accès à toutes les données de ce client.`}
        isDeleting={removeMutation.isPending}
      />
    </div>
  );
}
