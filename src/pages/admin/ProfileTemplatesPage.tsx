import { useState, useMemo } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableActionMenu } from '@/components/ui/table-action-menu';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { ProfileTemplateFormDialog } from '@/components/admin/profiles/ProfileTemplateFormDialog';
import { ProfileTemplateDetailsDrawer } from '@/components/admin/profiles/ProfileTemplateDetailsDrawer';
import {
  useProfileTemplates,
  useArchiveProfileTemplate,
  useDeleteProfileTemplate,
  type ProfileTemplate,
} from '@/hooks/useProfileTemplates';
import { useViewMode } from '@/contexts/ViewModeContext';
import { EmptyState } from '@/components/ui/empty-state';
import {
  UserCog,
  Plus,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Loader2,
  Users,
} from 'lucide-react';

export default function ProfileTemplatesPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const { data: templates = [], isLoading } = useProfileTemplates(selectedClient?.id);
  const archiveMutation = useArchiveProfileTemplate();
  const deleteMutation = useDeleteProfileTemplate();

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProfileTemplate | null>(null);
  const [duplicateFrom, setDuplicateFrom] = useState<ProfileTemplate | null>(null);
  const archiveDialog = useDialogState<ProfileTemplate>();
  const deleteDialog = useDialogState<ProfileTemplate>();

  // Drawer
  const [drawerTemplateId, setDrawerTemplateId] = useState<string | null>(null);

  const activeTemplates = useMemo(() => templates.filter(t => t.is_active), [templates]);

  // Handlers
  const handleCreate = () => {
    setEditingTemplate(null);
    setDuplicateFrom(null);
    setFormOpen(true);
  };

  const handleEdit = (template: ProfileTemplate) => {
    setEditingTemplate(template);
    setDuplicateFrom(null);
    setFormOpen(true);
  };

  const handleDuplicate = (template: ProfileTemplate) => {
    setEditingTemplate(null);
    setDuplicateFrom(template);
    setFormOpen(true);
  };

  const handleArchive = async () => {
    if (!archiveDialog.item) return;
    try {
      await archiveMutation.mutateAsync(archiveDialog.item.id);
      archiveDialog.close();
    } catch { /* handled by toast */ }
  };

  const handleDelete = async () => {
    if (!deleteDialog.item) return;
    try {
      await deleteMutation.mutateAsync(deleteDialog.item.id);
      deleteDialog.close();
    } catch { /* handled by toast */ }
  };

  if (!selectedClient) {
    return (
      <EmptyState icon={UserCog} title="Sélectionnez un client pour gérer ses profils" />
    );
  }

  const renderTable = (items: ProfileTemplate[]) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={UserCog}
          title="Aucun profil créé"
          action={
            <Button variant="outline" size="sm" onClick={handleCreate}>
              Créer un profil <Plus className="h-4 w-4" />
            </Button>
          }
        />
      );
    }

    return (
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Rôles</TableHead>
              <TableHead>Entités</TableHead>
              <TableHead>Regroupements</TableHead>
              <TableHead className="w-[100px] text-center">Utilisateurs</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(template => (
              <TableRow
                key={template.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setDrawerTemplateId(template.id)}
              >
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    {Object.entries(
                      template.roles.reduce<Record<string, typeof template.roles>>((acc, r) => {
                        const cat = r.role_category_name || 'Sans catégorie';
                        (acc[cat] ??= []).push(r);
                        return acc;
                      }, {})
                    ).map(([category, roles]) => (
                      <div key={category} className="flex flex-wrap items-center gap-1">
                        <span className="text-xs text-muted-foreground mr-0.5">{category}:</span>
                        {roles.map(r => (
                          <Chip
                            key={r.role_id}
                            variant="outline"
                            className="text-xs gap-1"
                            style={{
                              borderColor: r.role_color || undefined,
                              backgroundColor: r.role_color ? `${r.role_color}10` : undefined,
                            }}
                          >
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: r.role_color || '#6b7280' }}
                            />
                            {r.role_name}
                          </Chip>
                        ))}
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {template.eos.slice(0, 3).map(e => (
                      <Chip key={e.eo_id} variant="default" className="text-xs gap-1">
                        {e.eo_name}
                        {e.include_descendants && <span className="text-primary font-medium">↓</span>}
                      </Chip>
                    ))}
                    {template.eos.length > 3 && (
                      <Chip variant="default" className="text-xs">+{template.eos.length - 3}</Chip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {template.groups.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {template.groups.slice(0, 3).map(g => (
                        <Chip key={g.group_id} variant="outline" className="text-xs">{g.group_name}</Chip>
                      ))}
                      {template.groups.length > 3 && (
                        <Chip variant="outline" className="text-xs">+{template.groups.length - 3}</Chip>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Chip variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {template._userCount}
                  </Chip>
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <TableActionMenu
                    items={[
                      { label: 'Modifier', icon: Pencil, onClick: () => handleEdit(template) },
                      { label: 'Dupliquer', icon: Copy, onClick: () => handleDuplicate(template) },
                      { label: 'Archiver', icon: Archive, onClick: () => archiveDialog.open(template) },
                      { label: 'Supprimer', icon: Trash2, onClick: () => deleteDialog.open(template), destructive: true, hidden: template._userCount !== 0 },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageHeader
        title="Profils"
        description="Créez des profils partagés (rôles + EOs + groupes) assignables à plusieurs utilisateurs."
      >
        <Button variant="ghost" onClick={() => navigate(cp(CLIENT_ROUTES.PROFILES_ARCHIVED))}>
          Archives
          <Archive className="h-4 w-4" />
        </Button>
        <Button onClick={handleCreate}>
          Nouveau profil
          <Plus className="h-4 w-4" />
        </Button>
      </PageHeader>

      {renderTable(activeTemplates)}

      {/* Form dialog */}
      <ProfileTemplateFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) { setEditingTemplate(null); setDuplicateFrom(null); }
        }}
        template={editingTemplate}
        duplicateFrom={duplicateFrom}
      />

      {/* Details drawer */}
      <ProfileTemplateDetailsDrawer
        templateId={drawerTemplateId}
        onClose={() => setDrawerTemplateId(null)}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />

      {/* Archive confirm */}
      <DeleteConfirmDialog
        open={archiveDialog.isOpen}
        onOpenChange={archiveDialog.onOpenChange}
        onConfirm={handleArchive}
        title="Archiver le profil"
        description={`Êtes-vous sûr de vouloir archiver le profil "${archiveDialog.item?.name}" ? Les utilisateurs assignés conserveront leur accès, mais le profil ne pourra plus être assigné à de nouveaux utilisateurs.`}
        isDeleting={archiveMutation.isPending}
      />

      {/* Delete confirm */}
      <DeleteConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.onOpenChange}
        onConfirm={handleDelete}
        title="Supprimer le profil"
        description={`Êtes-vous sûr de vouloir supprimer définitivement le profil "${deleteDialog.item?.name}" ? Cette action est irréversible.`}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
