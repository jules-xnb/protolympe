import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { InheritedRole } from './block-config/BlockConfigPanel';
import { queryKeys } from '@/lib/query-keys';

interface RoleCategory {
  id: string;
  name: string;
  display_order: number;
}

interface RoleSelectorWithCategoriesProps {
  roles: InheritedRole[];
  selectedRoles: string[];
  onSelectionChange: (roles: string[]) => void;
  maxHeight?: string;
  noBorder?: boolean;
}

export function RoleSelectorWithCategories({
  roles,
  selectedRoles,
  onSelectionChange,
  maxHeight = 'h-64',
  noBorder = false,
}: RoleSelectorWithCategoriesProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Fetch role categories
  const categoryIds = useMemo(() => 
    [...new Set(roles.map(r => r.category_id).filter(Boolean))] as string[],
    [roles]
  );

  const { data: categories = [] } = useQuery<RoleCategory[]>({
    queryKey: queryKeys.roleCategories.selector(categoryIds),
    queryFn: async () => {
      if (categoryIds.length === 0) return [];
      const data = await api.get<RoleCategory[]>(
        `/api/roles/categories?ids=${categoryIds.join(',')}`
      );
      return data ?? [];
    },
    enabled: categoryIds.length > 0,
  });

  // Group roles by category
  const groupedRoles = useMemo(() => {
    const groups: { category: RoleCategory | null; roles: InheritedRole[] }[] = [];
    
    // Add categorized roles
    categories.forEach(cat => {
      const rolesInCategory = roles.filter(r => r.category_id === cat.id);
      if (rolesInCategory.length > 0) {
        groups.push({ category: cat, roles: rolesInCategory });
      }
    });
    
    // Add uncategorized roles
    const uncategorized = roles.filter(r => !r.category_id);
    if (uncategorized.length > 0) {
      groups.push({ category: null, roles: uncategorized });
    }
    
    return groups;
  }, [roles, categories]);

  // Expand all categories by default when they load
  useEffect(() => {
    if (categories.length > 0) {
      setExpandedCategories(new Set(categories.map(c => c.id)));
    }
  }, [categories]);

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRoles, roleId]);
    } else {
      onSelectionChange(selectedRoles.filter(id => id !== roleId));
    }
  };

  const handleCategoryToggle = (categoryId: string | null, checked: boolean) => {
    const rolesInCategory = roles.filter(r => 
      categoryId ? r.category_id === categoryId : !r.category_id
    );
    const roleIds = rolesInCategory.map(r => r.id);
    
    if (checked) {
      onSelectionChange([...new Set([...selectedRoles, ...roleIds])]);
    } else {
      onSelectionChange(selectedRoles.filter(id => !roleIds.includes(id)));
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getCategorySelectionState = (categoryId: string | null) => {
    const rolesInCategory = roles.filter(r => 
      categoryId ? r.category_id === categoryId : !r.category_id
    );
    const selectedCount = rolesInCategory.filter(r => selectedRoles.includes(r.id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === rolesInCategory.length) return 'all';
    return 'partial';
  };

  // Convert Tailwind height class to pixel value for proper scroll behavior
  const heightPx = maxHeight === 'h-56' ? 224 : maxHeight === 'h-64' ? 256 : maxHeight === 'h-72' ? 288 : maxHeight === 'h-80' ? 320 : 256;

  if (roles.length === 0) {
    return (
      <div 
        className={noBorder ? 'p-3' : 'border rounded-md p-3'} 
        style={{ height: `${heightPx}px` }}
      >
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun rôle disponible
        </p>
      </div>
    );
  }

  return (
    <div 
      className={noBorder ? '' : 'border rounded-md'} 
      style={{ height: `${heightPx}px` }}
    >
      <div className="h-full overflow-y-auto p-3">
        <div className="space-y-2">
          {groupedRoles.map(({ category, roles: categoryRoles }) => {
            const categoryKey = category?.id || 'uncategorized';
            const isExpanded = category ? expandedCategories.has(category.id) : true;
            const selectionState = getCategorySelectionState(category?.id || null);
            
            return (
              <div key={categoryKey} className="space-y-1">
                {category ? (
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                    <div className="flex items-center gap-2 py-1">
                      <Checkbox
                        checked={selectionState === 'all'}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = selectionState === 'partial';
                          }
                        }}
                        onCheckedChange={(checked) => 
                          handleCategoryToggle(category.id, !!checked)
                        }
                      />
                      <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 hover:bg-muted/50 rounded px-1 -ml-1">
                        {isExpanded ? (
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{category.name}</span>
                        <Chip variant="default" className="ml-auto text-xs">
                          {categoryRoles.filter(r => selectedRoles.includes(r.id)).length}/{categoryRoles.length}
                        </Chip>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="ml-6 space-y-1 border-l pl-3">
                        {categoryRoles.map(role => (
                          <div key={role.id} className="flex items-center space-x-2 py-0.5">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={selectedRoles.includes(role.id)}
                              onCheckedChange={(checked) => 
                                handleRoleToggle(role.id, !!checked)
                              }
                            />
                            <label
                              htmlFor={`role-${role.id}`}
                              className="text-sm font-normal flex items-center gap-2 cursor-pointer flex-1"
                            >
                              {role.color && (
                                <div 
                                  className="w-2 h-2 rounded-full shrink-0" 
                                  style={{ backgroundColor: role.color }}
                                />
                              )}
                              {role.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  // Uncategorized roles - show directly
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase py-1">
                      Sans catégorie
                    </div>
                    {categoryRoles.map(role => (
                      <div key={role.id} className="flex items-center space-x-2 py-0.5">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoles.includes(role.id)}
                          onCheckedChange={(checked) => 
                            handleRoleToggle(role.id, !!checked)
                          }
                        />
                        <label
                          htmlFor={`role-${role.id}`}
                          className="text-sm font-normal flex items-center gap-2 cursor-pointer flex-1"
                        >
                          {role.color && (
                            <div 
                              className="w-2 h-2 rounded-full shrink-0" 
                              style={{ backgroundColor: role.color }}
                            />
                          )}
                          {role.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
