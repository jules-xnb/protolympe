import { useMemo } from 'react';
import { AssignmentDialog } from '@/components/admin/AssignmentDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Check } from 'lucide-react';
import { useState } from 'react';
import { formatFullName } from '@/lib/format-name';

interface Integrator {
  user_id: string;
  persona: string;
  profiles?: { first_name: string | null; last_name: string | null; email: string } | null;
}

interface AssignIntegratorToClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableIntegrators: Integrator[];
  onAssign: (userId: string) => Promise<void>;
  isPending: boolean;
}

export function AssignIntegratorToClientDialog({
  open,
  onOpenChange,
  availableIntegrators,
  onAssign,
  isPending,
}: AssignIntegratorToClientDialogProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return availableIntegrators;
    const q = search.toLowerCase();
    return availableIntegrators.filter(i => {
      const name = formatFullName(i.profiles?.first_name, i.profiles?.last_name, '').toLowerCase();
      const email = i.profiles?.email?.toLowerCase() || '';
      return name.includes(q) || email.includes(q);
    });
  }, [availableIntegrators, search]);

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email.slice(0, 2).toUpperCase();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSearch('');
    onOpenChange(nextOpen);
  };

  const handleAssign = async (userId: string) => {
    await onAssign(userId);
    setSearch('');
  };

  return (
    <AssignmentDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Ajouter un intégrateur"
      description="Recherchez et sélectionnez un intégrateur à assigner à ce client."
      availableItems={availableIntegrators}
      onAssign={handleAssign}
      isAssigning={isPending}
      assignLabel="Ajouter"
      emptyMessage="Aucun intégrateur disponible"
      renderBody={({ selectedId, setSelectedId }) => (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Intégrateur</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border bg-background">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  Aucun intégrateur trouvé
                </div>
              ) : (
                filtered.map((integrator) => {
                  const isSelected = selectedId === integrator.user_id;
                  const name = formatFullName(integrator.profiles?.first_name, integrator.profiles?.last_name);
                  const email = integrator.profiles?.email || '';
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      key={integrator.user_id}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 h-auto text-left justify-start rounded-none ${
                        isSelected ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedId(integrator.user_id)}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(name, email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">{email}</div>
                      </div>
                      <Chip variant="outline" className="text-xs shrink-0">
                        {integrator.persona === 'admin_delta' ? 'Admin' : 'Intégrateur'}
                      </Chip>
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </Button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    />
  );
}
