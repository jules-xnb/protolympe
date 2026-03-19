import { useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataTable } from '@/components/admin/DataTable';
import { UserFieldFormDialog } from '@/components/admin/users/UserFieldFormDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useUserFieldDefinitions,
  useArchiveUserFieldDefinition,
  useUpdateUserFieldDefinition,
  type UserFieldDefinition,
} from '@/hooks/useUserFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Plus,
  Users,
  Archive,
  ArrowUpDown,
  Upload,
  Download,
  MoveRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { getFieldTypeIcon, getFieldTypeLabel } from '@/lib/field-type-registry';

type UserFieldRow = UserFieldDefinition & { _isSystem: boolean; _isBuiltin: boolean };

const BUILTIN_FIELDS: UserFieldDefinition[] = [
  { id: '__builtin_first_name__', client_id: '', name: 'Prénom',         slug: 'first_name', description: null, field_type: 'text',  is_required: true,  is_unique: false, is_active: true, is_user_editable: false, display_order: -3, default_value: null, options: [], settings: {}, created_at: '', updated_at: '', created_by: null },
  { id: '__builtin_last_name__',  client_id: '', name: 'Nom',            slug: 'last_name',  description: null, field_type: 'text',  is_required: true,  is_unique: false, is_active: true, is_user_editable: false, display_order: -2, default_value: null, options: [], settings: {}, created_at: '', updated_at: '', created_by: null },
  { id: '__builtin_email__',      client_id: '', name: 'Adresse e-mail', slug: 'email',      description: null, field_type: 'email', is_required: true,  is_unique: true,  is_active: true, is_user_editable: false, display_order: -1, default_value: null, options: [], settings: {}, created_at: '', updated_at: '', created_by: null },
];
const BUILTIN_IDS = new Set(BUILTIN_FIELDS.map(f => f.id));

export default function UserFieldsPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id || '';
  const { data: fields = [], isLoading } = useUserFieldDefinitions(clientId || undefined);
  const archiveField = useArchiveUserFieldDefinition();
  const updateField = useUpdateUserFieldDefinition();

  const formDialog = useDialogState<UserFieldDefinition>();

  const handleArchive = (f: UserFieldDefinition) => archiveField.mutate(f.id);
  const handlePromote = (f: UserFieldDefinition) => updateField.mutate({ id: f.id, is_user_editable: true });

  const handleExport = () => {
    const headers = ['name', 'slug', 'field_type', 'is_required', 'is_unique', 'options'];
    const rows = fields.map(f => {
      const options = Array.isArray(f.options) ? f.options.join('|') : '';
      return [f.name, f.slug, f.field_type, f.is_required ? 'oui' : 'non', f.is_unique ? 'oui' : 'non', options]
        .map(v => { const s = String(v); return (s.includes(';') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; })
        .join(';');
    });
    const blob = new Blob(['\uFEFF' + [headers.join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `champs_utilisateurs_${(selectedClient?.name || '').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const allFieldRows = useMemo<UserFieldRow[]>(() => {
    const builtins = BUILTIN_FIELDS.map(f => ({ ...f, _isSystem: true, _isBuiltin: true }));
    const dynamic  = fields.map(f => ({ ...f, _isSystem: !f.is_user_editable, _isBuiltin: false }));
    return [...builtins, ...dynamic];
  }, [fields]);

  const columns = useMemo<ColumnDef<UserFieldRow>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => {
        const f = row.original;
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
      size: 160,
      cell: ({ row }) => {
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
      size: 100,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.is_required
            ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
            : <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      id: 'is_unique',
      header: 'Unique',
      size: 80,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.is_unique
            ? <CheckCircle2 className="h-4 w-4 text-warning mx-auto" />
            : <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      id: 'promote',
      size: 48,
      cell: ({ row }) => {
        const f = row.original;
        if (!f._isSystem || f._isBuiltin) return null;
        return (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Rendre personnalisé"
            onClick={(e) => { e.stopPropagation(); handlePromote(f); }}
          >
            <MoveRight className="h-3.5 w-3.5" />
          </button>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [fields]);

  if (!selectedClient) {
    return <EmptyState icon={Users} title="Sélectionnez un client pour gérer les champs utilisateurs" />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Champs utilisateurs"
        description={`Définissez les champs des fiches utilisateurs de ${selectedClient.name}`}
        backAction={{ onClick: () => navigate(cp(CLIENT_ROUTES.USERS)) }}
      >
        <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.USERS_FIELDS_ARCHIVED))}>
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
            <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.USERS_FIELDS_IMPORT))}>
              <Upload className="mr-2 h-4 w-4" />
              Importer (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => formDialog.open()}>
          Ajouter un champ
          <Plus className="h-4 w-4" />
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={allFieldRows}
        searchColumn="name"
        searchPlaceholder="Rechercher un champ..."
        isLoading={isLoading}
        hideColumnSelector
        getRowClassName={(row) => (row as UserFieldRow)._isSystem ? 'bg-muted/30' : ''}
        onRowClick={(row) => { if (!(row as UserFieldRow)._isBuiltin) formDialog.open(row); }}
      />

      <UserFieldFormDialog
        open={formDialog.isOpen}
        onOpenChange={formDialog.onOpenChange}
        clientId={clientId}
        field={formDialog.item}
        fieldsCount={fields.length}
        defaultUserEditable={!formDialog.item?._isSystem}
        onArchive={formDialog.item && !formDialog.item._isBuiltin ? handleArchive : undefined}
      />
    </div>
  );
}
