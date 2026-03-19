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
  Layers,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { RoleWithCategory } from '@/hooks/useRoles';
import type { RoleCategory } from '@/hooks/useRoleCategories';

interface RoleSelectorProps {
  roles: RoleWithCategory[];
  categories: RoleCategory[];
  filteredRoles: RoleWithCategory[];
  rolesByCategory: {
    grouped: Record<string, RoleWithCategory[]>;
    uncategorized: RoleWithCategory[];
  };
  selectedRoleIds: string[];
  expandedCategories: string[];
  roleSearch: string;
  onRoleSearchChange: (value: string) => void;
  onRoleToggle: (id: string) => void;
  onCategoryToggle: (id: string) => void;
  expanded?: boolean;
  onSetExpanded?: (expanded: boolean) => void;
}

export function RoleSelector({
  categories,
  rolesByCategory,
  selectedRoleIds,
  expandedCategories,
  roleSearch,
  onRoleSearchChange,
  onRoleToggle,
  onCategoryToggle,
  expanded,
  onSetExpanded,
}: RoleSelectorProps) {
  const renderRoleItem = (role: RoleWithCategory) => (
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

  const renderCategorySection = (category: RoleCategory, categoryRoles: RoleWithCategory[]) => {
    const isExpanded = expandedCategories.includes(category.id);

    return (
      <Collapsible
        key={category.id}
        open={isExpanded}
        onOpenChange={() => onCategoryToggle(category.id)}
      >
        <CollapsibleTrigger className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer w-full">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{category.name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 space-y-1">
          {categoryRoles.map(renderRoleItem)}
        </CollapsibleContent>
      </Collapsible>
    );
  };

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
          {categories.map((category) => {
            const categoryRoles = rolesByCategory.grouped[category.id] || [];
            if (categoryRoles.length === 0) return null;
            return renderCategorySection(category, categoryRoles);
          })}

          {rolesByCategory.uncategorized.length > 0 && (
            <Collapsible
              open={expandedCategories.includes('uncategorized')}
              onOpenChange={() => onCategoryToggle('uncategorized')}
            >
              <CollapsibleTrigger className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer w-full">
                {expandedCategories.includes('uncategorized') ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground italic">
                  Sans catégorie
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1">
                {rolesByCategory.uncategorized.map(renderRoleItem)}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
