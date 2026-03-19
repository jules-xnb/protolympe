import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Shield,
  Search,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Box,
} from 'lucide-react';
import type { ModuleWithRoles, ModuleRoleWithModule } from '@/hooks/useModuleRolesByClient';

interface RoleSelectorProps {
  modules: ModuleWithRoles[];
  selectedRoleIds: string[];
  expandedModules: string[];
  roleSearch: string;
  onRoleSearchChange: (value: string) => void;
  onRoleToggle: (id: string) => void;
  onModuleToggle: (slug: string) => void;
  expanded?: boolean;
  onSetExpanded?: (expanded: boolean) => void;
}

export function RoleSelector({
  modules,
  selectedRoleIds,
  expandedModules,
  roleSearch,
  onRoleSearchChange,
  onRoleToggle,
  onModuleToggle,
  expanded,
  onSetExpanded,
}: RoleSelectorProps) {
  const renderRoleItem = (role: ModuleRoleWithModule) => (
    <label
      key={role.id}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer",
        selectedRoleIds.includes(role.id) && "bg-primary/10"
      )}
    >
      <Checkbox
        checked={selectedRoleIds.includes(role.id)}
        onCheckedChange={() => onRoleToggle(role.id)}
      />
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: role.color || '#6b7280' }}
      />
      <span className="text-sm truncate">{role.name}</span>
    </label>
  );

  const filteredModules = modules.map(mod => {
    if (!roleSearch.trim()) return mod;
    const query = roleSearch.toLowerCase();
    const filtered = mod.roles.filter(r =>
      r.name.toLowerCase().includes(query) ||
      mod.moduleLabel.toLowerCase().includes(query)
    );
    return { ...mod, roles: filtered };
  }).filter(mod => mod.roles.length > 0);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 font-medium text-sm">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">Rôles *</span>
        {onSetExpanded && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSetExpanded(!expanded)}
                className="h-6 w-6 shrink-0"
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{expanded ? 'Réduire' : 'Agrandir'}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={roleSearch}
          onChange={(e) => onRoleSearchChange(e.target.value)}
          className="pl-8 h-8"
        />
      </div>
      <ScrollArea className="h-[300px]">
        <div className="space-y-1 pr-2">
          {filteredModules.map((mod) => {
            const isExpanded = expandedModules.includes(mod.moduleSlug);

            return (
              <Collapsible
                key={mod.moduleSlug}
                open={isExpanded}
                onOpenChange={() => onModuleToggle(mod.moduleSlug)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer w-full">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{mod.moduleLabel}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {mod.roles.filter(r => selectedRoleIds.includes(r.id)).length}/{mod.roles.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1">
                  {mod.roles.map(renderRoleItem)}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
