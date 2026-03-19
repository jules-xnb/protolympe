import { useState, useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { ReferentialFormDialog } from '@/components/admin/referentials/ReferentialFormDialog';

import { ReferentialValuesDrawer } from '@/components/admin/referentials/ReferentialValuesDrawer';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReferentials, useDeleteReferential, type Referential } from '@/hooks/useReferentials';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Database, Upload, Tag, Download, ArrowUpDown, Archive } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export default function ReferentialsPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: referentials = [], isLoading } = useReferentials();
  const deleteMutation = useDeleteReferential();


  const [formOpen, setFormOpen] = useState(false);
  const valuesDrawer = useDialogState<Referential>();
  const deleteDialog = useDialogState<Referential>();

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagFilterOpen, setTagFilterOpen] = useState(false);

  // Get unique tags from referentials
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    referentials.forEach((r: Referential) => {
      if (r.tag) tags.add(r.tag);
    });
    return Array.from(tags).sort();
  }, [referentials]);

  // Filter referentials by selected tag
  const filteredReferentials = useMemo(() => {
    if (selectedTags.size === 0) return referentials;
    return referentials.filter((r: Referential) => r.tag && selectedTags.has(r.tag));
  }, [referentials, selectedTags]);




  const handleRowClick = (referential: Referential) => {
    valuesDrawer.open(referential);
  };

  const handleDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      await deleteMutation.mutateAsync(deleteDialog.item.id);
      toast.success('Référentiel supprimé');
      deleteDialog.close();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const handleExport = async () => {
    if (referentials.length === 0) return;

    // Fetch all values for all referentials in one query
    const refIds = referentials.map((r: Referential) => r.id);
    let allValues: Array<{ id: string; referential_id: string; code: string; label: string; description: string | null; color: string | null; parent_value_id: string | null; display_order: number }>;
    try {
      allValues = await api.get<typeof allValues>(
        `/api/referentials/values/export?referential_ids=${refIds.join(',')}`
      );
    } catch {
      toast.error("Erreur lors de l'export");
      return;
    }

    // Build a map of values by id for parent resolution
    const valuesById = new Map((allValues || []).map(v => [v.id, v]));

    // Helper to resolve parent code path
    const getParentCode = (val: typeof allValues[0]): string => {
      if (!val.parent_value_id) return '';
      const parent = valuesById.get(val.parent_value_id);
      return parent ? parent.code : '';
    };

    const csvRows: string[] = [];
    csvRows.push(['referential_name', 'referential_slug', 'referential_tag', 'value_code', 'value_label', 'value_description', 'value_color', 'parent_code'].join(';'));

    // Group values by referential, keeping referentials without values too
    for (const ref of referentials) {
      const refValues = (allValues || []).filter(v => v.referential_id === ref.id);
      if (refValues.length === 0) {
        csvRows.push([ref.name, ref.slug, ref.tag || '', '', '', '', '', ''].join(';'));
      } else {
        for (const val of refValues) {
          csvRows.push([
            ref.name, ref.slug, ref.tag || '',
            val.code, val.label, val.description || '', val.color || '',
            getParentCode(val),
          ].join(';'));
        }
      }
    }

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referentiels_${selectedClient?.slug || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const columns: ColumnDef<Referential>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{row.original.name}</div>
          <div className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
            {row.original.slug}
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


  ];

  if (!selectedClient) {
    return (
      <EmptyState icon={Database} title="Sélectionnez un client pour gérer ses référentiels" />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Listes"
        description="Gérez les listes de valeurs utilisées dans vos objets métiers et workflows."
        action={{
          label: "Nouvelle liste",
          onClick: () => setFormOpen(true),
        }}
      >
        <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.REFERENTIALS_ARCHIVED))}>
          Archives
          <Archive className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Import / Export
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.REFERENTIALS_IMPORT))}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport} disabled={referentials.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <DataTable
        columns={columns}
        data={filteredReferentials}
        searchColumns={['name', 'tag']}
        searchPlaceholder="Rechercher par nom ou tag..."
        isLoading={isLoading}
        onRowClick={handleRowClick}
        toolbarRight={availableTags.length > 0 ? (
          <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2">
                Filtrer par tag
                {selectedTags.size > 0 && (
                  <Chip variant="default" className="ml-1 h-5 px-1.5 text-xs">
                    {selectedTags.size}
                  </Chip>
                )}
                <Tag className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2 max-h-60 overflow-y-auto" align="start">
              <div className="flex flex-col gap-0.5">
                {availableTags.map(tag => (
                  <label
                    key={tag}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedTags.has(tag)}
                      onCheckedChange={(checked) => {
                        setSelectedTags(prev => {
                          const next = new Set(prev);
                          if (checked) next.add(tag);
                          else next.delete(tag);
                          return next;
                        });
                      }}
                    />
                    {tag}
                  </label>
                ))}
                {selectedTags.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 text-xs justify-start"
                    onClick={() => setSelectedTags(new Set())}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        ) : undefined}
        hideColumnSelector
      />

      <ReferentialFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        referential={null}
      />

      <ReferentialValuesDrawer
        open={valuesDrawer.isOpen}
        onOpenChange={valuesDrawer.onOpenChange}
        referential={valuesDrawer.item}
      />

      <DeleteConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={handleDelete}
        title="Supprimer le référentiel"
        description={`Êtes-vous sûr de vouloir supprimer le référentiel "${deleteDialog.item?.name}" ? Cette action supprimera également toutes ses valeurs.`}
        isDeleting={deleteMutation.isPending}
      />



    </div>
  );
}
