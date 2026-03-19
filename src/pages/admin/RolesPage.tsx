import { useState, useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RoleFormDialog } from '@/components/admin/roles/RoleFormDialog';
import { RoleCategoryFormDialog } from '@/components/admin/role-categories/RoleCategoryFormDialog';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { RoleSidebar } from '@/components/admin/roles/RoleSidebar';
import { RoleDetailHeader } from '@/components/admin/roles/RoleDetailHeader';
import { RoleUsagesTable } from '@/components/admin/roles/RoleUsagesTable';
import { useRoles, useArchiveRole, useUsedRoleIds, type RoleWithCategory } from '@/hooks/useRoles';
import { useRoleCategories, useArchiveRoleCategory, type RoleCategory } from '@/hooks/useRoleCategories';
import { useRoleUsages } from '@/hooks/useRoleUsages';
import { useViewMode } from '@/contexts/ViewModeContext';
import {
  Shield,
  FolderTree,
  Plus,
  Upload,
  Download,
  ArrowUpDown,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RolesPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const { data: categories = [], isLoading: loadingCategories } = useRoleCategories();
  const archiveRoleMutation = useArchiveRole();
  const archiveCategoryMutation = useArchiveRoleCategory();

  // Selection — derive from query data to stay fresh after edits
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const selectedRole = useMemo(
    () => roles.find(r => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  // Role dialogs
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const archiveRoleDialog = useDialogState();
  const [preselectedCategoryId, setPreselectedCategoryId] = useState<string | null>(null);
  const [duplicateFrom, setDuplicateFrom] = useState<RoleWithCategory | null>(null);
  const [editingRole, setEditingRole] = useState<RoleWithCategory | null>(null);

  // Category dialogs
  const categoryFormDialog = useDialogState<RoleCategory>();
  const archiveCategoryDialog = useDialogState<RoleCategory>();

  const isLoading = loadingRoles || loadingCategories;

  // Usages for the selected role
  const { data: usages = [], isLoading: loadingUsages } = useRoleUsages(selectedRole?.id || null);

  // Detect which roles are used (appear in nav_permissions directly or via category)
  const { data: usedRoleIds } = useUsedRoleIds(selectedClient?.id, roles);

  // Group roles by category for CSV export
  const rolesByCategory = useMemo(() => {
    const grouped = roles.reduce((acc, role) => {
      const categoryId = role.category_id || 'uncategorized';
      if (!acc[categoryId]) acc[categoryId] = [];
      acc[categoryId].push(role);
      return acc;
    }, {} as Record<string, RoleWithCategory[]>);
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    return grouped;
  }, [roles]);

  // Category handlers
  const handleCreateCategory = () => { categoryFormDialog.open(); };
  const handleArchiveCategory = async () => {
    if (!archiveCategoryDialog.item) return;
    try {
      await archiveCategoryMutation.mutateAsync(archiveCategoryDialog.item.id);
      archiveCategoryDialog.close();
    } catch { /* handled */ }
  };

  // Role handlers
  const handleCreateRole = () => { setEditingRole(null); setDuplicateFrom(null); setPreselectedCategoryId(null); setRoleFormOpen(true); };
  const handleArchiveRole = async () => {
    if (!selectedRole) return;
    try {
      await archiveRoleMutation.mutateAsync(selectedRole.id);
      toast.success('Rôle archivé');
      archiveRoleDialog.close();
      setSelectedRoleId(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'archivage');
    }
  };

  const handleExport = () => {
    const csvRows: string[] = [];
    csvRows.push(['category_name', 'category_description', 'role_name', 'role_description', 'role_color'].join(';'));

    const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    for (const category of sortedCategories) {
      const catRoles = (rolesByCategory[category.id] || []);
      if (catRoles.length === 0) {
        csvRows.push([category.name, category.description || '', '', '', ''].join(';'));
      } else {
        for (const role of catRoles) {
          csvRows.push([category.name, category.description || '', role.name, role.description || '', role.color || ''].join(';'));
        }
      }
    }

    const uncategorized = rolesByCategory['uncategorized'] || [];
    for (const role of uncategorized) {
      csvRows.push(['', '', role.name, role.description || '', role.color || ''].join(';'));
    }

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles_${selectedClient?.slug || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  if (!selectedClient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Shield className="h-12 w-12 mb-4 opacity-50" />
        <p>Sélectionnez un client pour gérer ses rôles</p>
      </div>
    );
  }

  return (
    <div className="full-bleed h-full flex">
      {/* Barre de rôles — élément indépendant, aucun padding partagé avec le contenu */}
      <aside className="w-64 shrink-0 border-r border-r-border">
        <RoleSidebar
          roles={roles}
          categories={categories}
          selectedRoleId={selectedRole?.id || null}
          onSelectRole={(role) => setSelectedRoleId(role.id)}
          onCreateRole={handleCreateRole}
          onEditCategory={(cat) => categoryFormDialog.open(cat)}
          onArchiveCategory={(cat) => archiveCategoryDialog.open(cat)}
          isLoading={isLoading}
          usedRoleIds={usedRoleIds}
        />
      </aside>

      {/* Contenu — élément indépendant avec son propre padding */}
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pt-4 pb-6 lg:px-6 lg:pt-6 lg:pb-6">
        <PageHeader
          title="Rôles"
          description="Organisez vos rôles par catégories et assignez-les aux utilisateurs."
        >
          <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.ROLES_ARCHIVED))}>
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
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate(cp(CLIENT_ROUTES.ROLES_IMPORT))}>
                <Upload className="mr-2 h-4 w-4" />
                Importer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} disabled={roles.length === 0 && categories.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Nouveau
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateCategory}>
                <FolderTree className="mr-2 h-4 w-4" />
                Catégorie
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateRole}>
                <Shield className="mr-2 h-4 w-4" />
                Rôle
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeader>

        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {selectedRole ? (
            <>
              <RoleDetailHeader
                role={selectedRole}
                onEdit={() => { setEditingRole(selectedRole); setDuplicateFrom(null); setPreselectedCategoryId(null); setRoleFormOpen(true); }}
                onArchive={() => archiveRoleDialog.open()}
                onDuplicate={() => { setEditingRole(null); setDuplicateFrom(selectedRole); setRoleFormOpen(true); }}
              />
              <div className="flex-1 p-4">
                <RoleUsagesTable
                  usages={usages}
                  isLoading={loadingUsages}
                  roleId={selectedRole.id}
                  roleName={selectedRole.name}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={Shield}
              title="Aucun rôle sélectionné"
              description="Sélectionnez un rôle dans la liste ou commencez par créer une catégorie et un rôle."
              action={
                <div className="flex gap-2 justify-center pt-1">
                  <Button variant="outline" size="sm" onClick={handleCreateCategory}>
                    Créer une catégorie de rôle
                    <FolderTree className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleCreateRole}>
                    Créer un rôle
                    <Shield className="h-4 w-4" />
                  </Button>
                </div>
              }
              className="py-8"
            />
          )}
        </div>
      </section>

      {/* Dialogs */}
      <RoleCategoryFormDialog
        open={categoryFormDialog.isOpen}
        onOpenChange={categoryFormDialog.onOpenChange}
        category={categoryFormDialog.item}
      />

      <RoleFormDialog
        open={roleFormOpen}
        onOpenChange={(open) => { setRoleFormOpen(open); if (!open) { setDuplicateFrom(null); setEditingRole(null); } }}
        role={editingRole}
        duplicateFrom={duplicateFrom}
        preselectedCategoryId={preselectedCategoryId}
        onCreated={(roleId) => setSelectedRoleId(roleId)}
      />

      <DeleteConfirmDialog
        open={archiveCategoryDialog.isOpen}
        onOpenChange={archiveCategoryDialog.onOpenChange}
        onConfirm={handleArchiveCategory}
        title="Archiver la catégorie"
        description={`Êtes-vous sûr de vouloir archiver la catégorie "${archiveCategoryDialog.item?.name}" ? Les rôles associés seront également masqués.`}
        isDeleting={archiveCategoryMutation.isPending}
      />

      <DeleteConfirmDialog
        open={archiveRoleDialog.isOpen}
        onOpenChange={archiveRoleDialog.onOpenChange}
        onConfirm={handleArchiveRole}
        title="Archiver le rôle"
        description={`Êtes-vous sûr de vouloir archiver le rôle "${selectedRole?.name}" ?`}
        isDeleting={archiveRoleMutation.isPending}
      />

    </div>
  );
}
