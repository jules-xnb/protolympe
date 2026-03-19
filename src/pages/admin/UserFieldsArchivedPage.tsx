import { ColumnDef } from '@tanstack/react-table';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Chip } from '@/components/ui/chip';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import {
  useArchivedUserFieldDefinitions,
  useRestoreUserFieldDefinition,
  type UserFieldDefinition,
} from '@/hooks/useUserFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { UserCircle } from 'lucide-react';
import { getFieldTypeLabel, getFieldTypeIcon } from '@/lib/field-type-registry';

const columns: ColumnDef<UserFieldDefinition, unknown>[] = [
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          {getFieldTypeLabel(row.original.field_type)}
        </div>
      );
    },
  },
  {
    id: 'is_required',
    header: 'Obligatoire',
    cell: ({ row }) => (
      <Chip variant={row.original.is_required ? 'default' : 'outline'} className="text-xs">
        {row.original.is_required ? 'Oui' : 'Non'}
      </Chip>
    ),
  },
];

export default function UserFieldsArchivedPage() {
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: fields = [], isLoading } = useArchivedUserFieldDefinitions();
  const restoreMutation = useRestoreUserFieldDefinition();

  if (!selectedClient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <UserCircle className="h-12 w-12 mb-4 opacity-50" />
        <p>Sélectionnez un client</p>
      </div>
    );
  }

  return (
    <ArchivedItemsPage
      title="Archives — Champs utilisateurs"
      backRoute={cp(CLIENT_ROUTES.USERS_FIELDS)}
      data={fields}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (id) => { restoreMutation.mutate(id); }}
      isRestoring={restoreMutation.isPending}
      searchColumn="name"
      searchPlaceholder="Rechercher un champ archivé..."
    />
  );
}
