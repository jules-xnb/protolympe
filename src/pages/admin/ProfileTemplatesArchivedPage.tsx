import { ColumnDef } from '@tanstack/react-table';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Chip } from '@/components/ui/chip';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import {
  useProfileTemplates,
  useRestoreProfileTemplate,
  type ProfileTemplate,
} from '@/hooks/useProfileTemplates';
import { useViewMode } from '@/contexts/ViewModeContext';
import { UserCog, Users } from 'lucide-react';

const columns: ColumnDef<ProfileTemplate, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    id: 'user_count',
    header: 'Utilisateurs',
    cell: ({ row }) => (
      <Chip variant="outline" className="gap-1">
        <Users className="h-3 w-3" />
        {row.original._userCount}
      </Chip>
    ),
  },
];

export default function ProfileTemplatesArchivedPage() {
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: templates = [], isLoading } = useProfileTemplates(selectedClient?.id);
  const restoreMutation = useRestoreProfileTemplate();

  const archivedTemplates = templates.filter((t: ProfileTemplate) => !t.is_active);

  if (!selectedClient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <UserCog className="h-12 w-12 mb-4 opacity-50" />
        <p>Sélectionnez un client</p>
      </div>
    );
  }

  return (
    <ArchivedItemsPage
      title="Archives — Profils"
      backRoute={cp(CLIENT_ROUTES.PROFILES)}
      data={archivedTemplates}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (id) => { restoreMutation.mutate(id); }}
      isRestoring={restoreMutation.isPending}
      searchColumn="name"
      searchPlaceholder="Rechercher un profil archivé..."
    />
  );
}
