import { ColumnDef } from '@tanstack/react-table';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import {
  useBusinessObjectDefinitions,
  useRestoreBusinessObjectDefinition,
  type BusinessObjectDefinitionWithRelations,
} from '@/hooks/useBusinessObjectDefinitions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const columns: ColumnDef<BusinessObjectDefinitionWithRelations, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    size: 280,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{row.original.name}</div>
        <div className="text-xs text-muted-foreground font-mono truncate">
          {row.original.slug}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    size: 300,
    cell: ({ row }) => (
      <span className="text-muted-foreground line-clamp-1">
        {row.original.description || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'updated_at',
    header: 'Archivé le',
    size: 120,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {format(new Date(row.original.updated_at), 'dd MMM yyyy', { locale: fr })}
      </span>
    ),
  },
];

export default function BusinessObjectsArchivedPage() {
  const cp = useClientPath();
  const { data: definitions = [], isLoading } = useBusinessObjectDefinitions();
  const restoreMutation = useRestoreBusinessObjectDefinition();

  const archivedDefinitions = definitions.filter(d => !d.is_active);

  return (
    <ArchivedItemsPage
      title="Archives — Objets Métiers"
      description="Objets métiers archivés. Restaurez-les pour les rendre à nouveau disponibles."
      backRoute={cp(CLIENT_ROUTES.BUSINESS_OBJECTS)}
      data={archivedDefinitions}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (id) => {
        const item = archivedDefinitions.find(d => d.id === id);
        await restoreMutation.mutateAsync(id);
        toast.success(`"${item?.name}" restauré`);
      }}
      isRestoring={restoreMutation.isPending}
      searchColumns={['name', 'description']}
      searchPlaceholder="Rechercher dans les archives..."
    />
  );
}
