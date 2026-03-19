import { useState } from 'react';
import { useDialogState } from '@/hooks/useDialogState';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import { Button } from '@/components/ui/button';
import { Archive } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { type ClientUser, useUpdateClientUserStatus, useActivateUser } from '@/hooks/useClientUsers';
import {
  useProfileTemplates,
  useAssignProfileTemplate,
  useUnassignProfileTemplate,
  type ProfileTemplate,
} from '@/hooks/useProfileTemplates';
import {
  useUserFieldDefinitions,
  useUserFieldValues,
  useUpsertUserFieldValue,
} from '@/hooks/useUserFieldDefinitions';
import { useViewMode } from '@/contexts/ViewModeContext';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { api } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ProfileTemplateFormDialog } from '@/components/admin/profiles/ProfileTemplateFormDialog';
import { toast } from 'sonner';
import { UserProfileSection } from './user-details/UserProfileSection';
import { UserCustomFieldsSection } from './user-details/UserCustomFieldsSection';
import { UserProfileTemplatesSection } from './user-details/UserProfileTemplatesSection';
import { AssignProfileDialog } from './user-details/AssignProfileDialog';
import { queryKeys } from '@/lib/query-keys';

interface UserDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ClientUser | null;
  onArchive?: () => void;
}

export function UserDetailsDrawer({ open, onOpenChange, user, onArchive }: UserDetailsDrawerProps) {
  const { selectedClient } = useViewMode();
  const updateStatusMutation = useUpdateClientUserStatus();
  const activateUserMutation = useActivateUser();
  const assignMutation = useAssignProfileTemplate();
  const unassignMutation = useUnassignProfileTemplate();

  const assignDialog = useDialogState();
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const unassignDialog = useDialogState<ProfileTemplate>();

  // Fetch all profile templates for this client
  const { data: allTemplates = [] } = useProfileTemplates(selectedClient?.id);
  const activeTemplates = allTemplates.filter(t => t.is_active);

  // Fetch this user's template assignments
  const { data: userAssignments = [] } = useQuery({
    queryKey: queryKeys.profileTemplates.userTemplates(user?.user_id, selectedClient?.id),
    queryFn: async () => {
      if (!user?.user_id || !selectedClient?.id) return [];
      return api.get<Array<{ id: string; template_id: string; last_used_at: string | null }>>(
        `/api/profile-templates/user-assignments?user_id=${user.user_id}&client_id=${selectedClient.id}`
      );
    },
    enabled: !!user?.user_id && !!selectedClient?.id,
  });

  // Map assignments to templates
  const assignedTemplateIds = new Set(userAssignments.map(a => a.template_id));
  const assignedTemplates = allTemplates.filter(t => assignedTemplateIds.has(t.id));
  const availableTemplates = activeTemplates.filter(t => !assignedTemplateIds.has(t.id));

  // Fetch custom field definitions & values
  const { data: fieldDefinitions = [] } = useUserFieldDefinitions(selectedClient?.id);
  const { data: fieldValues = [] } = useUserFieldValues(user?.user_id);
  const upsertValue = useUpsertUserFieldValue();

  const hasNoProfiles = assignedTemplates.length === 0;

  if (!user) return null;

  const handleToggleStatus = async () => {
    try {
      if (!user.is_active && !user.activated_at) {
        await activateUserMutation.mutateAsync({
          membershipId: user.id,
          email: user.profiles?.email || '',
        });
        toast.success('Utilisateur activé — un email d\'invitation a été envoyé');
        return;
      }
      await updateStatusMutation.mutateAsync({
        membershipId: user.id,
        isActive: !user.is_active,
      });
      toast.success(user.is_active ? 'Utilisateur désactivé' : 'Utilisateur réactivé');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Erreur lors de la mise à jour');
    }
  };

  const handleAssignTemplate = async (templateId: string) => {
    if (!user || !selectedClient) return;
    try {
      await assignMutation.mutateAsync({
        userId: user.user_id,
        templateId,
        clientId: selectedClient.id,
      });
      assignDialog.close();
    } catch { /* handled by toast */ }
  };

  const handleUnassignTemplate = async () => {
    if (!unassignDialog.item || !user) return;
    try {
      await unassignMutation.mutateAsync({
        userId: user.user_id,
        templateId: unassignDialog.item.id,
      });
      unassignDialog.close();
    } catch { /* handled by toast */ }
  };

  return (
    <>
      <DetailsDrawer
        open={open}
        onOpenChange={onOpenChange}
        contentClassName="overflow-y-auto"
        title="Détails de l'utilisateur"
        description="Gérez les profils et accès de l'utilisateur"
        footer={onArchive ? (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onArchive}>
            Archiver
            <Archive className="h-4 w-4" />
          </Button>
        ) : undefined}
      >
          <div className="mt-6 space-y-6">
            <UserProfileSection
              user={user}
              hasNoProfiles={hasNoProfiles}
              onToggleStatus={handleToggleStatus}
              isToggling={updateStatusMutation.isPending || activateUserMutation.isPending}
            />

            <UserCustomFieldsSection
              user={user}
              fieldDefinitions={fieldDefinitions}
              fieldValues={fieldValues}
              onUpsertValue={(params) => upsertValue.mutate(params)}
            />

            <Separator />

            <UserProfileTemplatesSection
              assignedTemplates={assignedTemplates}
              onAssignClick={() => assignDialog.open()}
              onUnassignClick={(t) => unassignDialog.open(t)}
            />
          </div>
      </DetailsDrawer>

      <AssignProfileDialog
        open={assignDialog.isOpen}
        onOpenChange={assignDialog.onOpenChange}
        userName={user.profiles?.full_name || user.profiles?.email || ''}
        availableTemplates={availableTemplates}
        isAssigning={assignMutation.isPending}
        onAssign={handleAssignTemplate}
        onCreateProfile={() => setCreateProfileOpen(true)}
      />

      {/* Create Profile from Assign Dialog */}
      <ProfileTemplateFormDialog
        open={createProfileOpen}
        onOpenChange={setCreateProfileOpen}
      />

      {/* Unassign Confirmation */}
      <DeleteConfirmDialog
        open={unassignDialog.isOpen}
        onOpenChange={unassignDialog.onOpenChange}
        onConfirm={handleUnassignTemplate}
        title="Désassigner le profil"
        description={`Êtes-vous sûr de vouloir retirer le profil "${unassignDialog.item?.name}" de cet utilisateur ?`}
        isDeleting={unassignMutation.isPending}
      />
    </>
  );
}
