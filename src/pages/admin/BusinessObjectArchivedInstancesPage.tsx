import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { ArchivedItemsPage } from '@/components/admin/ArchivedItemsPage';
import { useArchivedBusinessObjects, useRestoreBusinessObject } from '@/hooks/useBusinessObjects';
import { useBusinessObjectDefinition } from '@/hooks/useBusinessObjectDefinitions';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ArchivedInstance {
  id: string;
  reference_number: string;
  eo_name?: string;
  updated_at: string;
}

const columns: ColumnDef<ArchivedInstance, unknown>[] = [
  {
    accessorKey: 'reference_number',
    header: 'Identifiant',
    size: 150,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.reference_number}</span>
    ),
  },
  {
    id: 'eo_name',
    header: 'Entité',
    size: 200,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.eo_name || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'updated_at',
    header: 'Archivé le',
    size: 140,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.updated_at), 'dd/MM/yyyy', { locale: fr })}
      </span>
    ),
  },
];

export default function BusinessObjectArchivedInstancesPage() {
  const { id } = useParams<{ id: string }>();
  const cp = useClientPath();
  const { data: definition } = useBusinessObjectDefinition(id);
  const { data: archivedInstances = [], isLoading } = useArchivedBusinessObjects(id);
  const restoreMutation = useRestoreBusinessObject();

  return (
    <ArchivedItemsPage
      title={`Instances archivées${definition ? ` — ${definition.name}` : ''}`}
      backRoute={cp(CLIENT_ROUTES.BUSINESS_OBJECT_DETAIL(id!))}
      data={archivedInstances as ArchivedInstance[]}
      isLoading={isLoading}
      columns={columns}
      onRestore={async (instanceId) => {
        await restoreMutation.mutateAsync(instanceId);
        toast.success('Instance restaurée');
      }}
      isRestoring={restoreMutation.isPending}
      searchColumn="reference_number"
      searchPlaceholder="Rechercher par identifiant..."
    />
  );
}
