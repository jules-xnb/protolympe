import { useState, useEffect, useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Archive,
  Link,
  BookOpen,
  CheckCircle2,
  FileText,
  Upload,
  Ellipsis,
  Zap,
  Hash,
  Fingerprint,
  Calendar,
  PinIcon,
} from 'lucide-react';
import { Lock } from 'lucide-react';
import { useBusinessObjectDefinition, useUpdateBusinessObjectDefinition } from '@/hooks/useBusinessObjectDefinitions';
import {
  useFieldDefinitions,
  useArchiveFieldDefinition,
  useArchivedFieldDefinitions,
  type FieldDefinitionWithRelations,
} from '@/hooks/useFieldDefinitions';
import { FieldDefinitionFormDialog } from '@/components/admin/business-objects/FieldDefinitionFormDialog';
import { FieldImportDialog } from '@/components/admin/business-objects/FieldImportDialog';
import { DataTable } from '@/components/admin/DataTable';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { PageHeader } from '@/components/admin/PageHeader';
import { getFieldTypeLabel } from '@/lib/field-type-registry';

type FieldRow = FieldDefinitionWithRelations & {
  _isSystem?: boolean;
  _isEditable?: boolean;
};

export default function BusinessObjectStructurePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { setLabel, clearLabel } = useBreadcrumb();

  const { data: definition, isLoading } = useBusinessObjectDefinition(id);
  const SYSTEM_SLUGS = ['reference_number', 'name', 'eo_id', 'status', 'created_by_user_id', 'created_at', 'updated_at'];
  const { data: allFields = [] } = useFieldDefinitions(id);
  const customFields = allFields.filter(f => !SYSTEM_SLUGS.includes(f.slug));
  const { data: archivedFields = [] } = useArchivedFieldDefinitions(id);
  const archiveMutation = useArchiveFieldDefinition();
  const updateDefinition = useUpdateBusinessObjectDefinition();

  const settings = (definition?.settings ?? {}) as Record<string, unknown>;
  const nameFieldLabel = (settings.name_field_label as string) || 'Nom';
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameLabelDraft, setNameLabelDraft] = useState(nameFieldLabel);

  // Build system fields as FieldRow entries
  const systemFields = useMemo<FieldRow[]>(() => {
    const base = { _isSystem: true, _isEditable: false, is_active: true, is_required: false, is_unique: false, is_readonly: false, display_order: 0, client_id: '', created_at: '', updated_at: '', created_by: null, default_value: null, description: null, options: null, settings: null, validation_rules: null, referential: null, reference_object_definition: null } as const;
    return [
      { ...base, id: '_sys_ref', name: 'Identifiant', slug: 'reference_number', field_type: 'text' as FieldType, display_order: -7, is_required: true },
      { ...base, id: '_sys_name', name: nameFieldLabel, slug: 'name', field_type: 'text' as FieldType, display_order: -6, is_required: true, _isEditable: true },
      { ...base, id: '_sys_eo_id', name: 'Entité organisationnelle', slug: 'eo_id', field_type: 'eo_reference' as FieldType, is_required: true, display_order: -5 },
      { ...base, id: '_sys_status', name: 'Statut', slug: 'status', field_type: 'text' as FieldType, display_order: -4 },
      { ...base, id: '_sys_created_by', name: 'Créé par', slug: 'created_by_user_id', field_type: 'user_reference' as FieldType, display_order: -3 },
      { ...base, id: '_sys_created_at', name: 'Date de création', slug: 'created_at', field_type: 'datetime' as FieldType, display_order: -2 },
      { ...base, id: '_sys_updated_at', name: 'Date de modification', slug: 'updated_at', field_type: 'datetime' as FieldType, display_order: -1 },
    ];
  }, [nameFieldLabel]);

  const allFieldRows = useMemo<FieldRow[]>(
    () => [...systemFields, ...customFields],
    [systemFields, customFields],
  );

  const formDialog = useDialogState<FieldDefinitionWithRelations>();
  const archiveDialog = useDialogState<FieldDefinitionWithRelations>();
  const [importOpen, setImportOpen] = useState(false);

  const fieldColumns = useMemo<ColumnDef<FieldRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Nom',
      size: 200,
      cell: ({ row }) => {
        const f = row.original as FieldRow;
        return (
          <div className={`flex items-center gap-2 ${f._isSystem ? 'text-muted-foreground' : ''}`}>
            {f._isSystem && <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            <div>
              <div className="font-medium">{f.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{f.slug}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'field_type',
      header: 'Type',
      size: 140,
      cell: ({ row }) => {
        const f = row.original as FieldRow;
        return (
          <span className="text-xs text-muted-foreground">{getFieldTypeLabel(f.field_type)}</span>
        );
      },
    },
    {
      id: 'reference',
      header: 'Référence',
      size: 180,
      cell: ({ row }) => {
        const field = row.original;
        if (field.referential) {
          return (
            <div className="flex items-center gap-1.5 text-sm">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-primary">{field.referential.name}</span>
            </div>
          );
        }
        if (field.reference_object_definition) {
          return (
            <div className="flex items-center gap-1.5 text-sm">
              <Link className="h-3.5 w-3.5 text-warning" />
              <span className="text-warning">{field.reference_object_definition.name}</span>
            </div>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'is_readonly',
      header: 'Lecture seule',
      size: 100,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.is_readonly ? (
            <CheckCircle2 className="h-4 w-4 text-warning mx-auto" />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'is_required',
      header: 'Requis',
      size: 80,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.is_required ? (
            <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: 'is_unique',
      header: 'Unique',
      size: 80,
      cell: ({ row }) => {
        const s = (row.original.settings || {}) as Record<string, unknown>;
        return (
          <div className="text-center">
            {s.is_unique ? (
              <Fingerprint className="h-4 w-4 text-purple-500 mx-auto" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'auto_generate',
      header: 'Auto-génération',
      size: 120,
      cell: ({ row }) => {
        const f = row.original;
        if (f._isSystem) return <span className="text-muted-foreground">—</span>;
        const settings = (f.settings || {}) as Record<string, unknown>;
        const autoGen = settings.auto_generate as Record<string, unknown> | undefined;
        if (!autoGen?.enabled) return <span className="text-muted-foreground">—</span>;
        const mode = autoGen.mode as string;
        const modeConfig: Record<string, { icon: typeof Zap; label: string; color: string }> = {
          counter: { icon: Hash, label: 'Compteur', color: 'text-blue-500' },
          uuid: { icon: Fingerprint, label: 'UUID', color: 'text-purple-500' },
          date: { icon: Calendar, label: 'Date', color: 'text-orange-500' },
          fixed_value: { icon: PinIcon, label: 'Valeur fixe', color: 'text-emerald-500' },
        };
        const config = modeConfig[mode] || { icon: Zap, label: mode, color: 'text-muted-foreground' };
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            <span className="text-xs text-muted-foreground">{config.label}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Action',
      size: 60,
      maxSize: 60,
      cell: ({ row }) => {
        const f = row.original as FieldRow;
        if (f._isSystem) {
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!f._isEditable}>
                    <Ellipsis className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setNameLabelDraft(nameFieldLabel); setNameDialogOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(f)}>
                  <Pencil className="h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchive(f)} className="text-destructive focus:text-destructive">
                  <Archive className="h-4 w-4" />
                  Archiver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [nameFieldLabel]);

  useEffect(() => {
    if (definition && id) {
      setLabel(id, definition.slug);
    }
    return () => {
      if (id) clearLabel(id);
    };
  }, [definition, id, setLabel, clearLabel]);

  const handleEdit = (field: FieldDefinitionWithRelations) => {
    formDialog.open(field);
  };

  const handleArchive = (field: FieldDefinitionWithRelations) => {
    archiveDialog.open(field);
  };

  const confirmArchive = async () => {
    if (!archiveDialog.item) return;
    try {
      await archiveMutation.mutateAsync(archiveDialog.item.id);
      toast.success('Champ archivé');
      archiveDialog.close();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'archivage");
    }
  };

  const saveNameLabel = async () => {
    const trimmed = nameLabelDraft.trim();
    if (!trimmed || trimmed === nameFieldLabel) {
      setNameDialogOpen(false);
      setNameLabelDraft(nameFieldLabel);
      return;
    }
    try {
      await updateDefinition.mutateAsync({
        id: id!,
        settings: { ...settings, name_field_label: trimmed },
      });
      setNameDialogOpen(false);
      toast.success('Label du champ mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

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
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!definition) {
    return (
      <EmptyState
        icon={FileText}
        title="Objet métier non trouvé"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECTS))}>
            Retour à la liste <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Structure"
        backAction={{ onClick: () => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECT_DETAIL(id!))) }}
      >
        <Button variant="ghost" size="sm" onClick={() => navigate(cp(CLIENT_ROUTES.BUSINESS_OBJECT_ARCHIVED_FIELDS(id!)))}>
          Archivés{archivedFields.length > 0 ? ` (${archivedFields.length})` : ''}
          <Archive className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          Importer
          <Upload className="h-4 w-4" />
        </Button>
        <Button onClick={() => formDialog.open()}>
          Ajouter un champ
          <Plus className="h-4 w-4" />
        </Button>
      </PageHeader>

      {/* All Fields (system + custom) */}
      <DataTable
        columns={fieldColumns}
        data={allFieldRows}
        searchColumn="name"
        searchPlaceholder="Rechercher un champ..."
        hideColumnSelector
        hideSearch={allFieldRows.length <= 3}
      />

      {/* Form Dialog */}
      <FieldDefinitionFormDialog
        open={formDialog.isOpen}
        onOpenChange={formDialog.onOpenChange}
        objectDefinitionId={id!}
        field={formDialog.item}
        fields={allFields}
      />

      {/* Archive Confirmation */}
      <DeleteConfirmDialog
        open={archiveDialog.isOpen}
        onOpenChange={archiveDialog.onOpenChange}
        onConfirm={confirmArchive}
        title="Archiver le champ"
        description={`Êtes-vous sûr de vouloir archiver le champ "${archiveDialog.item?.name}" ? Il ne sera plus visible mais pourra être restauré.`}
        isDeleting={archiveMutation.isPending}
      />

      {/* Name Label Edit Dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={(open) => { setNameDialogOpen(open); if (!open) setNameLabelDraft(nameFieldLabel); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le label du champ Nom</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="name-label">Label</Label>
            <Input
              id="name-label"
              value={nameLabelDraft}
              onChange={(e) => setNameLabelDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveNameLabel(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNameDialogOpen(false); setNameLabelDraft(nameFieldLabel); }}>
              Annuler
            </Button>
            <Button onClick={saveNameLabel} disabled={updateDefinition.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Import Dialog */}
      <FieldImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        objectDefinitionId={id!}
        objectName={definition.name}
        existingFieldCount={allFields.length}
        existingFieldNames={customFields.map(f => f.name)}
      />
    </div>
  );
}
