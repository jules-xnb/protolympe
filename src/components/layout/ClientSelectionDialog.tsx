import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Building2, Search } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface ClientSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  filteredClients: Client[];
  search: string;
  onSearchChange: (search: string) => void;
  onSelectClient: (client: Client) => void;
}

export function ClientSelectionDialog({
  open,
  onOpenChange,
  clients,
  filteredClients,
  search,
  onSearchChange,
  onSelectClient,
}: ClientSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) onSearchChange('');
    }}>
      <DialogContent className="w-[var(--modal-width)]">
        <DialogHeader>
          <DialogTitle>Sélectionner un client</DialogTitle>
          <DialogDescription>
            Choisissez le client sur lequel vous souhaitez travailler en mode intégrateur.
          </DialogDescription>
        </DialogHeader>
        
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Client list */}
        <ScrollArea className="h-[400px] -mx-2 px-2">
          <div className="space-y-1">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun client disponible
              </p>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun client ne correspond à "{search}"
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground px-1 py-2">
                  {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} 
                  {search && ` trouvé${filteredClients.length > 1 ? 's' : ''}`}
                </p>
                {filteredClients.map((client) => (
                  <Button
                    key={client.id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3 hover:bg-accent"
                    onClick={() => onSelectClient(client)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col items-start flex-1 overflow-hidden">
                      <span className="font-medium truncate w-full text-left">{client.name}</span>
                      <span className="text-xs text-muted-foreground truncate w-full text-left">{client.slug}</span>
                    </div>
                    {!client.is_active && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                        Inactif
                      </span>
                    )}
                  </Button>
                ))}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
