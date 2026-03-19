import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';

interface ArchivedItemsPageProps<T extends { id: string }> {
  title: string;
  description?: string;
  backRoute?: string;
  backAction?: () => void;
  data: T[];
  isLoading: boolean;
  columns: ColumnDef<T, unknown>[];
  onRestore: (id: string) => Promise<void>;
  isRestoring?: boolean;
  searchColumn?: string;
  searchColumns?: string[];
  searchPlaceholder?: string;
  restoreLabel?: string;
}

export function ArchivedItemsPage<T extends { id: string }>({
  title,
  description,
  backRoute,
  backAction,
  data,
  isLoading,
  columns,
  onRestore,
  isRestoring,
  searchColumn,
  searchColumns,
  searchPlaceholder = 'Rechercher...',
  restoreLabel = 'Restaurer',
}: ArchivedItemsPageProps<T>) {
  const navigate = useNavigate();

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await onRestore(id);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la restauration');
    }
  };

  const allColumns: ColumnDef<T, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: '',
      size: 120,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleRestore(e, (row.original as T & { id: string }).id)}
            disabled={isRestoring}
          >
            {restoreLabel}
            <ArchiveRestore className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const resolvedBackAction = backAction
    ? { onClick: backAction }
    : backRoute
      ? { onClick: () => navigate(backRoute) }
      : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={title}
        description={description}
        backAction={resolvedBackAction}
      />

      <DataTable
        columns={allColumns}
        data={data}
        searchColumn={searchColumn}
        searchColumns={searchColumns}
        searchPlaceholder={searchPlaceholder}
        isLoading={isLoading}
        hideColumnSelector
      />
    </div>
  );
}
