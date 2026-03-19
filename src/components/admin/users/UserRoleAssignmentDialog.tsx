import { useAssignRole } from '@/hooks/useRoles';
import { useRolesForAssignment } from '@/hooks/useClientUsers';
import { AssignmentDialog } from '@/components/admin/AssignmentDialog';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserRoleAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  existingRoleIds: string[];
}

export function UserRoleAssignmentDialog({
  open,
  onOpenChange,
  userId,
  existingRoleIds,
}: UserRoleAssignmentDialogProps) {
  const assignMutation = useAssignRole();
  const { data: roles = [], isLoading } = useRolesForAssignment(open);

  const availableRoles = roles.filter(role => !existingRoleIds.includes(role.id));

  const handleAssign = async (roleId: string) => {
    try {
      await assignMutation.mutateAsync({
        user_id: userId,
        role_id: roleId,
      });
      toast.success('Rôle assigné avec succès');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message?.includes('duplicate')) {
        toast.error('Ce rôle est déjà assigné à cet utilisateur');
      } else {
        toast.error(message || "Erreur lors de l'assignation");
      }
      throw error;
    }
  };

  return (
    <AssignmentDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assigner un rôle"
      description="Sélectionnez un rôle à assigner à cet utilisateur"
      icon={<Shield className="h-5 w-5" />}
      availableItems={availableRoles}
      isLoading={isLoading}
      getItemId={(role) => role.id}
      getItemLabel={(role) => role.name}
      renderSelectItem={(role) => (
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: role.color || '#888' }}
          />
          <span>{role.name}</span>
          {role.role_categories && (
            <span className="text-xs text-muted-foreground">
              ({role.role_categories.name})
            </span>
          )}
        </div>
      )}
      onAssign={handleAssign}
      isAssigning={assignMutation.isPending}
      fieldLabel="Rôle *"
      selectPlaceholder="Sélectionner un rôle"
      emptyMessage="Tous les rôles sont déjà assignés"
      emptyIcon={<Shield className="h-8 w-8 opacity-50" />}
      selectedExtra={(selectedId) => {
        const selectedRole = roles.find(r => r.id === selectedId);
        if (!selectedRole?.role_categories) return null;
        return (
          <p className="text-xs text-muted-foreground">
            Catégorie: {selectedRole.role_categories.name}
          </p>
        );
      }}
    />
  );
}
