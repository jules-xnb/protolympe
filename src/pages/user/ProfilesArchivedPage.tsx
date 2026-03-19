import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Chip } from '@/components/ui/chip';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import {
  useProfileTemplates,
  useRestoreProfileTemplate,
  type ProfileTemplate,
} from '@/hooks/useProfileTemplates';
import { useViewMode } from '@/contexts/ViewModeContext';
import { Users } from 'lucide-react';

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

export default function UserProfilesArchivedPage() {
  const navigate = useNavigate();
  const { selectedClient } = useViewMode();
  const { data: templates = [], isLoading } = useProfileTemplates(selectedClient?.id);
  const restoreMutation = useRestoreProfileTemplate();

  const archivedTemplates = templates.filter((t: ProfileTemplate) => !t.is_active);

  return (
    <ArchivedItemsPage
      title="Archives — Profils"
      backAction={() => navigate(-1)}
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
