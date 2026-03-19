import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Trash2,
  MoreVertical,
  Shield,
  Eye,
  PenLine,
  FileEdit,
  Users,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useViewPermissions,
  useCreateViewPermission,
  useUpdateViewPermission,
  useDeleteViewPermission,
  type ViewPermissionWithRelations,
} from '@/hooks/useViewPermissions';
import { useModuleRolesByClient } from '@/hooks/useModuleRolesByClient';
import { useViewMode } from '@/contexts/ViewModeContext';
import { FieldPermissionsDialog } from './FieldPermissionsDialog';
import type { ViewConfig } from '@/hooks/useViewConfigs';

interface ViewPermissionsEditorProps {
  viewConfig: ViewConfig;
}

type PermissionTarget = 'role' | 'category';

export function ViewPermissionsEditor({ viewConfig }: ViewPermissionsEditorProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [_editingPermission, _setEditingPermission] = useState<ViewPermissionWithRelations | null>(null);
  const [fieldPermissionsOpen, setFieldPermissionsOpen] = useState<ViewPermissionWithRelations | null>(null);

  const { selectedClient } = useViewMode();
  const { data: permissions = [], isLoading } = useViewPermissions(viewConfig.id);
  const { data: moduleRoles = [] } = useModuleRolesByClient(selectedClient?.id);
  
  const createMutation = useCreateViewPermission();
  const updateMutation = useUpdateViewPermission();
  const deleteMutation = useDeleteViewPermission();

  const [formData, setFormData] = useState({
    target: 'role' as PermissionTarget,
    targetId: '',
    can_view: true,
    can_create: false,
    can_edit: false,
    can_delete: false,
  });

  const resetForm = () => {
    setFormData({
      target: 'role',
      targetId: '',
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false,
    });
  };

  const handleAddPermission = async () => {
    if (!formData.targetId) {
      toast.error('Veuillez sélectionner une cible');
      return;
    }

    try {
      await createMutation.mutateAsync({
        view_config_id: viewConfig.id,
        role_id: formData.target === 'role' ? formData.targetId : null,
        category_id: formData.target === 'category' ? formData.targetId : null,
        can_view: formData.can_view,
        can_create: formData.can_create,
        can_edit: formData.can_edit,
        can_delete: formData.can_delete,
        field_overrides: {},
      });
      toast.success('Permission ajoutée');
      setIsAddDialogOpen(false);
      resetForm();
    } catch {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleTogglePermission = async (
    permission: ViewPermissionWithRelations,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
  ) => {
    try {
      await updateMutation.mutateAsync({
        id: permission.id,
        view_config_id: viewConfig.id,
        [field]: !permission[field],
      });
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeletePermission = async (permission: ViewPermissionWithRelations) => {
    try {
      await deleteMutation.mutateAsync({
        id: permission.id,
        viewConfigId: viewConfig.id,
      });
      toast.success('Permission supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTargetLabel = (permission: ViewPermissionWithRelations) => {
    if (permission.role) {
      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Chip
            variant="outline"
            style={{
              borderColor: permission.role.color || undefined,
              color: permission.role.color || undefined,
            }}
          >
            {permission.role.name}
          </Chip>
        </div>
      );
    }
    if (permission.category) {
      return (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <Chip variant="default">{permission.category.name}</Chip>
        </div>
      );
    }
    return <span className="text-muted-foreground">-</span>;
  };

  const getTargetOptions = (): { id: string; label: string }[] => {
    switch (formData.target) {
      case 'role':
        return moduleRoles.map((r) => ({ id: r.id, label: r.name }));
      case 'category':
        return [];
      default:
        return [];
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions
            </CardTitle>
            <CardDescription>
              Configurez les droits d'accès par rôle ou catégorie
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            Ajouter
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : permissions.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Aucune permission configurée.<br />
              Par défaut, seuls les administrateurs peuvent accéder à cette vue.
            </p>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
              Ajouter une permission
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cible</TableHead>
                  <TableHead className="text-center w-20">
                    <div className="flex flex-col items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">Voir</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-20">
                    <div className="flex flex-col items-center gap-1">
                      <Plus className="h-4 w-4" />
                      <span className="text-xs">Créer</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-20">
                    <div className="flex flex-col items-center gap-1">
                      <PenLine className="h-4 w-4" />
                      <span className="text-xs">Éditer</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center w-20">
                    <div className="flex flex-col items-center gap-1">
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs">Suppr.</span>
                    </div>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>{getTargetLabel(permission)}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permission.can_view ?? false}
                        onCheckedChange={() => handleTogglePermission(permission, 'can_view')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permission.can_create ?? false}
                        onCheckedChange={() => handleTogglePermission(permission, 'can_create')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permission.can_edit ?? false}
                        onCheckedChange={() => handleTogglePermission(permission, 'can_edit')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permission.can_delete ?? false}
                        onCheckedChange={() => handleTogglePermission(permission, 'can_delete')}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setFieldPermissionsOpen(permission)}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Permissions des champs
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeletePermission(permission)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* Add Permission Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une permission</DialogTitle>
            <DialogDescription>
              Définissez les droits d'accès pour un rôle ou une catégorie.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de cible</Label>
              <Select
                value={formData.target}
                onValueChange={(v) => setFormData({ ...formData, target: v as PermissionTarget, targetId: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Rôle spécifique
                    </div>
                  </SelectItem>
                  <SelectItem value="category">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Catégorie de rôle
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {formData.target === 'role' && 'Sélectionner un rôle'}
                {formData.target === 'category' && 'Sélectionner une catégorie'}
              </Label>
              <Select
                value={formData.targetId}
                onValueChange={(v) => setFormData({ ...formData, targetId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {getTargetOptions().map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Droits d'accès</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Voir</span>
                  </div>
                  <Switch
                    checked={formData.can_view}
                    onCheckedChange={(v) => setFormData({ ...formData, can_view: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Créer</span>
                  </div>
                  <Switch
                    checked={formData.can_create}
                    onCheckedChange={(v) => setFormData({ ...formData, can_create: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Éditer</span>
                  </div>
                  <Switch
                    checked={formData.can_edit}
                    onCheckedChange={(v) => setFormData({ ...formData, can_edit: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Supprimer</span>
                  </div>
                  <Switch
                    checked={formData.can_delete}
                    onCheckedChange={(v) => setFormData({ ...formData, can_delete: v })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddPermission} disabled={createMutation.isPending}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Permissions Dialog */}
      {fieldPermissionsOpen && (
        <FieldPermissionsDialog
          permission={fieldPermissionsOpen}
          boDefinitionId={viewConfig.bo_definition_id}
          onClose={() => setFieldPermissionsOpen(null)}
        />
      )}
    </Card>
  );
}
