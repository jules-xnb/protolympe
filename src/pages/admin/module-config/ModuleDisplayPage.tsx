import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useClientPath } from '@/hooks/useClientPath';
import {
  useModuleDisplayConfigs,
  useCreateDisplayConfig,
  useUpdateDisplayConfig,
  useDeleteDisplayConfig,
  type DisplayConfig,
} from '@/hooks/useModuleDisplayConfigs';
import { useModuleRoles } from '@/hooks/useModuleRoles';
import { DataTable } from '@/components/admin/DataTable';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Pencil, Trash2, Loader2 } from 'lucide-react';

interface FormData {
  name: string;
  role_ids: string[];
}

const emptyForm: FormData = { name: '', role_ids: [] };

interface ModuleDisplayPageProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export default function ModuleDisplayPage({ externalOpen, onExternalOpenChange }: ModuleDisplayPageProps) {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const cp = useClientPath();
  const { data: configs, isLoading } = useModuleDisplayConfigs(moduleId);
  const { data: roles } = useModuleRoles(moduleId);
  const createConfig = useCreateDisplayConfig();
  const updateConfig = useUpdateDisplayConfig();
  const deleteConfig = useDeleteDisplayConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DisplayConfig | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<DisplayConfig | null>(null);

  // Sync external open trigger (CTA button in layout)
  useEffect(() => {
    if (externalOpen) {
      setEditingConfig(null);
      setForm(emptyForm);
      setDialogOpen(true);
      onExternalOpenChange?.(false);
    }
  }, [externalOpen, onExternalOpenChange]);

  const openCreate = () => {
    setEditingConfig(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (config: DisplayConfig) => {
    setEditingConfig(config);
    setForm({
      name: config.name,
      role_ids: config.role_ids ?? [],
    });
    setDialogOpen(true);
  };

  const toggleRole = (roleId: string) => {
    setForm((f) => ({
      ...f,
      role_ids: f.role_ids.includes(roleId)
        ? f.role_ids.filter((id) => id !== roleId)
        : [...f.role_ids, roleId],
    }));
  };

  const handleSubmit = () => {
    if (!moduleId) return;

    if (editingConfig) {
      updateConfig.mutate(
        {
          id: editingConfig.id,
          name: form.name,
          role_ids: form.role_ids,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createConfig.mutate(
        {
          module_id: moduleId,
          name: form.name,
          config: {},
          role_ids: form.role_ids,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteConfig.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const getRoleName = (roleId: string) => {
    const role = roles?.find((r) => r.id === roleId);
    return role?.name ?? roleId;
  };

  const getRoleColor = (roleId: string) => {
    const role = roles?.find((r) => r.id === roleId);
    return role?.color ?? undefined;
  };

  const isSaving = createConfig.isPending || updateConfig.isPending;

  const columns: ColumnDef<DisplayConfig>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      id: 'roles',
      header: 'Rôles',
      cell: ({ row }) => {
        const roleIds = row.original.role_ids;
        if (!roleIds?.length) {
          return <span className="text-sm text-muted-foreground">Aucun rôle associé</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {roleIds.map((roleId) => {
              const color = getRoleColor(roleId);
              return (
                <Chip
                  key={roleId}
                  variant="outline"
                  style={color ? { borderColor: color, color } : undefined}
                >
                  {getRoleName(roleId)}
                </Chip>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      size: 1,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row.original);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row.original);
            }}
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
        data={configs || []}
        searchColumn="name"
        searchPlaceholder="Rechercher une configuration..."
        isLoading={isLoading}
        hideColumnSelector
        onRowClick={(config) => navigate(cp(`/modules/${moduleId}/display/${config.id}`))}
      />

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="config-name">Nom</Label>
              <Input
                id="config-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Vue par défaut"
              />
            </div>
            <div className="space-y-2">
              <Label>Rôles associés</Label>
              {roles?.length ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={form.role_ids.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <span className="flex items-center gap-2">
                        {role.color && (
                          <span
                            className="h-3 w-3 rounded-full inline-block"
                            style={{ backgroundColor: role.color }}
                          />
                        )}
                        {role.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun rôle disponible pour ce module.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!form.name || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingConfig ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Supprimer la configuration"
        description={`Voulez-vous vraiment supprimer la configuration \u00ab\u00a0${deleteTarget?.name}\u00a0\u00bb ? Cette action est irréversible.`}
        isDeleting={deleteConfig.isPending}
      />
    </div>
  );
}
