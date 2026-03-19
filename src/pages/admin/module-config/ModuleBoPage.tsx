import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialogState } from '@/hooks/useDialogState';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/DataTable';
import { BusinessObjectDefinitionFormDialog } from '@/components/admin/business-objects/BusinessObjectDefinitionFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useBusinessObjectDefinitions,
  useArchiveBusinessObjectDefinition,
  type BusinessObjectDefinitionWithRelations,
} from '@/hooks/useBusinessObjectDefinitions';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Archive, Copy, FileText, Layers, MoreVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ModuleBoPageProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export default function ModuleBoPage({ externalOpen, onExternalOpenChange }: ModuleBoPageProps) {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { data: definitions = [], isLoading } = useBusinessObjectDefinitions();

  const [formOpen, setFormOpen] = useState(false);
  const duplicateDialog = useDialogState<BusinessObjectDefinitionWithRelations>();
  const archiveDialog = useDialogState<BusinessObjectDefinitionWithRelations>();
  const archiveMutation = useArchiveBusinessObjectDefinition();

  useEffect(() => {
    if (externalOpen) {
      setFormOpen(true);
      onExternalOpenChange?.(false);
    }
  }, [externalOpen, onExternalOpenChange]);

  const activeDefinitions = definitions.filter(d => d.is_active);

  const handleRowClick = (definition: BusinessObjectDefinitionWithRelations) => {
    navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECT_DETAIL(definition.id)));
  };

  const columns: ColumnDef<BusinessObjectDefinitionWithRelations>[] = [
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
      size: 250,
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-1">
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      accessorKey: '_count.fields',
      header: 'Champs',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span>{row.original._count?.fields || 0}</span>
        </div>
      ),
    },
    {
      accessorKey: '_count.objects',
      header: 'Instances',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{row.original._count?.objects || 0}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      size: 32,
      maxSize: 32,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => duplicateDialog.open(row.original)}>
                <Copy className="h-4 w-4 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => archiveDialog.open(row.original)}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archiver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="py-6 space-y-6">
      <DataTable
        columns={columns}
        data={activeDefinitions}
        searchColumns={['name', 'description']}
        searchPlaceholder="Rechercher par nom ou description..."
        isLoading={isLoading}
        onRowClick={handleRowClick}
        hideColumnSelector
      />

      <BusinessObjectDefinitionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        definition={null}
      />

      <BusinessObjectDefinitionFormDialog
        open={duplicateDialog.isOpen}
        onOpenChange={duplicateDialog.onOpenChange}
        definition={null}
        duplicateFrom={duplicateDialog.item}
      />

      <DeleteConfirmDialog
        open={archiveDialog.isOpen}
        onOpenChange={archiveDialog.onOpenChange}
        onConfirm={async () => {
          if (!archiveDialog.item) return;
          try {
            await archiveMutation.mutateAsync(archiveDialog.item.id);
            toast.success(`"${archiveDialog.item.name}" archivé`);
            archiveDialog.close();
          } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erreur lors de l'archivage");
          }
        }}
        title="Archiver l'objet métier"
        description={`Êtes-vous sûr de vouloir archiver "${archiveDialog.item?.name}" ? Il pourra être restauré depuis les archives.`}
        isDeleting={archiveMutation.isPending}
      />
    </div>
  );
}
