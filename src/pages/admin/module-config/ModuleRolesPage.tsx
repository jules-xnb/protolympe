import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  useModuleRoles,
  useCreateModuleRole,
  useUpdateModuleRole,
  useDeleteModuleRole,
  type ModuleRole,
} from '@/hooks/useModuleRoles';
import { DataTable } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface RoleFormData {
  name: string;
  color: string;
  description: string;
}

const emptyForm: RoleFormData = { name: '', color: '', description: '' };

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export default function ModuleRolesPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { data: roles, isLoading } = useModuleRoles(moduleId);
  const createRole = useCreateModuleRole();
  const updateRole = useUpdateModuleRole();
  const deleteRole = useDeleteModuleRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ModuleRole | null>(null);
  const [form, setForm] = useState<RoleFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRole | null>(null);

  const openCreate = () => {
    setEditingRole(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (role: ModuleRole) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      color: role.color || '',
      description: role.description || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!moduleId) return;

    if (editingRole) {
      updateRole.mutate(
        {
          id: editingRole.id,
          name: form.name,
          slug: generateSlug(form.name),
          color: form.color || undefined,
          description: form.description || undefined,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createRole.mutate(
        {
          module_id: moduleId,
          name: form.name,
          slug: generateSlug(form.name),
          color: form.color || undefined,
          description: form.description || undefined,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const isSaving = createRole.isPending || updateRole.isPending;

  const columns: ColumnDef<ModuleRole>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'color',
      header: 'Couleur',
      cell: ({ row }) =>
        row.original.color ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full inline-block"
              style={{ backgroundColor: row.original.color }}
            />
            <span className="text-sm text-muted-foreground">{row.original.color}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description || '\u2014'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      size: 1,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Rôles du module" />

      <DataTable
        columns={columns}
        data={roles || []}
        searchColumn="name"
        searchPlaceholder="Rechercher un rôle..."
        isLoading={isLoading}
        hideColumnSelector
        toolbarRight={
          <Button onClick={openCreate}>
            Ajouter un rôle <Plus className="h-4 w-4" />
          </Button>
        }
      />

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nom</Label>
              <Input
                id="role-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Responsable"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-color">Couleur</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="role-color"
                  value={form.color || '#3b82f6'}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-12 rounded border border-input cursor-pointer p-0.5"
                />
                <span className="text-sm text-muted-foreground font-mono">{form.color || '#3b82f6'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description du rôle"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!form.name || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingRole ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer le rôle"
        description={`Voulez-vous vraiment supprimer le rôle \u00ab\u00a0${deleteTarget?.name}\u00a0\u00bb ? Cette action est irréversible.`}
        isDeleting={deleteRole.isPending}
      />
    </div>
  );
}
