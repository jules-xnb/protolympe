import { useState, useEffect, useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFieldValue } from '@/lib/format-utils';
import { evaluateFormula } from '@/lib/formula-evaluator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Pencil,
  FileText,
  Archive,
  MoreVertical,
  Settings2,
  Copy,
  History,
  Plus,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  useBusinessObjectDefinition,
  useArchiveBusinessObjectDefinition,
} from '@/hooks/useBusinessObjectDefinitions';
import { useFieldDefinitions } from '@/hooks/useFieldDefinitions';
import { useBusinessObjects, useArchivedBusinessObjects, useArchiveBusinessObject, type BusinessObjectWithValues, type PaginatedBusinessObjects } from '@/hooks/useBusinessObjects';
import { useReferentialValueLabels } from '@/hooks/useReferentialValues';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { DataTable } from '@/components/admin/DataTable';
import { BusinessObjectDefinitionFormDialog } from '@/components/admin/business-objects/BusinessObjectDefinitionFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { BusinessObjectFormDialog } from '@/components/admin/business-objects/BusinessObjectFormDialog';
import { toast } from 'sonner';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export default function BusinessObjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { setLabel, clearLabel } = useBreadcrumb();
  
  const [boPage, setBoPage] = useState(1);
  const boPageSize = DEFAULT_PAGE_SIZE;

  const { data: definition, isLoading } = useBusinessObjectDefinition(id);
  const { data: fields = [] } = useFieldDefinitions(id);
  const { data: boResult, isLoading: isLoadingInstances } = useBusinessObjects(id, boPage, boPageSize);
  const instances = (boResult as PaginatedBusinessObjects)?.data ?? [];
  const boTotalCount = (boResult as PaginatedBusinessObjects)?.totalCount ?? 0;
  const archiveMutation = useArchiveBusinessObjectDefinition();
  const { data: archivedInstances = [] } = useArchivedBusinessObjects(id);
  const archiveInstanceMutation = useArchiveBusinessObject();
  const archiveInstanceDialog = useDialogState<BusinessObjectWithValues>();
  // Collect referential IDs from fields that use them
  const referentialIds = useMemo(() => {
    return fields
      .filter(f => f.referential_id)
      .map(f => f.referential_id!)
      .filter((id, i, arr) => arr.indexOf(id) === i);
  }, [fields]);

  // Fetch referential values for lookup
  const { data: refValues = [] } = useReferentialValueLabels(referentialIds);

  // Build a lookup map: value ID -> label
  const refLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    refValues.forEach(rv => map.set(rv.id, rv.label));
    return map;
  }, [refValues]);

  const createDialog = useDialogState();
  const [formOpen, setFormOpen] = useState(false);
  const [duplicateFrom, setDuplicateFrom] = useState<typeof definition>(null);
  const archiveDialog = useDialogState();

  // System eo field (for fixed 2nd column) and other visible fields
  const eoField = useMemo(() => fields.find(f => f.is_system && f.slug === 'eo_id' && !f.is_hidden), [fields]);
  const visibleFields = useMemo(() => {
    return [...fields]
      .filter(f => !f.is_hidden && !f.parent_field_id && !(f.is_system && f.slug === 'eo_id'))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [fields]);

  // Dynamic columns for instances DataTable
  const hasCampaignType = instances.some(i => i.campaign_type_name);
  const hasCampaign = instances.some(i => i.campaign_name);

  const instanceColumns = useMemo<ColumnDef<BusinessObjectWithValues>[]>(() => {
    const cols: ColumnDef<BusinessObjectWithValues>[] = [
      {
        accessorKey: 'reference_number',
        header: 'Identifiant',
        size: 120,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.reference_number}</span>
        ),
      },
    ];

    // EO column as 2nd column
    if (eoField) {
      cols.push({
        id: `field_${eoField.id}`,
        header: eoField.name,
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground truncate">
            {row.original.eo_name || '—'}
          </span>
        ),
      });
    }

    cols.push({
      id: 'dynamic_status',
      accessorFn: (row) => row.dynamic_status,
      header: 'Statut',
      size: 120,
      cell: ({ row }) => (
        <span className="text-xs">{row.original.dynamic_status || '—'}</span>
      ),
    });

    if (hasCampaignType) {
      cols.push({
        id: 'campaign_type_name',
        accessorFn: (row) => row.campaign_type_name,
        header: 'Type de campagne',
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs truncate">{row.original.campaign_type_name || '—'}</span>
        ),
      });
    }

    if (hasCampaign) {
      cols.push({
        id: 'campaign_name',
        accessorFn: (row) => row.campaign_name,
        header: 'Campagne',
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs truncate">{row.original.campaign_name || '—'}</span>
        ),
      });
    }

    // Add dynamic field columns
    visibleFields.forEach(field => {
      cols.push({
        id: `field_${field.id}`,
        header: field.name,
        size: 140,
        cell: ({ row }) => {
          const value = field.field_type === 'calculated' && field.calculation_formula
            ? evaluateFormula(field.calculation_formula, row.original.field_values, fields)
            : row.original.field_values[field.id];
          return (
            <span className="text-xs truncate">
              {formatFieldValue(value, field.field_type === 'calculated' ? 'text' : field.field_type, refLabelMap)}
            </span>
          );
        },
      });
    });

    cols.push({
      accessorKey: 'created_at',
      header: 'Créé le',
      size: 90,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {format(new Date(row.original.created_at), 'dd/MM/yyyy', { locale: fr })}
        </span>
      ),
    });

    cols.push({
      id: 'actions',
      size: 60,
      maxSize: 60,
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => archiveInstanceDialog.open(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Archive className="h-4 w-4" />
                Archiver
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    });

    return cols;
  }, [visibleFields, hasCampaignType, hasCampaign, refLabelMap]);

  // Set breadcrumb label to use slug instead of ID
  useEffect(() => {
    if (definition && id) {
      setLabel(id, definition.slug);
    }
    return () => {
      if (id) clearLabel(id);
    };
  }, [definition, id, setLabel, clearLabel]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!definition) {
    return (
      <Alert variant="empty" className="flex flex-col items-center justify-center text-center gap-3 py-10">
        <AlertTitle className="flex flex-col items-center gap-3 text-base font-medium">
          <FileText className="h-10 w-10 opacity-50" />
          Objet métier non trouvé
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS))}>
            Retour à la liste <ArrowLeft className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }


  const handleArchive = async () => {
    try {
      await archiveMutation.mutateAsync(definition.id);
      toast.success('Objet métier archivé');
      navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'archivage");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS))}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground truncate">{definition.name}</h1>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => archiveDialog.open()}
          >
            Archiver
            <Archive className="h-4 w-4" />
          </Button>
          <Button
            variant="text"
            onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECT_HISTORY(id!)))}
          >
            Historique
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECT_STRUCTURE(definition.id)))}
          >
            Structure
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => createDialog.open()}>
            Ajouter
            <Plus className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setDuplicateFrom(definition); setFormOpen(true); }}>
              <Copy className="h-4 w-4 mr-2" />
              Dupliquer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECT_ARCHIVED_INSTANCES(id!)))}>
              <Archive className="h-4 w-4 mr-2" />
              Archivés{archivedInstances.length > 0 ? ` (${archivedInstances.length})` : ''}
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Instances */}
      <DataTable
        columns={instanceColumns}
        data={instances}
        searchColumns={['reference_number', 'eo_name']}
        searchPlaceholder="Rechercher par identifiant ou entité..."
        isLoading={isLoadingInstances}
        hideColumnSelector
        serverPagination={{
          totalItems: boTotalCount,
          currentPage: boPage,
          totalPages: Math.ceil(boTotalCount / boPageSize) || 1,
          pageSize: boPageSize,
          onPageChange: setBoPage,
        }}
      />

      {/* Metadata */}
      <div className="text-sm text-muted-foreground space-x-4">
        <span>
          Créé le {format(new Date(definition.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
        </span>
        <span>•</span>
        <span>
          Mis à jour le {format(new Date(definition.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
        </span>
      </div>

      {/* Dialogs */}
      <BusinessObjectDefinitionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setDuplicateFrom(null);
        }}
        definition={duplicateFrom ? undefined : definition}
        duplicateFrom={duplicateFrom}
      />

      <DeleteConfirmDialog
        open={archiveDialog.isOpen}
        onOpenChange={archiveDialog.onOpenChange}
        onConfirm={handleArchive}
        title="Archiver l'objet métier"
        description={`Êtes-vous sûr de vouloir archiver l'objet métier "${definition.name}" ? Il sera déplacé dans les archives et pourra être restauré ultérieurement.`}
        isDeleting={archiveMutation.isPending}
      />

      <DeleteConfirmDialog
        open={archiveInstanceDialog.isOpen}
        onOpenChange={archiveInstanceDialog.onOpenChange}
        onConfirm={async () => {
          if (!archiveInstanceDialog.item) return;
          try {
            await archiveInstanceMutation.mutateAsync(archiveInstanceDialog.item.id);
            toast.success(`Instance "${archiveInstanceDialog.item.reference_number}" archivée`);
            archiveInstanceDialog.close();
          } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erreur lors de l'archivage");
          }
        }}
        title="Archiver l'instance"
        description={`Êtes-vous sûr de vouloir archiver l'instance "${archiveInstanceDialog.item?.reference_number}" ? Elle pourra être restaurée depuis les archives.`}
        isDeleting={archiveInstanceMutation.isPending}
      />

      {/* Create BO Dialog */}
      <BusinessObjectFormDialog
        open={createDialog.isOpen}
        onOpenChange={createDialog.onOpenChange}
        definitionId={id!}
      />
    </div>
  );
}
