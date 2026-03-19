import { useState, useEffect, useCallback, useRef } from 'react';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import {
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Trash2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FloatingInput } from '@/components/ui/floating-input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useClients } from '@/hooks/useClients';
import {
  useAssignIntegratorToClient,
  useRemoveIntegratorFromClient,
  useUpdateIntegratorPersona,
} from '@/hooks/useAdminData';
import { formatFullName } from '@/lib/format-name';

interface IntegratorRow {
  id: string;
  user_id: string;
  persona: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

interface AssignmentRow {
  id: string;
  user_id: string;
  client_id: string;
  persona: string;
  created_at: string;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  clients: {
    id: string;
    name: string;
  } | null;
}

interface IntegratorDetailsDrawerProps {
  integrator: IntegratorRow | null;
  assignments: AssignmentRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntegratorDetailsDrawer({
  integrator,
  assignments,
  open,
  onOpenChange,
}: IntegratorDetailsDrawerProps) {
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [persona, setPersona] = useState<string>('integrator_delta');

  const { data: clients = [] } = useClients();
  const assignIntegrator = useAssignIntegratorToClient();
  const removeMutation = useRemoveIntegratorFromClient();
  const updatePersona = useUpdateIntegratorPersona();

  // Sync persona when integrator changes
  useEffect(() => {
    if (integrator) {
      setPersona(integrator.persona);
    }
  }, [integrator]);

  // Auto-save persona change
  const personaSaveRef = useRef<NodeJS.Timeout | null>(null);
  const handlePersonaChange = useCallback((value: string) => {
    setPersona(value);
    if (personaSaveRef.current) clearTimeout(personaSaveRef.current);
    personaSaveRef.current = setTimeout(async () => {
      if (integrator) {
        await updatePersona.mutateAsync({
          roleId: integrator.id,
          persona: value as 'admin_delta' | 'integrator_delta',
        });
      }
    }, 500);
  }, [integrator, updatePersona]);

  useEffect(() => {
    return () => {
      if (personaSaveRef.current) clearTimeout(personaSaveRef.current);
    };
  }, []);

  if (!integrator) return null;

  const userAssignments = assignments.filter(a => a.user_id === integrator.user_id);
  const assignedClientIds = userAssignments.map(a => a.client_id);
  const availableClients = clients.filter(c => !assignedClientIds.includes(c.id));

  const lastName = integrator.profiles?.last_name || '';
  const firstName = integrator.profiles?.first_name || '';

  const handleAssign = async (clientId: string) => {
    try {
      await assignIntegrator.mutateAsync({
        userId: integrator.user_id,
        clientId,
        persona: 'integrator_delta',
      });
      setClientDialogOpen(false);
      setClientSearch('');
    } catch { /* intentionally ignored */ }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await removeMutation.mutateAsync(assignmentId);
    } catch { /* intentionally ignored */ }
  };

  return (
    <DetailsDrawer
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="overflow-y-auto [&>button:last-child]:hidden"
      customHeader={
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Détails de l'intégrateur</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
      }
    >
        <div className="mt-6 space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Informations générales</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={persona} onValueChange={handlePersonaChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="integrator_delta">Intégrateur Delta</SelectItem>
                    <SelectItem value="admin_delta">Admin Delta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FloatingInput label="Date de création" value={format(new Date(integrator.created_at), 'dd/MM/yy', { locale: fr })} readOnly className="bg-muted/50 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FloatingInput label="Nom" value={lastName} readOnly className="bg-muted/50" />
              </div>
              <div>
                <FloatingInput label="Prénom" value={firstName} readOnly className="bg-muted/50" />
              </div>
            </div>

            <FloatingInput label="Adresse mail" value={integrator.profiles?.email || ''} readOnly disabled className="bg-muted/75 opacity-60 cursor-not-allowed" />
          </div>

          <Separator />

          {/* Clients associés – masqué pour les admins qui ont accès à tous les clients */}
          {persona !== 'admin_delta' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Clients associés ({userAssignments.length})
                </h4>
                {availableClients.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClientDialogOpen(true)}
                  >
                    Associer un client
                    <Plus className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>

              {userAssignments.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Aucun client associé
                </div>
              ) : (
                <div className="space-y-2">
                  {userAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{assignment.clients?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(assignment.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(assignment.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialog de sélection de client */}
        <Dialog open={clientDialogOpen} onOpenChange={(v) => { setClientDialogOpen(v); if (!v) setClientSearch(''); }}>
          <DialogContent className="w-[var(--modal-width)]">
            <DialogHeader>
              <DialogTitle>Associer un client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {availableClients
                  .filter(c => c.id && c.id.trim() !== '' && c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                  .map(c => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="w-full justify-start gap-2 h-10"
                      onClick={() => handleAssign(c.id)}
                      disabled={assignIntegrator.isPending}
                    >
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {c.name}
                    </Button>
                  ))}
                {availableClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun client disponible</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </DetailsDrawer>
  );
}
