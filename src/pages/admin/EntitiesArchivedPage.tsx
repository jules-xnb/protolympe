import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { ColumnDef } from '@tanstack/react-table';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import {
  useArchivedOrganizationalEntities,
  useUpdateOrganizationalEntity,
  type OrganizationalEntityWithClient,
} from '@/hooks/useOrganizationalEntities';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import { GitBranch } from 'lucide-react';

const columns: ColumnDef<OrganizationalEntityWithClient>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        {row.original.code && (
          <div className="text-xs text-muted-foreground font-mono">{row.original.code}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'level',
    header: 'Niveau',
    size: 80,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.level ?? '—'}</span>
    ),
  },
  {
    id: 'parent',
    header: 'Parent',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.parent?.[0]?.name ?? '—'}
      </span>
    ),
  },
];

export default function EntitiesArchivedPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data = [], isLoading } = useArchivedOrganizationalEntities(selectedClient?.id);
  const updateEntity = useUpdateOrganizationalEntity();

  if (!selectedClient) {
    return <EmptyState icon={GitBranch} title="Sélectionnez un client pour voir les entités archivées" />;
  }

  return (
    <ArchivedItemsPage
      title="Entités archivées"
      description={`Entités organisationnelles archivées de ${selectedClient.name}`}
      backAction={() => navigate(cp(CLIENT_ROUTES.ENTITIES))}
      data={data}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (id) => {
        await updateEntity.mutateAsync({ id, is_archived: false });
      }}
      isRestoring={updateEntity.isPending}
      searchColumn="name"
      searchPlaceholder="Rechercher une entité..."
      restoreLabel="Restaurer"
    />
  );
}
