import { useState, useEffect } from 'react';
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
import { Pencil, Trash2, Loader2 } from 'lucide-react';

const ROLE_COLORS = [
  '#4E3BD7', '#6366F1', '#3B82F6', '#06B6D4',
  '#22C55E', '#84CC16', '#EAB308', '#F59E0B',
  '#F97316', '#EF4444', '#EC4899', '#DB2777',
  '#A855F7', '#92400E',
];

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

interface ModuleRolesPageProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export default function ModuleRolesPage({ externalOpen, onExternalOpenChange }: ModuleRolesPageProps) {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { data: roles, isLoading } = useModuleRoles(moduleId);
  const createRole = useCreateModuleRole();
  const updateRole = useUpdateModuleRole();
  const deleteRole = useDeleteModuleRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ModuleRole | null>(null);
  const [form, setForm] = useState<RoleFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ModuleRole | null>(null);

  useEffect(() => {
    if (externalOpen) {
      setEditingRole(null);
      setForm(emptyForm);
      setDialogOpen(true);
      onExternalOpenChange?.(false);
    }
  }, [externalOpen, onExternalOpenChange]);

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
        <span className="inline-flex items-center gap-2 font-medium">
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: row.original.color || '#6b7280' }}
          />
          {row.original.name}
        </span>
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
    <div className="py-6 space-y-6">
      <DataTable
        columns={columns}
        data={roles || []}
        searchColumn="name"
        searchPlaceholder="Rechercher un rôle..."
        isLoading={isLoading}
        hideColumnSelector
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
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-4">
                {ROLE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className="flex items-center justify-center h-6 w-6 rounded-full focus:outline-none transition-all hover:scale-110"
                    style={form.color === color ? {
                      outline: `2px solid ${color}`,
                      outlineOffset: '2px',
                    } : undefined}
                  >
                    <span className="block h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                  </button>
                ))}
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
