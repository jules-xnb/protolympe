import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, Search, Plus, FolderTree, MoreHorizontal, Pencil, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type RoleWithCategory } from '@/hooks/useRoles';
import { type RoleCategory } from '@/hooks/useRoleCategories';

interface RoleSidebarProps {
  roles: RoleWithCategory[];
  categories: RoleCategory[];
  selectedRoleId: string | null;
  onSelectRole: (role: RoleWithCategory) => void;
  onCreateRole: () => void;
  onEditCategory: (category: RoleCategory) => void;
  onArchiveCategory: (category: RoleCategory) => void;
  isLoading: boolean;
  usedRoleIds?: Set<string>;
}

export function RoleSidebar({
  roles,
  categories,
  selectedRoleId,
  onSelectRole,
  onCreateRole,
  onEditCategory,
  onArchiveCategory,
  isLoading,
  usedRoleIds,
}: RoleSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Group roles by category, sorted alphabetically within each category
  const rolesByCategory = useMemo(() => {
    const map = new Map<string, RoleWithCategory[]>();
    for (const role of roles) {
      const catId = role.category_id ?? '__uncategorized__';
      if (!map.has(catId)) {
        map.set(catId, []);
      }
      map.get(catId)!.push(role);
    }
    // Sort roles alphabetically within each category
    for (const [, catRoles] of map) {
      catRoles.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [roles]);

  // Filter categories and roles based on search
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return categories.map((cat) => ({
        category: cat,
        roles: rolesByCategory.get(cat.id) ?? [],
      }));
    }

    return categories
      .map((cat) => {
        const categoryNameMatches = cat.name.toLowerCase().includes(query);
        const catRoles = rolesByCategory.get(cat.id) ?? [];

        // If category name matches, show all its roles
        if (categoryNameMatches) {
          return { category: cat, roles: catRoles };
        }

        // Otherwise filter roles by name
        const matchingRoles = catRoles.filter((role) =>
          role.name.toLowerCase().includes(query)
        );

        return { category: cat, roles: matchingRoles };
      })
      .filter((entry) => entry.roles.length > 0);
  }, [categories, rolesByCategory, search]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="pr-4">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="pr-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-40 ml-4" />
              <Skeleton className="h-4 w-36 ml-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search field */}
      <div className="pt-4 pb-3 px-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un rôle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="pr-4 space-y-0.5">
          {filteredCategories.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucun résultat
            </div>
          ) : (
            filteredCategories.map(({ category, roles: catRoles }) => {
              const isCollapsed = collapsedCategories.has(category.id);

              return (
                <div key={category.id}>
                  {/* Category header */}
                  <div className="group flex items-center gap-1.5 w-full px-2 py-1.5 rounded text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-1.5 flex-1 min-w-0 h-auto p-0 justify-start"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      )}
                      <FolderTree className="h-4 w-4 shrink-0" />
                      <span className="truncate">{category.name}</span>
                      <span className="ml-auto text-xs tabular-nums">
                        {catRoles.length}
                      </span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditCategory(category)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchiveCategory(category)}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Roles under this category */}
                  {!isCollapsed && (
                    <div className="ml-4 space-y-0.5">
                      {catRoles.map((role) => {
                        const isSelected = selectedRoleId === role.id;
                        const isUnused = usedRoleIds && !usedRoleIds.has(role.id);

                        return (
                          <Button
                            key={role.id}
                            type="button"
                            variant="ghost"
                            onClick={() => onSelectRole(role)}
                            className={cn(
                              'flex items-center gap-2 w-full px-2 py-1.5 h-auto rounded text-sm transition-colors text-left justify-start',
                              isSelected
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted/50',
                              isUnused && !isSelected && 'opacity-50'
                            )}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: role.color || '#3b82f6' }}
                            />
                            <span className="truncate">{role.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Create role button */}
      <div className="shrink-0 p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onCreateRole}
        >
          <Plus className="h-4 w-4" />
          Nouveau rôle
        </Button>
      </div>
    </div>
  );
}
