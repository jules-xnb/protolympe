import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  Loader2,
} from 'lucide-react';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { useEoFieldDefinitions, useAllEoFieldValues } from '@/hooks/useEoFieldDefinitions';
import { useModuleRolesByClient, groupRolesByModule } from '@/hooks/useModuleRolesByClient';
import { useEoGroups } from '@/hooks/useEoGroups';
import { useAllEoGroupMembers, type EoGroupMember } from '@/hooks/useEoGroupMembers';
import {
  useCreateProfile,
  useUpdateProfile,
  type UserProfile,
} from '@/hooks/useUserProfiles';
import { toast } from 'sonner';
import { EoTreeSelectorExpanded, EoTreeSelectorCompact } from './profile-form/EoTreeSelector';
import { GroupSelector } from './profile-form/GroupSelector';
import { RoleSelector } from './profile-form/RoleSelector';
import { SelectionBadges } from './profile-form/SelectionBadges';

interface UserProfileFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  userId: string;
  profile?: UserProfile;
}

export function UserProfileFormDialog({
  open,
  onOpenChange,
  clientId,
  userId,
  profile,
}: UserProfileFormDialogProps) {
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState('');
  const [selectedEoIds, setSelectedEoIds] = useState<string[]>([]);
  const [eoDescendants, setEoDescendants] = useState<Record<string, boolean>>({});
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [eoSearch, setEoSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedEoIds, setExpandedEoIds] = useState<string[]>([]);
  const [eoExpanded, setEoExpanded] = useState(false);
  const [eoFilters, setEoFilters] = useState<Record<string, string>>({});

  const { data: entities = [] } = useOrganizationalEntities(clientId);
  const { data: allModuleRoles = [] } = useModuleRolesByClient(clientId);
  const modules = useMemo(() => groupRolesByModule(allModuleRoles), [allModuleRoles]);
  const { data: eoGroups = [] } = useEoGroups(clientId);
  const { data: eoFieldDefs = [] } = useEoFieldDefinitions(clientId);
  const { data: allFieldValues = [] } = useAllEoFieldValues(clientId);

  // Fetch members for all groups to display in the collapsible tree
  const allGroupIds = useMemo(() => eoGroups.map(g => g.id), [eoGroups]);
  const { data: allGroupMembers = [] } = useAllEoGroupMembers(allGroupIds);

  // Group members by group_id for display
  const membersByGroup = useMemo(() => {
    const map: Record<string, EoGroupMember[]> = {};
    allGroupMembers.forEach(m => {
      if (!map[m.group_id]) map[m.group_id] = [];
      map[m.group_id].push(m);
    });
    return map;
  }, [allGroupMembers]);

  // For each member with include_descendants, find child entities
  const childEntitiesByEoId = useMemo(() => {
    const map: Record<string, typeof entities> = {};
    allGroupMembers.forEach(m => {
      if (m.include_descendants) {
        const children = entities.filter(
          e => e.path?.startsWith(m.eo_path + '.') && e.id !== m.eo_id
        );
        if (children.length > 0) map[m.eo_id] = children;
      }
    });
    return map;
  }, [allGroupMembers, entities]);

  // Index field values by eo_id → field_definition_id → value
  const fieldValuesByEo = useMemo(() => {
    const map: Record<string, Record<string, any>> = {};
    allFieldValues.forEach(fv => {
      if (!map[fv.eo_id]) map[fv.eo_id] = {};
      map[fv.eo_id][fv.field_definition_id] = fv.value;
    });
    return map;
  }, [allFieldValues]);

  // Available hierarchy levels from entities
  const availableLevels = useMemo(() => {
    const levels = new Set<number>();
    entities.forEach(e => levels.add(e.level));
    return Array.from(levels).sort((a, b) => a - b);
  }, [entities]);

  // Filterable custom fields (select, multiselect, checkbox)
  const filterableFields = useMemo(() => {
    return eoFieldDefs.filter(f =>
      ['select', 'multiselect', 'checkbox'].includes(f.field_type)
    );
  }, [eoFieldDefs]);

  const isLoading = createProfile.isPending || updateProfile.isPending;

  // Initialize form when editing
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setSelectedEoIds(profile.eos.map(e => e.eo_id));
      const descMap: Record<string, boolean> = {};
      profile.eos.forEach(e => {
        if (e.include_descendants) descMap[e.eo_id] = true;
      });
      setEoDescendants(descMap);
      setSelectedRoleIds(profile.roles.map(r => r.role_id));
      setSelectedGroupIds(profile.groups?.map(g => g.group_id) || []);
    } else {
      setName('');
      setSelectedEoIds([]);
      setEoDescendants({});
      setSelectedRoleIds([]);
      setSelectedGroupIds([]);
    }
    setEoSearch('');
    setRoleSearch('');
    setEoExpanded(false);
    setEoFilters({});
  }, [profile, open]);

  // EO IDs implicitly selected via ancestor's include_descendants
  const implicitlySelectedEoIds = useMemo(() => {
    const set = new Set<string>();
    const childrenOf: Record<string, string[]> = {};
    entities.forEach(e => {
      if (e.parent_id) {
        if (!childrenOf[e.parent_id]) childrenOf[e.parent_id] = [];
        childrenOf[e.parent_id].push(e.id);
      }
    });
    const markDescendants = (id: string) => {
      const children = childrenOf[id] || [];
      children.forEach(childId => {
        set.add(childId);
        markDescendants(childId);
      });
    };
    selectedEoIds.forEach(id => {
      if (eoDescendants[id]) markDescendants(id);
    });
    return set;
  }, [entities, selectedEoIds, eoDescendants]);

  // Set of entity IDs that have children
  const entitiesWithChildren = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      if (e.parent_id) set.add(e.parent_id);
    });
    return set;
  }, [entities]);

  // Filter entities
  const filteredEntities = useMemo(() => {
    let filtered = entities;
    if (eoSearch.trim()) {
      const query = eoSearch.toLowerCase();
      filtered = entities.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.code?.toLowerCase().includes(query)
      );
    } else {
      filtered = entities.filter(e => {
        if (e.level === 0) return true;
        let visible = true;
        for (const ancestor of entities) {
          if (ancestor.id === e.id) continue;
          if (ancestor.level >= e.level) continue;
          if (e.path?.startsWith(ancestor.path + '.') && !expandedEoIds.includes(ancestor.id)) {
            visible = false;
            break;
          }
        }
        return visible;
      });
    }
    const levelFilter = eoFilters['__level'];
    if (levelFilter !== undefined && levelFilter !== '') {
      filtered = filtered.filter(e => e.level === Number(levelFilter));
    }
    const activeFilter = eoFilters['__is_active'];
    if (activeFilter === 'true') {
      filtered = filtered.filter(e => e.is_active !== false);
    } else if (activeFilter === 'false') {
      filtered = filtered.filter(e => e.is_active === false);
    }
    Object.entries(eoFilters).forEach(([key, value]) => {
      if (key.startsWith('__') || !value) return;
      filtered = filtered.filter(e => {
        const fieldVal = fieldValuesByEo[e.id]?.[key];
        if (fieldVal == null) return false;
        const normalized = typeof fieldVal === 'string' ? fieldVal : JSON.stringify(fieldVal);
        if (Array.isArray(fieldVal)) return fieldVal.includes(value);
        return normalized === value || normalized === `"${value}"`;
      });
    });
    return filtered;
  }, [entities, eoSearch, expandedEoIds, eoFilters, fieldValuesByEo]);

  const toggleEoExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEoIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleEoToggle = (id: string) => {
    setSelectedEoIds(prev => {
      if (prev.includes(id)) {
        setEoDescendants(d => {
          const next = { ...d };
          delete next[id];
          return next;
        });
        return prev.filter(x => x !== id);
      }
      setEoDescendants(d => ({ ...d, [id]: true }));
      return [...prev, id];
    });
  };

  const handleDescendantsToggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEoDescendants(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleRoleToggle = (id: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleGroupToggle = (id: string) => {
    setSelectedGroupIds(prev => {
      const wasSelected = prev.includes(id);
      if (!wasSelected) {
        setExpandedGroups(exp => exp.includes(id) ? exp : [...exp, id]);
      }
      return wasSelected ? prev.filter(x => x !== id) : [...prev, id];
    });
  };

  const toggleGroupExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleModule = (slug: string) => {
    setExpandedModules(prev =>
      prev.includes(slug) ? prev.filter(x => x !== slug) : [...prev, slug]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Le nom du profil est requis');
      return;
    }
    if (selectedEoIds.length === 0) {
      toast.error('Sélectionnez au moins une entité');
      return;
    }
    if (selectedRoleIds.length === 0) {
      toast.error('Sélectionnez au moins un rôle');
      return;
    }

    const eo_assignments = selectedEoIds.map(id => ({
      eo_id: id,
      include_descendants: eoDescendants[id] ?? false,
    }));

    try {
      if (profile) {
        await updateProfile.mutateAsync({
          id: profile.id,
          name: name.trim(),
          eo_assignments,
          role_ids: selectedRoleIds,
          group_ids: selectedGroupIds,
        });
        toast.success('Profil modifié');
      } else {
        await createProfile.mutateAsync({
          user_id: userId,
          client_id: clientId,
          name: name.trim(),
          eo_assignments,
          role_ids: selectedRoleIds,
          group_ids: selectedGroupIds,
        });
        toast.success('Profil créé');
      }
      onOpenChange(false);
    } catch (error: any) {
      // Error is handled by the mutation
    }
  };

  const canSubmit = name.trim() && selectedEoIds.length > 0 && selectedRoleIds.length > 0;
  const isEditing = !!profile;

  const eoTreeProps = {
    entities,
    filteredEntities,
    selectedEoIds,
    eoDescendants,
    expandedEoIds,
    implicitlySelectedEoIds,
    entitiesWithChildren,
    eoSearch,
    onEoSearchChange: setEoSearch,
    onEoToggle: handleEoToggle,
    onDescendantsToggle: handleDescendantsToggle,
    onToggleEoExpand: toggleEoExpand,
    onSetExpandedEoIds: setExpandedEoIds,
    eoExpanded,
    onSetEoExpanded: setEoExpanded,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isEditing ? 'Modifier le profil' : 'Nouveau profil'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les paramètres de ce profil.'
              : 'Créez un profil d\'accès pour cet utilisateur.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="space-y-4">
            {!eoExpanded && (
            <div className="space-y-2">
              <Label htmlFor="name">Nom du profil *</Label>
              <Input
                id="name"
                placeholder="Ex: Directeur Région Sud"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            )}

            {!eoExpanded && (
              <SelectionBadges
                entities={entities}
                roles={allModuleRoles}
                eoGroups={eoGroups}
                selectedEoIds={selectedEoIds}
                selectedRoleIds={selectedRoleIds}
                selectedGroupIds={selectedGroupIds}
                eoDescendants={eoDescendants}
                onEoToggle={handleEoToggle}
                onRoleToggle={handleRoleToggle}
                onGroupToggle={handleGroupToggle}
              />
            )}

            {eoExpanded ? (
              <EoTreeSelectorExpanded
                {...eoTreeProps}
                eoFilters={eoFilters}
                onSetEoFilters={setEoFilters}
                availableLevels={availableLevels}
                filterableFields={filterableFields}
              />
            ) : (
            <div className="grid grid-cols-3 gap-4">
              <EoTreeSelectorCompact {...eoTreeProps} />

              <GroupSelector
                eoGroups={eoGroups}
                selectedGroupIds={selectedGroupIds}
                expandedGroups={expandedGroups}
                membersByGroup={membersByGroup}
                childEntitiesByEoId={childEntitiesByEoId}
                onGroupToggle={handleGroupToggle}
                onToggleGroupExpand={toggleGroupExpand}
                onSetExpandedGroups={setExpandedGroups}
              />

              <RoleSelector
                modules={modules}
                selectedRoleIds={selectedRoleIds}
                expandedModules={expandedModules}
                roleSearch={roleSearch}
                onRoleSearchChange={setRoleSearch}
                onRoleToggle={handleRoleToggle}
                onModuleToggle={toggleModule}
              />
            </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {!canSubmit && (
            <p className="text-sm text-muted-foreground mr-auto">
              Sélectionnez au moins une entité et un rôle
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
