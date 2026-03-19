import { useState } from 'react';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import {
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { StatusChip } from '@/components/ui/status-chip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatFullName } from '@/lib/format-name';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Calendar,
  UserPlus,
  Trash2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Client } from '@/hooks/useClients';
import {
  useIntegrators,
  useIntegratorAssignments,
  useAssignIntegratorToClient,
  useRemoveIntegratorFromClient,
} from '@/hooks/useAdminData';

interface ClientDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientDetailsDrawer({ open, onOpenChange, client }: ClientDetailsDrawerProps) {
  const [selectedIntegrator, setSelectedIntegrator] = useState<string>('');
  
  const { data: integrators = [] } = useIntegrators();
  const { data: allAssignments = [] } = useIntegratorAssignments();
  const assignMutation = useAssignIntegratorToClient();
  const removeMutation = useRemoveIntegratorFromClient();

  if (!client) return null;

  // Filter assignments for this client
  const clientAssignments = allAssignments.filter(a => a.client_id === client.id);

  // Filter integrators not already assigned to this client
  const assignedUserIds = new Set(clientAssignments.map(a => a.user_id));
  const availableIntegrators = integrators.filter(i => !assignedUserIds.has(i.user_id));

  const handleAssign = async () => {
    if (!selectedIntegrator) {
      toast.error('Sélectionnez un intégrateur');
      return;
    }

    try {
      await assignMutation.mutateAsync({
        userId: selectedIntegrator,
        clientId: client.id,
        persona: 'integrator_delta',
      });
      setSelectedIntegrator('');
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeMutation.mutateAsync(assignmentId);
    } catch {
      // Error handled by mutation
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <DetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="overflow-y-auto"
      customHeader={
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-xl">{client.name}</SheetTitle>
            </div>
          </div>
        </SheetHeader>
      }
    >
        <div className="mt-6 space-y-6">
          {/* Client Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Informations</h3>
            
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Créé le</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(client.created_at), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Statut</span>
                <StatusChip status={client.is_active ? 'actif' : 'inactif'} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Integrators Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Intégrateurs ({clientAssignments.length})
              </h3>
            </div>

            {/* Add Integrator */}
            <div className="flex gap-2">
              <Select value={selectedIntegrator} onValueChange={setSelectedIntegrator}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner un intégrateur" />
                </SelectTrigger>
                <SelectContent>
                  {availableIntegrators.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Aucun intégrateur disponible
                    </div>
                  ) : (
                    availableIntegrators.map((integrator) => (
                      <SelectItem key={integrator.user_id} value={integrator.user_id}>
                        <div className="flex items-center gap-2">
                          <span>{formatFullName(integrator.profiles?.first_name, integrator.profiles?.last_name, integrator.profiles?.email || 'Sans nom')}</span>
                          <Chip variant="outline" className="text-xs">
                            {integrator.persona === 'admin_delta' ? 'Admin' : 'Intégrateur'}
                          </Chip>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssign}
                disabled={!selectedIntegrator || assignMutation.isPending}
                size="icon"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            {/* List of assigned integrators */}
            <div className="space-y-2">
              {clientAssignments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Aucun intégrateur assigné à ce client
                </div>
              ) : (
                clientAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(
                            formatFullName(assignment.profiles?.first_name, assignment.profiles?.last_name),
                            assignment.profiles?.email || ''
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {formatFullName(assignment.profiles?.first_name, assignment.profiles?.last_name, 'Utilisateur')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {assignment.profiles?.email}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(assignment.id)}
                      disabled={removeMutation.isPending}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
    </DetailsDrawer>
  );
}
