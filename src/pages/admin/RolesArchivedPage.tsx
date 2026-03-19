import { useState, useMemo, useEffect, Fragment } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRoles, useArchivedRoles, useRestoreRole } from '@/hooks/useRoles';
import type { RoleWithCategory } from '@/hooks/useRoles';
import { useArchivedRoleCategories, useRestoreRoleCategory } from '@/hooks/useRoleCategories';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Shield,
  FolderTree,
  ArchiveRestore,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface CategoryGroup {
  id: string;
  name: string;
  isArchived: boolean;
  roles: RoleWithCategory[];
}

export default function RolesArchivedPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();

  const { data: allRoles = [] } = useRoles();
  const { data: archivedRoles = [], isLoading: loadingArchivedRoles } = useArchivedRoles();
  const { data: archivedCategories = [], isLoading: loadingArchivedCategories } = useArchivedRoleCategories();
  const restoreRoleMutation = useRestoreRole();
  const restoreCategoryMutation = useRestoreRoleCategory();

  // Active categories for restore dialog (derived from active roles)
  const activeCateg = useMemo(() => {
    const catMap = new Map<string, { id: string; name: string }>();
    allRoles.forEach(r => {
      if (r.category_id && r.role_categories) {
        catMap.set(r.category_id, { id: r.category_id, name: r.role_categories.name });
      }
    });
    return Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [allRoles]);

  const isLoading = loadingArchivedRoles || loadingArchivedCategories;

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);
  const restoreDialog = useDialogState<RoleWithCategory>();
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const groups = new Map<string, CategoryGroup>();

    for (const cat of archivedCategories) {
      groups.set(cat.id, { id: cat.id, name: cat.name, isArchived: true, roles: [] });
    }

    for (const role of archivedRoles) {
      const catId = role.category_id || 'uncategorized';
      const catName = role.role_categories?.name || 'Sans catégorie';
      if (!groups.has(catId)) {
        groups.set(catId, {
          id: catId,
          name: catName,
          isArchived: archivedCategories.some((c: { id: string }) => c.id === catId),
          roles: [],
        });
      }
      groups.get(catId)!.roles.push(role);
    }

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [archivedRoles, archivedCategories]);

  useEffect(() => {
    if (!hasInitialized && categoryGroups.length > 0) {
      setExpandedCategories(new Set(categoryGroups.map(g => g.id)));
      setHasInitialized(true);
    }
  }, [categoryGroups, hasInitialized]);

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openRestoreDialog = (role: RoleWithCategory) => {
    setSelectedCategoryId(role.category_id || '');
    restoreDialog.open(role);
  };

  const handleConfirmRestore = async () => {
    if (!restoreDialog.item || !selectedCategoryId) {
      toast.error('Veuillez sélectionner une catégorie');
      return;
    }
    try {
      await restoreRoleMutation.mutateAsync({ id: restoreDialog.item.id, categoryId: selectedCategoryId });
      toast.success('Rôle restauré');
      restoreDialog.close();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la restauration');
    }
  };

  const handleRestoreCategory = async (categoryId: string) => {
    try {
      await restoreCategoryMutation.mutateAsync(categoryId);
      toast.success('Catégorie restaurée');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la restauration');
    }
  };

  if (!selectedClient) {
    return (
      <EmptyState icon={Shield} title="Sélectionnez un client" />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Archives — Rôles"
        backAction={{ onClick: () => navigate(cp(CLIENT_ROUTES.ROLES)) }}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && categoryGroups.length === 0 && (
        <EmptyState icon={Shield} title="Aucun élément archivé" />
      )}

      {!isLoading && categoryGroups.length > 0 && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="w-[250px]">Description</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryGroups.map((group) => {
                const isExpanded = expandedCategories.has(group.id);
                return (
                  <Fragment key={group.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCategory(group.id)}
                    >
                      <TableCell className="px-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{group.name}</span>
                          {group.roles.length > 0 && (
                            <Chip variant="default" className="text-xs">
                              {group.roles.length}
                            </Chip>
                          )}
                          {group.isArchived && (
                            <Chip variant="outline" className="text-xs text-amber-600 border-amber-300">
                              Catégorie archivée
                            </Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {group.isArchived && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleRestoreCategory(group.id)}
                            disabled={restoreCategoryMutation.isPending}
                          >
                            Restaurer
                            <ArchiveRestore className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && group.roles.map((role) => (
                      <TableRow key={role.id} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 pl-4">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: role.color || '#3b82f6' }}
                            />
                            <span className="text-sm">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {role.description || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => openRestoreDialog(role)}
                            disabled={restoreRoleMutation.isPending}
                          >
                            Restaurer
                            <ArchiveRestore className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {isExpanded && group.roles.length === 0 && (
                      <TableRow className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell colSpan={3} className="text-xs text-muted-foreground italic pl-8">
                          Aucun rôle archivé dans cette catégorie
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={restoreDialog.isOpen} onOpenChange={restoreDialog.onOpenChange}>
        <DialogContent className="w-[var(--modal-width)]">
          <DialogHeader>
            <DialogTitle>Restaurer le rôle</DialogTitle>
            <DialogDescription>
              Choisissez la catégorie dans laquelle restaurer le rôle « {restoreDialog.item?.name} ».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Catégorie *</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {activeCateg.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => restoreDialog.close()}>
              Annuler
            </Button>
            <Button onClick={handleConfirmRestore} disabled={!selectedCategoryId || restoreRoleMutation.isPending}>
              {restoreRoleMutation.isPending ? 'Restauration...' : 'Restaurer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
