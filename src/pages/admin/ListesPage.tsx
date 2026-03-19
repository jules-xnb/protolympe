import { useState, useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { ListeFormDialog } from '@/components/admin/listes/ListeFormDialog';

import { ListeValuesDrawer } from '@/components/admin/listes/ListeValuesDrawer';
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
import { useListes, useDeleteListe, type Liste } from '@/hooks/useListes';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import { Database, Upload, Tag, Download, ArrowUpDown, Archive } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

export default function ListesPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: listes = [], isLoading } = useListes();
  const deleteMutation = useDeleteListe();


  const [formOpen, setFormOpen] = useState(false);
  const valuesDrawer = useDialogState<Liste>();
  const deleteDialog = useDialogState<Liste>();

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagFilterOpen, setTagFilterOpen] = useState(false);

  // Get unique tags from listes
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    listes.forEach((r: Liste) => {
      if (r.tag) tags.add(r.tag);
    });
    return Array.from(tags).sort();
  }, [listes]);

  // Filter listes by selected tag
  const filteredListes = useMemo(() => {
    if (selectedTags.size === 0) return listes;
    return listes.filter((r: Liste) => r.tag && selectedTags.has(r.tag));
  }, [listes, selectedTags]);




  const handleRowClick = (liste: Liste) => {
    valuesDrawer.open(liste);
  };

  const handleDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      await deleteMutation.mutateAsync(deleteDialog.item.id);
      toast.success('Liste supprimée');
      deleteDialog.close();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const handleExport = async () => {
    if (listes.length === 0) return;

    // Fetch all values for all listes in one query
    const refIds = listes.map((r: Liste) => r.id);
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

    // Group values by liste, keeping listes without values too
    for (const ref of listes) {
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
    a.download = `listes_${selectedClient?.slug || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const columns: ColumnDef<Liste>[] = [
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
      <EmptyState icon={Database} title="Sélectionnez un client pour gérer ses listes" />
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
        <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.LISTES_ARCHIVED))}>
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
            <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.LISTES_IMPORT))}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport} disabled={listes.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <DataTable
        columns={columns}
        data={filteredListes}
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

      <ListeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        liste={null}
      />

      <ListeValuesDrawer
        open={valuesDrawer.isOpen}
        onOpenChange={valuesDrawer.onOpenChange}
        liste={valuesDrawer.item}
      />

      <DeleteConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={handleDelete}
        title="Supprimer la liste"
        description={`Êtes-vous sûr de vouloir supprimer la liste "${deleteDialog.item?.name}" ? Cette action supprimera également toutes ses valeurs.`}
        isDeleting={deleteMutation.isPending}
      />



    </div>
  );
}
