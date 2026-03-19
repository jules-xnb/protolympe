import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type ProfileTemplate } from '@/hooks/useProfileTemplates';
import {
  UserCog,
  Plus,
  Search,
  GitBranch,
} from 'lucide-react';

interface AssignProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  availableTemplates: ProfileTemplate[];
  isAssigning: boolean;
  onAssign: (templateId: string) => void;
  onCreateProfile: () => void;
}

export function AssignProfileDialog({
  open,
  onOpenChange,
  userName,
  availableTemplates,
  isAssigning,
  onAssign,
  onCreateProfile,
}: AssignProfileDialogProps) {
  const [search, setSearch] = useState('');

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) setSearch('');
  };

  const q = search.toLowerCase().trim();
  const filtered = q
    ? availableTemplates.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.eos.some(eo => eo.eo_name.toLowerCase().includes(q)) ||
        t.roles.some(r => r.role_name.toLowerCase().includes(q))
      )
    : availableTemplates;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-[90vw]">
        <DialogHeader>
          <DialogTitle>Assigner un profil</DialogTitle>
          <DialogDescription>
            Sélectionnez un profil à assigner à {userName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un profil..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={onCreateProfile}>
            Créer un profil
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[400px]">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {availableTemplates.length === 0
                  ? 'Tous les profils sont déjà assignés'
                  : 'Aucun profil trouvé'}
              </p>
              <Button variant="link" className="mt-2 text-xs" onClick={onCreateProfile}>
                Créer un nouveau profil
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Entités</TableHead>
                    <TableHead>Rôles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(tpl => (
                    <TableRow
                      key={tpl.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => !isAssigning && onAssign(tpl.id)}
                    >
                      <TableCell className="font-medium text-sm whitespace-nowrap">
                        {tpl.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tpl.eos.slice(0, 2).map(eo => (
                            <Chip key={eo.eo_id} variant="default" className="text-xs gap-1">
                              {eo.eo_name}
                              {eo.include_descendants && <GitBranch className="h-3 w-3 text-primary" />}
                            </Chip>
                          ))}
                          {tpl.eos.length > 2 && (
                            <Chip variant="default" className="text-xs">+{tpl.eos.length - 2}</Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tpl.roles.slice(0, 2).map(r => (
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
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: r.role_color || '#6b7280' }}
                              />
                              {r.role_name}
                            </Chip>
                          ))}
                          {tpl.roles.length > 2 && (
                            <Chip variant="outline" className="text-xs">+{tpl.roles.length - 2}</Chip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
