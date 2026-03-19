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
import { FloatingInput } from '@/components/ui/floating-input';
import { UserCog, Loader2 } from 'lucide-react';
import { useOrganizationalEntities } from '@/hooks/useOrganizationalEntities';
import { useEoFieldDefinitions, useAllEoFieldValues } from '@/hooks/useEoFieldDefinitions';
import { useModuleRolesByClient, groupRolesByModule } from '@/hooks/useModuleRolesByClient';
import { useEoGroups } from '@/hooks/useEoGroups';
import { useAllEoGroupMembers, type EoGroupMember } from '@/hooks/useEoGroupMembers';
import {
  useCreateProfileTemplate,
  useUpdateProfileTemplate,
  type ProfileTemplate,
} from '@/hooks/useProfileTemplates';
import { useViewMode } from '@/contexts/ViewModeContext';
import { toast } from 'sonner';
import { EoTreeSelectorExpanded, EoTreeSelectorCompact } from '@/components/admin/users/profile-form/EoTreeSelector';
import { GroupSelector } from '@/components/admin/users/profile-form/GroupSelector';
import { RoleSelector } from '@/components/admin/users/profile-form/RoleSelector';
import { SelectionBadges } from '@/components/admin/users/profile-form/SelectionBadges';

interface ProfileTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ProfileTemplate | null;
  duplicateFrom?: ProfileTemplate | null;
}

