import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import {
  Building2,
  X,
  Users,
} from 'lucide-react';
import type { OrganizationalEntity } from '@/hooks/useOrganizationalEntities';
import type { ModuleRoleWithModule } from '@/hooks/useModuleRolesByClient';
import type { EoGroup } from '@/hooks/useEoGroups';

interface SelectionBadgesProps {
  entities: OrganizationalEntity[];
  roles: ModuleRoleWithModule[];
  eoGroups: EoGroup[];
  selectedEoIds: string[];
  selectedRoleIds: string[];
  selectedGroupIds: string[];
  eoDescendants: Record<string, boolean>;
  onEoToggle: (id: string) => void;
  onRoleToggle: (id: string) => void;
  onGroupToggle: (id: string) => void;
}

export function SelectionBadges({
  entities,
  roles,
  eoGroups,
  selectedEoIds,
  selectedRoleIds,
  selectedGroupIds,
  eoDescendants,
  onEoToggle,
  onRoleToggle,
  onGroupToggle,
}: SelectionBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted min-h-[40px]">
      {selectedEoIds.length === 0 && selectedRoleIds.length === 0 && selectedGroupIds.length === 0 && (
        <span className="text-sm text-muted-foreground">Aucune sélection</span>
      )}
      {selectedEoIds.map(id => {
        const eo = entities.find(e => e.id === id);
        const hasDesc = eoDescendants[id];
        return eo ? (
          <Chip key={id} variant="outline" className="gap-1 pr-1 bg-background">
            <Building2 className="h-3 w-3" />
            {eo.name}
            {hasDesc && (
              <span className="text-xs text-primary font-medium ml-0.5">↓</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEoToggle(id)}
              className="ml-1 h-4 w-4 rounded-full hover:bg-muted p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </Chip>
        ) : null;
      })}
      {selectedGroupIds.map(id => {
        const group = eoGroups.find(g => g.id === id);
        return group ? (
          <Chip key={`grp-${id}`} variant="outline" className="gap-1 pr-1 bg-background border-primary text-primary">
            <Users className="h-3 w-3" />
            {group.name}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onGroupToggle(id)}
              className="ml-1 h-4 w-4 rounded-full hover:bg-muted p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </Chip>
        ) : null;
      })}
      {selectedRoleIds.map(id => {
        const role = roles.find(r => r.id === id);
        return role ? (
          <Chip
            key={id}
            variant="outline"
            className="gap-1 pr-1 bg-background"
            style={{
              borderColor: role.color || undefined,
            }}
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: role.color || '#6b7280' }}
            />
            {role.name}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRoleToggle(id)}
              className="ml-1 h-4 w-4 rounded-full hover:bg-muted p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </Chip>
        ) : null;
      })}
    </div>
  );
}
