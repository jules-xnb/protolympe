import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, FolderOpen } from 'lucide-react';
import type { InheritedRole } from './block-config/BlockConfigPanel';
import { MODULE_CATALOG } from '@/lib/module-catalog';

interface RoleSelectorWithCategoriesProps {
  roles: InheritedRole[];
  selectedRoles: string[];
  onSelectionChange: (roles: string[]) => void;
  maxHeight?: string;
  noBorder?: boolean;
}

interface RoleWithModule extends InheritedRole {
  module_slug?: string;
}

export function RoleSelectorWithCategories({
  roles,
  selectedRoles,
  onSelectionChange,
  maxHeight = 'h-64',
  noBorder = false,
}: RoleSelectorWithCategoriesProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Group roles by module_slug (from the role data) or put in "other" group
  const groupedRoles = useMemo(() => {
    const groups: { moduleSlug: string; moduleLabel: string; roles: RoleWithModule[] }[] = [];
    const moduleMap = new Map<string, RoleWithModule[]>();

    for (const role of roles as RoleWithModule[]) {
      const slug = role.module_slug || '__other__';
      const list = moduleMap.get(slug) ?? [];
      list.push(role);
      moduleMap.set(slug, list);
    }

    for (const [slug, moduleRoles] of moduleMap) {
      const catalog = slug !== '__other__' ? MODULE_CATALOG[slug] : undefined;
      groups.push({
        moduleSlug: slug,
        moduleLabel: catalog?.label ?? (slug === '__other__' ? 'Autres' : slug),
        roles: moduleRoles,
      });
    }

    return groups;
  }, [roles]);

  // Expand all modules by default when they load
  useEffect(() => {
    if (groupedRoles.length > 0) {
      setExpandedModules(new Set(groupedRoles.map(g => g.moduleSlug)));
    }
  }, [groupedRoles]);

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRoles, roleId]);
    } else {
      onSelectionChange(selectedRoles.filter(id => id !== roleId));
    }
  };

  const handleModuleToggle = (moduleSlug: string, checked: boolean) => {
    const rolesInModule = (roles as RoleWithModule[]).filter(r =>
      moduleSlug === '__other__' ? !r.module_slug : r.module_slug === moduleSlug
    );
    const roleIds = rolesInModule.map(r => r.id);

    if (checked) {
      onSelectionChange([...new Set([...selectedRoles, ...roleIds])]);
    } else {
      onSelectionChange(selectedRoles.filter(id => !roleIds.includes(id)));
    }
  };

  const toggleModule = (moduleSlug: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleSlug)) {
        next.delete(moduleSlug);
      } else {
        next.add(moduleSlug);
      }
      return next;
    });
  };

  const getModuleSelectionState = (moduleSlug: string) => {
    const rolesInModule = (roles as RoleWithModule[]).filter(r =>
      moduleSlug === '__other__' ? !r.module_slug : r.module_slug === moduleSlug
    );
    const selectedCount = rolesInModule.filter(r => selectedRoles.includes(r.id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === rolesInModule.length) return 'all';
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
          {groupedRoles.map(({ moduleSlug, moduleLabel, roles: moduleRoles }) => {
            const isExpanded = expandedModules.has(moduleSlug);
            const selectionState = getModuleSelectionState(moduleSlug);

            return (
              <div key={moduleSlug} className="space-y-1">
                <Collapsible open={isExpanded} onOpenChange={() => toggleModule(moduleSlug)}>
                  <div className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={selectionState === 'all'}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = selectionState === 'partial';
                        }
                      }}
                      onCheckedChange={(checked) =>
                        handleModuleToggle(moduleSlug, !!checked)
                      }
                    />
                    <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 hover:bg-muted/50 rounded px-1 -ml-1">
                      {isExpanded ? (
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{moduleLabel}</span>
                      <Chip variant="default" className="ml-auto text-xs">
                        {moduleRoles.filter(r => selectedRoles.includes(r.id)).length}/{moduleRoles.length}
                      </Chip>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-6 space-y-1 border-l pl-3">
                      {moduleRoles.map(role => (
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