export function ProfileTemplateFormDialog({
  open,
  onOpenChange,
  template,
  duplicateFrom,
}: ProfileTemplateFormDialogProps) {
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id || '';

  const createTemplate = useCreateProfileTemplate();
  const updateTemplate = useUpdateProfileTemplate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [eoFilters, setEoFilters] = useState<Record<string, string>>({});

  const { data: entities = [] } = useOrganizationalEntities(clientId);
  const { data: allModuleRoles = [] } = useModuleRolesByClient(clientId);
  const modules = useMemo(() => groupRolesByModule(allModuleRoles), [allModuleRoles]);
  const { data: eoGroups = [] } = useEoGroups(clientId);
  const { data: eoFieldDefs = [] } = useEoFieldDefinitions(clientId);
  const { data: allFieldValues = [] } = useAllEoFieldValues(clientId);

  const allGroupIds = useMemo(() => eoGroups.map(g => g.id), [eoGroups]);
  const { data: allGroupMembers = [] } = useAllEoGroupMembers(allGroupIds);

  const membersByGroup = useMemo(() => {
    const map: Record<string, EoGroupMember[]> = {};
    allGroupMembers.forEach(m => {
      if (!map[m.group_id]) map[m.group_id] = [];
      map[m.group_id].push(m);
    });
    return map;
  }, [allGroupMembers]);

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

  const fieldValuesByEo = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    allFieldValues.forEach(fv => {
      if (!map[fv.eo_id]) map[fv.eo_id] = {};
      map[fv.eo_id][fv.field_definition_id] = fv.value;
    });
    return map;
  }, [allFieldValues]);

  const availableLevels = useMemo(() => {
    const levels = new Set<number>();
    entities.forEach(e => levels.add(e.level));
    return Array.from(levels).sort((a, b) => a - b);
  }, [entities]);

  const filterableFields = useMemo(() => {
    return eoFieldDefs.filter(f =>
      ['select', 'multiselect', 'checkbox'].includes(f.field_type)
    );
  }, [eoFieldDefs]);

  const isLoading = createTemplate.isPending || updateTemplate.isPending;

  // Determine the source data (edit or duplicate)
  const source = template || duplicateFrom;

  const isEditing = !!template;
  useEffect(() => {
    if (source) {
      setName(isEditing ? source.name : `${source.name} (copie)`);
      setDescription(source.description || '');
      setSelectedEoIds(source.eos.map(e => e.eo_id));
      const descMap: Record<string, boolean> = {};
      source.eos.forEach(e => {
        if (e.include_descendants) descMap[e.eo_id] = true;
      });
      setEoDescendants(descMap);
      setSelectedRoleIds(source.roles.map(r => r.module_role_id));
      setSelectedGroupIds(source.groups?.map(g => g.group_id) || []);
    } else {
      setName('');
      setDescription('');
      setSelectedEoIds([]);
      setEoDescendants({});
      setSelectedRoleIds([]);
      setSelectedGroupIds([]);
    }
    setEoSearch('');
    setRoleSearch('');
    setEoExpanded(false);
    setGroupsExpanded(false);
    setRolesExpanded(false);
    setEoFilters({});
  }, [source, isEditing, open]);

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

  const entitiesWithChildren = useMemo(() => {
    const set = new Set<string>();
    entities.forEach(e => {
      if (e.parent_id) set.add(e.parent_id);
    });
    return set;
  }, [entities]);

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
        for (const ancestor of entities) {
          if (ancestor.id === e.id) continue;
          if (ancestor.level >= e.level) continue;
          if (e.path?.startsWith(ancestor.path + '.') && !expandedEoIds.includes(ancestor.id)) {
            return false;
          }
        }
        return true;
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
    setEoDescendants(prev => ({ ...prev, [id]: !prev[id] }));
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
      if (template) {
        await updateTemplate.mutateAsync({
          id: template.id,
          name: name.trim(),
          description: description.trim() || null,
          eo_assignments,
          role_ids: selectedRoleIds,
          group_ids: selectedGroupIds,
        });
      } else {
        await createTemplate.mutateAsync({
          client_id: clientId,
          name: name.trim(),
          description: description.trim() || undefined,
          eo_assignments,
          role_ids: selectedRoleIds,
          group_ids: selectedGroupIds,
        });
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation toast
    }
  };

  const canSubmit = name.trim() && selectedEoIds.length > 0 && selectedRoleIds.length > 0;

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
      <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            {isEditing ? 'Modifier le profil' : duplicateFrom ? 'Dupliquer le profil' : 'Nouveau profil'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les paramètres de ce profil. Les modifications s\'appliqueront à tous les utilisateurs assignés.'
              : 'Créez un profil partagé assignable à plusieurs utilisateurs.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="space-y-4">
            {!eoExpanded && !groupsExpanded && !rolesExpanded && (
              <FloatingInput
                id="template-name"
                label="Nom du profil *"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            {!eoExpanded && !groupsExpanded && !rolesExpanded && (
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
            ) : groupsExpanded ? (
              <GroupSelector
                eoGroups={eoGroups}
                selectedGroupIds={selectedGroupIds}
                expandedGroups={expandedGroups}
                membersByGroup={membersByGroup}
                childEntitiesByEoId={childEntitiesByEoId}
                onGroupToggle={handleGroupToggle}
                onToggleGroupExpand={toggleGroupExpand}
                onSetExpandedGroups={setExpandedGroups}
                expanded
                onSetExpanded={setGroupsExpanded}
              />
            ) : rolesExpanded ? (
              <RoleSelector
                modules={modules}
                selectedRoleIds={selectedRoleIds}
                expandedModules={expandedModules}
                roleSearch={roleSearch}
                onRoleSearchChange={setRoleSearch}
                onRoleToggle={handleRoleToggle}
                onModuleToggle={toggleModule}
                expanded
                onSetExpanded={setRolesExpanded}
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
                  onSetExpanded={setGroupsExpanded}
                />

                <RoleSelector
                  modules={modules}
                  selectedRoleIds={selectedRoleIds}
                  expandedModules={expandedModules}
                  roleSearch={roleSearch}
                  onRoleSearchChange={setRoleSearch}
                  onRoleToggle={handleRoleToggle}
                  onModuleToggle={toggleModule}
                  onSetExpanded={setRolesExpanded}
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
            {isEditing ? 'Enregistrer' : 'Créer'}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
