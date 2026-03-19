import { useMemo, useEffect } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { EoFieldFormDialog } from '@/components/admin/entities/eo-field-form/EoFieldFormDialog';
import {
  MoreHorizontal,
  Pencil,
  Type,
  Archive,
  Fingerprint,
  MessageSquare,
  Lock,
  Zap,
  Download,
  Upload,
  ArrowUpDown,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import {
  useEoFieldDefinitions,
  useArchiveEoFieldDefinition,
  useEoSystemNameField,
  useEnsureSystemNameField,
  useEoSystemIsActiveField,
  useEnsureSystemIsActiveField,
  EoFieldDefinition,
} from '@/hooks/useEoFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { getFieldTypeIcon, getFieldTypeLabel } from '@/lib/field-type-registry';

export default function EoFieldsPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id || '';
  const clientName = selectedClient?.name || '';

  const { data: fields = [], isLoading } = useEoFieldDefinitions(clientId || undefined);
  const { data: systemNameField } = useEoSystemNameField(clientId || undefined);
  const { data: systemIsActiveField } = useEoSystemIsActiveField(clientId || undefined);
  const ensureSystemName = useEnsureSystemNameField(clientId || undefined);
  const ensureSystemIsActive = useEnsureSystemIsActiveField(clientId || undefined);
  const archiveField = useArchiveEoFieldDefinition();

  const formDialog = useDialogState<EoFieldDefinition>();
  const archiveDialog = useDialogState<EoFieldDefinition>();

  // Auto-create system fields if missing
  useEffect(() => {
    if (clientId && systemNameField === null && !ensureSystemName.isPending) {
      ensureSystemName.mutate();
    }
  }, [clientId, systemNameField, ensureSystemName]);

  useEffect(() => {
    if (clientId && systemIsActiveField === null && !ensureSystemIsActive.isPending) {
      ensureSystemIsActive.mutate();
    }
  }, [clientId, systemIsActiveField, ensureSystemIsActive]);

  const handleEdit = (field: EoFieldDefinition) => {
    formDialog.open(field);
  };

  const handleCreate = () => {
    formDialog.open();
  };

  const handleExportFields = () => {
    const headers = ['name', 'slug', 'description', 'field_type', 'is_required', 'is_unique', 'options'];
    const rows = fields.map(f => {
      const options = Array.isArray(f.options) ? f.options.join('|') : '';
      return [
        f.name, f.slug, f.description || '', f.field_type,
        f.is_required ? 'oui' : 'non',
        f.is_unique ? 'oui' : 'non',
        options,
      ].map(v => {
        const s = String(v);
        if (s.includes(';') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
        return s;
      }).join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `champs_eo_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // ---------------------------------------------------------------------------
  // Unified data: system fields + custom fields
  // ---------------------------------------------------------------------------
  type UnifiedField = EoFieldDefinition & { _isSystem?: boolean };

  const unifiedData = useMemo<UnifiedField[]>(() => {
    const systemFields: UnifiedField[] = [];

    // Nom (system)
    if (systemNameField) {
      systemFields.push({ ...systemNameField, _isSystem: true });
    } else {
      systemFields.push({
        id: '__system_name',
        name: 'Nom',
        slug: 'name',
        field_type: 'text',
        is_required: true,
        is_unique: false,
        is_active: true,
        _isSystem: true,
      } as UnifiedField);
    }

    // ID (system) — always static
    systemFields.push({
      id: '__system_id',
      name: 'ID',
      slug: 'id (UUID)',
      field_type: '__uuid',
      is_required: true,
      is_unique: true,
      is_active: true,
      settings: { auto_generate: { enabled: true } },
      _isSystem: true,
    } as UnifiedField);

    // Statut actif (system)
    if (systemIsActiveField) {
      systemFields.push({ ...systemIsActiveField, _isSystem: true });
    } else {
      systemFields.push({
        id: '__system_is_active',
        name: 'Statut actif',
        slug: 'is_active',
        field_type: 'boolean',
        is_required: true,
        is_unique: false,
        is_active: true,
        _isSystem: true,
      } as UnifiedField);
    }

    return [...systemFields, ...fields];
  }, [systemNameField, systemIsActiveField, fields]);

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<UnifiedField>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.slug}</p>
          </div>
          {row.original._isSystem && (
            <Badge variant="outline" className="text-xs gap-1">
              <Lock className="h-3 w-3" />Système
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'field_type',
      header: 'Type',
      cell: ({ row }) => {
        if (row.original.field_type === '__uuid') {
          return (
            <div className="flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Identifiant unique</span>
            </div>
          );
        }
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
          ? <Badge variant="secondary" className="text-xs">Oui</Badge>
          : <Badge variant="outline" className="text-xs">Non</Badge>
      ),
    },
    {
      id: 'is_unique',
      header: 'Unique',
      cell: ({ row }) => (
        row.original.is_unique
          ? <Badge variant="secondary" className="text-xs">Oui</Badge>
          : <Badge variant="outline" className="text-xs">Non</Badge>
      ),
    },
    {
      id: 'comment',
      header: 'Commentaire',
      cell: ({ row }) => {
        const transitions = row.original.settings?.comment_rules?.transitions;
        const hasComments = Array.isArray(transitions) && transitions.length > 0;
        return hasComments
          ? <Badge variant="secondary" className="text-xs gap-1"><MessageSquare className="h-3 w-3" />Oui</Badge>
          : <Badge variant="outline" className="text-xs">Non</Badge>;
      },
    },
    {
      id: 'auto',
      header: 'Auto',
      cell: ({ row }) => (
        row.original.settings?.auto_generate?.enabled
          ? <Badge variant="outline-secondary" className="text-xs gap-1"><Zap className="h-3 w-3" />Auto</Badge>
          : <Badge variant="outline" className="text-xs">Non</Badge>
      ),
    },
    {
      id: 'rules',
      header: 'Règles',
      cell: ({ row }) => {
        const rules = row.original.validation_rules?.cross_field_rules;
        const hasRules = Array.isArray(rules) && rules.length > 0;
        return hasRules
          ? <Badge variant="default" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" />{rules.length}</Badge>
          : <Badge variant="outline" className="text-xs">Non</Badge>;
      },
    },
    {
      id: 'actions',
      header: '',
      size: 48,
      cell: ({ row }) => {
        const isStaticSystem = row.original.id?.startsWith('__system_');
        if (isStaticSystem) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              {!row.original._isSystem && (
                <DropdownMenuItem
                  onClick={() => archiveDialog.open(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  if (!selectedClient) {
    return (
      <Alert variant="empty" className="flex flex-col items-center justify-center text-center gap-3 py-10">
        <AlertTitle className="flex flex-col items-center gap-3 text-base font-medium">
          <Type className="h-10 w-10 opacity-50" />
          Sélectionnez un client pour gérer ses champs personnalisés
        </AlertTitle>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Champs personnalisés des EO"
        description={`Définissez les champs personnalisés pour les entités organisationnelles de ${clientName}`}
        backAction={{ onClick: () => navigate(cp(CLIENT_ROUTES.ENTITIES)) }}
      >
        <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_FIELDS_ARCHIVED))}>
          Archives
          <Archive className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Import / Export <ArrowUpDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.ENTITIES_FIELDS_IMPORT))}>
              <Upload className="mr-2 h-4 w-4" />
              Importer (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportFields}>
              <Download className="mr-2 h-4 w-4" />
              Exporter (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={handleCreate}>
          Ajouter un champ
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={unifiedData}
        searchColumns={['name', 'slug']}
        searchPlaceholder="Rechercher un champ..."
        isLoading={isLoading}
        hideColumnSelector
        getRowClassName={(row: UnifiedField) => row._isSystem ? 'bg-muted/30' : ''}
      />

      <EoFieldFormDialog
        open={formDialog.isOpen}
        onOpenChange={formDialog.onOpenChange}
        clientId={clientId}
        field={formDialog.item}
        fieldsCount={fields.length}
        showAddToViews={!formDialog.item}
      />

      <DeleteConfirmDialog
        open={archiveDialog.isOpen}
        onOpenChange={archiveDialog.onOpenChange}
        onConfirm={() => {
          if (archiveDialog.item) {
            archiveField.mutate(archiveDialog.item.id, {
              onSuccess: () => archiveDialog.close(),
            });
          }
        }}
        title="Archiver ce champ"
        description={`Êtes-vous sûr de vouloir archiver le champ « ${archiveDialog.item?.name} » ? Il ne sera plus visible mais pourra être restauré depuis les archives.`}
        isDeleting={archiveField.isPending}
      />
    </div>
  );
}
