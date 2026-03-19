import { useState, useEffect, useRef } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import { useEoGroups, useCreateEoGroup, useDeleteEoGroup } from '@/hooks/useEoGroups';
import { useEoGroupMembers, useAddEoGroupMembers, useRemoveEoGroupMember, useUpdateEoGroupMember } from '@/hooks/useEoGroupMembers';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { Plus, Users, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GroupMembers } from './eo-groups/GroupMembers';
import { CreateGroupDialog } from './eo-groups/CreateGroupDialog';
import { AddEoDialog } from './eo-groups/AddEoDialog';

interface EoGroupsTabProps {
  clientId: string;
}

export function EoGroupsTab({ clientId }: EoGroupsTabProps) {
  const { data: groups = [], isLoading } = useEoGroups(clientId);
  const createGroup = useCreateEoGroup();
  const deleteGroup = useDeleteEoGroup();

  const addMembers = useAddEoGroupMembers();
  const removeMemberMutation = useRemoveEoGroupMember();
  const updateMemberMutation = useUpdateEoGroupMember();
  const { data: allEntities = [] } = useOrganizationalEntities(clientId);

  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [selectedEoIds, setSelectedEoIds] = useState<string[]>([]);
  const [eoDescendants, setEoDescendants] = useState<Record<string, boolean>>({});
  const [eoSearch, setEoSearch] = useState('');

  // Fetch members for the group being edited (for pre-filling the dialog)
  const { data: editingGroupMembers = [] } = useEoGroupMembers(addingToGroupId ?? '');

  // Pre-fill selectedEoIds & eoDescendants when members are loaded for the dialog
  const initializedForGroupRef = useRef<string | null>(null);
  useEffect(() => {
    if (addingToGroupId && editingGroupMembers.length > 0 && initializedForGroupRef.current !== addingToGroupId) {
      initializedForGroupRef.current = addingToGroupId;
      setSelectedEoIds(editingGroupMembers.map((m) => m.eo_id));
      const descMap: Record<string, boolean> = {};
      editingGroupMembers.forEach((m) => {
        if (m.include_descendants) descMap[m.eo_id] = true;
      });
      setEoDescendants(descMap);
    }
  }, [addingToGroupId, editingGroupMembers]);

  const handleCreate = async () => {
    await createGroup.mutateAsync({
      client_id: clientId,
      name: newName,
      description: newDesc || undefined,
    });
    setCreateOpen(false);
    setNewName('');
    setNewDesc('');
  };

  const handleDelete = async () => {
    if (!deletingGroupId) return;
    await deleteGroup.mutateAsync(deletingGroupId);
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(deletingGroupId);
      return next;
    });
    setDeletingGroupId(null);
  };

  const handleAddMembers = async () => {
    if (!addingToGroupId) return;

    const existingEoIds = new Set(editingGroupMembers.map((m) => m.eo_id));
    const selectedSet = new Set(selectedEoIds);

    const toAdd = selectedEoIds.filter((id) => !existingEoIds.has(id));
    const toRemove = editingGroupMembers.filter((m) => !selectedSet.has(m.eo_id));
    const toUpdate = editingGroupMembers.filter(
      (m) => selectedSet.has(m.eo_id) && (eoDescendants[m.eo_id] ?? false) !== m.include_descendants
    );

    const promises: Promise<unknown>[] = [];

    if (toAdd.length > 0) {
      promises.push(
        addMembers.mutateAsync(
          toAdd.map((eo_id) => ({
            group_id: addingToGroupId,
            eo_id,
            include_descendants: eoDescendants[eo_id] ?? false,
          }))
        )
      );
    }

    for (const member of toRemove) {
      promises.push(removeMemberMutation.mutateAsync(member.id));
    }

    for (const member of toUpdate) {
      promises.push(
        updateMemberMutation.mutateAsync({
          id: member.id,
          include_descendants: eoDescendants[member.eo_id] ?? false,
        })
      );
    }

    await Promise.all(promises);

    setSelectedEoIds([]);
    setEoDescendants({});
    setEoSearch('');
    initializedForGroupRef.current = null;
    setAddingToGroupId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setExpandedGroupIds(new Set(groups.map((g) => g.id)));
  const collapseAll = () => setExpandedGroupIds(new Set());

  if (!isLoading && groups.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Nouveau <Plus className="h-4 w-4" />
          </Button>
        </div>
        <EmptyState icon={Users} title="Aucun regroupement. Créez-en un pour commencer." />

        <CreateGroupDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          name={newName}
          onNameChange={setNewName}
          desc={newDesc}
          onDescChange={setNewDesc}
          onCreate={handleCreate}
          isPending={createGroup.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-lg bg-card flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30 shrink-0">
          <div className="text-sm text-muted-foreground">
            {groups.length} regroupement{groups.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Tout déplier
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Tout replier
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Nouveau <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tree rows */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-0.5">
            {groups.map((group) => {
              const isExpanded = expandedGroupIds.has(group.id);
              return (
                <div key={group.id} className="flex flex-col">
                  {/* Group row */}
                  <div
                    className={cn(
                      'flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors hover:bg-muted/50',
                      isExpanded && 'bg-muted/30'
                    )}
                    onClick={() => toggleExpand(group.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(group.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />

                    <span className="font-medium truncate">{group.name}</span>

                    {group.description && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:inline">
                        {group.description}
                      </span>
                    )}

                    <Chip variant="default" className="text-xs shrink-0 ml-auto">
                      {group.member_count} membre{group.member_count !== 1 ? 's' : ''}
                    </Chip>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingToGroupId(group.id);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingGroupId(group.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>

                  {/* Member sub-rows */}
                  {isExpanded && (
                    <div className="flex flex-col">
                      <GroupMembers groupId={group.id} allEntities={allEntities} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Create dialog */}
      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={newName}
        onNameChange={setNewName}
        desc={newDesc}
        onDescChange={setNewDesc}
        onCreate={handleCreate}
        isPending={createGroup.isPending}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deletingGroupId}
        onOpenChange={(open) => !open && setDeletingGroupId(null)}
        onConfirm={handleDelete}
        title="Supprimer le regroupement"
        description="Ce regroupement sera supprimé, ainsi que toutes les assignations de profils associées."
        isDeleting={deleteGroup.isPending}
      />

      {/* Add EOs dialog */}
      <AddEoDialog
        open={!!addingToGroupId}
        onOpenChange={(open) => {
          if (!open) {
            setAddingToGroupId(null);
            setSelectedEoIds([]);
            setEoDescendants({});
            setEoSearch('');
            initializedForGroupRef.current = null;
          }
        }}
        allEntities={allEntities}
        existingEoIds={new Set(editingGroupMembers.map((m) => m.eo_id))}
        selectedEoIds={selectedEoIds}
        onToggleEo={(id) => {
          setSelectedEoIds((prev) => {
            if (prev.includes(id)) {
              setEoDescendants((d) => {
                const next = { ...d };
                delete next[id];
                return next;
              });
              return prev.filter((x) => x !== id);
            }
            setEoDescendants((d) => ({ ...d, [id]: true }));
            return [...prev, id];
          });
        }}
        eoDescendants={eoDescendants}
        onToggleDescendants={(id) =>
          setEoDescendants((prev) => ({ ...prev, [id]: !prev[id] }))
        }
        eoSearch={eoSearch}
        onSearchChange={setEoSearch}
        onConfirm={handleAddMembers}
        isPending={addMembers.isPending}
      />
    </div>
  );
}
