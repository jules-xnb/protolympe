import { ColumnDef } from '@tanstack/react-table';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Chip } from '@/components/ui/chip';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import {
  useArchivedEoFieldDefinitions,
  useRestoreEoFieldDefinition,
  EoFieldDefinition,
} from '@/hooks/useEoFieldDefinitions';
import { getFieldTypeIcon, getFieldTypeLabel } from '@/lib/field-type-registry';

const columns: ColumnDef<EoFieldDefinition, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.slug}</p>
      </div>
    ),
  },
  {
    accessorKey: 'field_type',
    header: 'Type',
    cell: ({ row }) => {
      const Icon = getFieldTypeIcon(row.original.field_type);
      return (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{getFieldTypeLabel(row.original.field_type)}</span>
        </div>
      );
    },
  },
  {
    id: 'is_required',
    header: 'Obligatoire',
    cell: ({ row }) => (
      row.original.is_required
        ? <Chip variant="default" className="text-xs">Oui</Chip>
        : <Chip variant="outline" className="text-xs">Non</Chip>
    ),
  },
];

export default function EoFieldsArchivedPage() {
  const cp = useClientPath();
  const { data: archivedFields = [], isLoading } = useArchivedEoFieldDefinitions();
  const restoreField = useRestoreEoFieldDefinition();

  return (
    <ArchivedItemsPage
      title="Champs archivés"
      description="Champs personnalisés archivés. Restaurez-les pour les rendre à nouveau disponibles."
      backRoute={cp(CLIENT_ROUTES.ENTITIES_FIELDS)}
      data={archivedFields}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (id) => { restoreField.mutate(id); }}
      isRestoring={restoreField.isPending}
      searchColumns={['name', 'slug']}
      searchPlaceholder="Rechercher un champ archivé..."
    />
  );
}
