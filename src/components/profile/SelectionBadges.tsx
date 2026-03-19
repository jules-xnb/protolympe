import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Building2, X } from 'lucide-react';
import type { ModuleRoleWithModule } from '@/hooks/useModuleRolesByClient';

interface Entity {
  id: string;
  name: string;
}

interface SelectionBadgesProps {
  entities: Entity[];
  roles: ModuleRoleWithModule[];
  selectedEoIds: string[];
  selectedRoleIds: string[];
  eoDescendants: Record<string, boolean>;
  onEoToggle: (id: string) => void;
  onRoleToggle: (id: string) => void;
}

export function SelectionBadges({
  entities,
  roles,
  selectedEoIds,
  selectedRoleIds,
  eoDescendants,
  onEoToggle,
  onRoleToggle,
}: SelectionBadgesProps) {
  if (selectedEoIds.length === 0 && selectedRoleIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
      {selectedEoIds.map(id => {
        const eo = entities.find(e => e.id === id);
        const hasDesc = eoDescendants[id];
        return eo ? (
          <Chip key={id} variant="default" className="gap-1 pr-1">
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
      {selectedRoleIds.map(id => {
        const role = roles.find(r => r.id === id);
        return role ? (
          <Chip
            key={id}
            variant="default"
            className="gap-1 pr-1"
            style={{
              backgroundColor: role.color ? `${role.color}20` : undefined,
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
