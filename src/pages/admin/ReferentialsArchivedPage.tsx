import { ColumnDef } from '@tanstack/react-table';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Chip } from '@/components/ui/chip';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import { useArchivedReferentials, useRestoreReferential, type Referential } from '@/hooks/useReferentials';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Database, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const columns: ColumnDef<Referential, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-muted">
          <Database className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{row.original.name}</div>
          <div className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
            {row.original.slug}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'tag',
    header: 'Tag',
    cell: ({ row }) => (
      row.original.tag ? (
        <Chip variant="default" className="gap-1">
          <Tag className="h-3 w-3" />
          {row.original.tag}
        </Chip>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-muted-foreground line-clamp-1">
        {row.original.description || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'Créé le',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {format(new Date(row.original.created_at), 'dd MMM yyyy', { locale: fr })}
      </span>
    ),
  },
];

export default function ReferentialsArchivedPage() {
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: archivedReferentials = [], isLoading } = useArchivedReferentials();
  const restoreMutation = useRestoreReferential();

  if (!selectedClient) {
    return <EmptyState icon={Database} title="Sélectionnez un client" />;
  }

  return (
    <ArchivedItemsPage
      title="Archives — Référentiels"
      backRoute={cp(CLIENT_ROUTES.REFERENTIALS)}
      data={archivedReferentials}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (id) => {
        const item = archivedReferentials.find(r => r.id === id);
        await restoreMutation.mutateAsync(id);
        toast.success(`"${item?.name}" restauré`);
      }}
      isRestoring={restoreMutation.isPending}
      searchColumn="name"
      searchPlaceholder="Rechercher un référentiel archivé..."
    />
  );
}
