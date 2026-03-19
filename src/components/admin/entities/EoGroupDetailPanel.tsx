import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useEoGroupMembers,
  useAddEoGroupMembers,
  useUpdateEoGroupMember,
  useRemoveEoGroupMember,
} from '@/hooks/useEoGroupMembers';
import { useUpdateEoGroup, type EoGroup } from '@/hooks/useEoGroups';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { X, Plus, GitBranch, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EoGroupDetailPanelProps {
  group: EoGroup;
  clientId: string;
  onClose: () => void;
}

export function EoGroupDetailPanel({
  group,
  clientId,
  onClose,
}: EoGroupDetailPanelProps) {
  const { data: members = [] } = useEoGroupMembers(group.id);
  const { data: allEntities = [] } = useOrganizationalEntities(clientId);
  const updateGroup = useUpdateEoGroup();
  const addMembers = useAddEoGroupMembers();
  const updateMember = useUpdateEoGroupMember();
  const removeMember = useRemoveEoGroupMember();

  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description || '');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEoIds, setSelectedEoIds] = useState<string[]>([]);
  const [eoSearch, setEoSearch] = useState('');

  const nameChanged = editName !== group.name;
  const descChanged = editDesc !== (group.description || '');

  const handleSave = async () => {
    await updateGroup.mutateAsync({
      id: group.id,
      name: editName,
      description: editDesc || undefined,
    });
  };

  const handleAddMembers = async () => {
    if (selectedEoIds.length === 0) return;
    await addMembers.mutateAsync(
      selectedEoIds.map((eo_id) => ({
        group_id: group.id,
        eo_id,
        include_descendants: true,
      }))
    );
    setSelectedEoIds([]);
    setAddDialogOpen(false);
  };

  const existingEoIds = new Set(members.map((m) => m.eo_id));

  const filteredEntities = allEntities.filter((e) => {
    if (existingEoIds.has(e.id)) return false;
    if (!eoSearch.trim()) return true;
    const q = eoSearch.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
        />
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Description */}
      <Input
        value={editDesc}
        onChange={(e) => setEditDesc(e.target.value)}
        placeholder="Description (optionnel)..."
        className="text-sm text-muted-foreground"
      />

      {/* Save button if changed */}
      {(nameChanged || descChanged) && (
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateGroup.isPending}
        >
          Enregistrer
        </Button>
      )}

      {/* Members */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Membres ({members.length})
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
          >
            Ajouter des EOs <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 p-2 border rounded-md"
            >
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate">
                  {member.eo_name}
                </span>
                {member.eo_code && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {member.eo_code}
                  </span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateMember.mutate({
                        id: member.id,
                        include_descendants: !member.include_descendants,
                      })
                    }
                    className={cn(
                      'h-6 w-6 shrink-0',
                      member.include_descendants
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    )}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {member.include_descendants
                    ? 'Descendance incluse — cliquez pour retirer'
                    : 'Inclure les sous-entités'}
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeMember.mutate(member.id)}
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Aucune EO dans ce regroupement.
            </div>
          )}
        </div>
      </div>

      {/* Add EOs dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="w-[var(--modal-width)]">
          <DialogHeader>
            <DialogTitle>Ajouter des EOs</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={eoSearch}
                onChange={(e) => setEoSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1 pr-2">
                {filteredEntities.map((entity) => (
                  <div
                    key={entity.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer',
                      selectedEoIds.includes(entity.id) && 'bg-primary/10'
                    )}
                    style={{ paddingLeft: `${entity.level * 12 + 8}px` }}
                    onClick={() =>
                      setSelectedEoIds((prev) =>
                        prev.includes(entity.id)
                          ? prev.filter((x) => x !== entity.id)
                          : [...prev, entity.id]
                      )
                    }
                  >
                    <Checkbox checked={selectedEoIds.includes(entity.id)} />
                    <span className="text-sm truncate">{entity.name}</span>
                    {entity.code && (
                      <span className="text-xs text-muted-foreground">
                        {entity.code}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedEoIds.length === 0 || addMembers.isPending}
            >
              Ajouter{' '}
              {selectedEoIds.length > 0 ? `(${selectedEoIds.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
