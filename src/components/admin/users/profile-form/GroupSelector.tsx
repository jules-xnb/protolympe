import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Maximize2,
  Minimize2,
  Users,
} from 'lucide-react';
import type { EoGroup } from '@/hooks/useEoGroups';
import type { EoGroupMember } from '@/hooks/useEoGroupMembers';
import type { OrganizationalEntity } from '@/hooks/useOrganizationalEntities';

interface GroupSelectorProps {
  eoGroups: EoGroup[];
  selectedGroupIds: string[];
  expandedGroups: string[];
  membersByGroup: Record<string, EoGroupMember[]>;
  childEntitiesByEoId: Record<string, OrganizationalEntity[]>;
  onGroupToggle: (id: string) => void;
  onToggleGroupExpand: (id: string, e: React.MouseEvent) => void;
  onSetExpandedGroups: React.Dispatch<React.SetStateAction<string[]>>;
  expanded?: boolean;
  onSetExpanded?: (expanded: boolean) => void;
}

function GroupList({
  eoGroups,
  selectedGroupIds,
  expandedGroups,
  membersByGroup,
  childEntitiesByEoId,
  onGroupToggle,
  onToggleGroupExpand,
  onSetExpandedGroups,
}: GroupSelectorProps) {
  return (
    <ScrollArea className={eoGroups.length > 0 ? "h-[300px]" : undefined}>
        <div className="space-y-1 pr-2">
          {eoGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground italic p-2">Aucun regroupement disponible</p>
          ) : (
            eoGroups.map(group => {
              const isExpanded = expandedGroups.includes(group.id);
              const members = membersByGroup[group.id] || [];
              return (
                <div key={group.id}>
                  <div
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md hover:bg-accent",
                      selectedGroupIds.includes(group.id) && "bg-primary/10"
                    )}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => onToggleGroupExpand(group.id, e)}
                      className="h-5 w-5 shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Checkbox
                      checked={selectedGroupIds.includes(group.id)}
                      onCheckedChange={() => onGroupToggle(group.id)}
                    />
                    <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span
                      className="text-sm font-medium truncate flex-1 cursor-pointer"
                      onClick={() => onSetExpandedGroups(prev =>
                        prev.includes(group.id) ? prev.filter(x => x !== group.id) : [...prev, group.id]
                      )}
                    >
                      {group.name}
                    </span>
                  </div>
                  {isExpanded && members.length > 0 && (
                    <div className="pl-10 space-y-0.5 mt-0.5">
                      {members.map(member => {
                        const children = childEntitiesByEoId[member.eo_id];
                        return (
                          <div key={member.id}>
                            <div className="flex items-center gap-2 py-1 px-2 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 shrink-0" />
                              <span className="truncate">{member.eo_name}</span>
                              {member.eo_code && (
                                <span className="text-xs opacity-60">{member.eo_code}</span>
                              )}
                              {member.include_descendants && (
                                <GitBranch className="h-3 w-3 text-primary shrink-0 ml-auto" />
                              )}
                            </div>
                            {member.include_descendants && children && (
                              <div className="pl-5 space-y-0.5">
                                {children.map(child => (
                                  <div
                                    key={child.id}
                                    className="flex items-center gap-2 py-0.5 px-2 text-xs text-muted-foreground/70"
                                  >
                                    <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">{child.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {isExpanded && members.length === 0 && (
                    <div className="pl-10 py-1 text-xs text-muted-foreground italic">
                      Aucune EO dans ce regroupement
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
  );
}

export function GroupSelector(props: GroupSelectorProps) {
  const { expanded, onSetExpanded } = props;

  if (expanded) {
    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            Regroupements d'EO
          </div>
          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSetExpanded?.(false)}
                  className="h-8 w-8 shrink-0"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Réduire</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <GroupList {...props} />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">Regroupements d'EO</span>
        {onSetExpanded && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSetExpanded(true)}
                className="h-6 w-6 shrink-0"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Agrandir</TooltipContent>
          </Tooltip>
        )}
      </div>
      <GroupList {...props} />
    </div>
  );
}
