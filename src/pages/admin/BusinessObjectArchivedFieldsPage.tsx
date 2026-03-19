import { useParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Chip } from '@/components/ui/chip';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import {
  useArchivedFieldDefinitions,
  useRestoreFieldDefinition,
} from '@/hooks/useFieldDefinitions';
import { useBusinessObjectDefinition } from '@/hooks/useBusinessObjectDefinitions';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { toast } from 'sonner';
import type { Tables } from '@/types/database';
import { getFieldTypeLabel } from '@/lib/field-type-registry';

type FieldDefinition = Tables<'field_definitions'>;

const columns: ColumnDef<FieldDefinition, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Nom',
    size: 250,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{row.original.name}</div>
        <div className="text-xs text-muted-foreground font-mono truncate">{row.original.slug}</div>
      </div>
    ),
  },
  {
    accessorKey: 'field_type',
    header: 'Type',
    size: 140,
    cell: ({ row }) => (
      <Chip variant="default" className="text-xs">
        {getFieldTypeLabel(row.original.field_type)}
      </Chip>
    ),
  },
];

export default function BusinessObjectArchivedFieldsPage() {
  const { id } = useParams<{ id: string }>();
  const cp = useClientPath();
  const { data: definition } = useBusinessObjectDefinition(id);
  const { data: archivedFields = [], isLoading } = useArchivedFieldDefinitions(id);
  const restoreMutation = useRestoreFieldDefinition();

  return (
    <ArchivedItemsPage
      title={`Champs archivés${definition ? ` — ${definition.name}` : ''}`}
      backRoute={cp(CLIENT_ROUTES.BUSINESS_OBJECT_STRUCTURE(id!))}
      data={archivedFields}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (fieldId) => {
        const field = archivedFields.find(f => f.id === fieldId);
        await restoreMutation.mutateAsync(fieldId);
        toast.success(`"${field?.name}" restauré`);
      }}
      isRestoring={restoreMutation.isPending}
      searchColumn="name"
      searchPlaceholder="Rechercher un champ archivé..."
    />
  );
}
