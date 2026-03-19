import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIntegrators, useAssignIntegratorToClient } from '@/hooks/useAdminData';
import { useClients } from '@/hooks/useClients';
import { formatFullName } from '@/lib/format-name';

interface AssignIntegratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignIntegratorDialog({ open, onOpenChange }: AssignIntegratorDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  
  const { data: integrators } = useIntegrators();
  const { data: clients } = useClients();
  const assignIntegrator = useAssignIntegratorToClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await assignIntegrator.mutateAsync({
        userId: selectedUserId,
        clientId: selectedClientId,
        persona: 'integrator_delta', // Always integrator for client assignments
      });
      onOpenChange(false);
      setSelectedUserId('');
      setSelectedClientId('');
    } catch {
      // Error handled by mutation
    }
  };

  // Get unique integrators (by user_id)
  const uniqueIntegrators = integrators?.reduce((acc, curr) => {
    if (!acc.find(i => i.user_id === curr.user_id)) {
      acc.push(curr);
    }
    return acc;
  }, [] as typeof integrators) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner un intégrateur</DialogTitle>
          <DialogDescription>
            Associez un intégrateur Delta à un client pour lui permettre de le configurer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="integrator">Intégrateur</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un intégrateur" />
              </SelectTrigger>
              <SelectContent>
                {uniqueIntegrators.map((integrator) => (
                  <SelectItem key={integrator.user_id} value={integrator.user_id}>
                    {formatFullName(integrator.profiles?.first_name, integrator.profiles?.last_name, integrator.profiles?.email || 'Sans nom')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={assignIntegrator.isPending || !selectedUserId || !selectedClientId}
            >
              {assignIntegrator.isPending ? 'Assignation...' : 'Assigner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
