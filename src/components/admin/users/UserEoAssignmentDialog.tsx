import { useAssignUserEo } from '@/hooks/useUserEoAssignments';
import { useEosForAssignment } from '@/hooks/useClientUsers';
import { AssignmentDialog } from '@/components/admin/AssignmentDialog';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface UserEoAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  existingEoIds: string[];
}

export function UserEoAssignmentDialog({
  open,
  onOpenChange,
  userId,
  existingEoIds,
}: UserEoAssignmentDialogProps) {
  const assignMutation = useAssignUserEo();
  const { data: eos = [], isLoading } = useEosForAssignment(open);

  const availableEos = eos.filter(eo => !existingEoIds.includes(eo.id));

  const handleAssign = async (eoId: string) => {
    try {
      await assignMutation.mutateAsync({ userId, eoId });
      toast.success('Entité organisationnelle assignée avec succès');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message?.includes('duplicate')) {
        toast.error('Cette EO est déjà assignée à cet utilisateur');
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
      title="Assigner une entité organisationnelle"
      description="Sélectionnez une entité organisationnelle pour définir le périmètre d'accès de l'utilisateur"
      icon={<Building2 className="h-5 w-5" />}
      availableItems={availableEos}
      isLoading={isLoading}
      getItemId={(eo) => eo.id}
      getItemLabel={(eo) => eo.name}
      getItemDescription={(eo) => eo.code || undefined as unknown as string}
      renderSelectItem={(eo) => (
        <div className="flex items-center gap-2">
          <span style={{ paddingLeft: `${(eo.level || 0) * 12}px` }}>
            {eo.name}
          </span>
          {eo.code && (
            <span className="text-xs text-muted-foreground font-mono">
              {eo.code}
            </span>
          )}
        </div>
      )}
      onAssign={handleAssign}
      isAssigning={assignMutation.isPending}
      fieldLabel="Entité organisationnelle *"
      selectPlaceholder="Sélectionner une EO"
      emptyMessage="Toutes les EO sont déjà assignées"
      emptyIcon={<Building2 className="h-8 w-8 opacity-50" />}
      helperText="L'utilisateur aura accès à cette EO et toutes ses sous-entités"
    />
  );
}
