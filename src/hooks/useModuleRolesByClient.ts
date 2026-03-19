import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { MODULE_CATALOG } from '@/lib/module-catalog';
import type { ModuleRole } from '@/hooks/useModuleRoles';

export interface ModuleRoleWithModule extends ModuleRole {
  module_slug: string;
}

export interface ModuleWithRoles {
  moduleSlug: string;
  moduleLabel: string;
  moduleIcon: string;
  roles: ModuleRoleWithModule[];
}

export function useModuleRolesByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['module_roles_by_client', clientId],
    queryFn: async (): Promise<ModuleRoleWithModule[]> => {
      if (!clientId) return [];
      return api.get<ModuleRoleWithModule[]>(`/api/module-roles/by-client?client_id=${clientId}`);
    },
    enabled: !!clientId,
  });
}

/** Group flat module roles into modules for UI display */
export function groupRolesByModule(roles: ModuleRoleWithModule[]): ModuleWithRoles[] {
  const moduleMap = new Map<string, ModuleRoleWithModule[]>();
  for (const role of roles) {
    const list = moduleMap.get(role.module_slug) ?? [];
    list.push(role);
    moduleMap.set(role.module_slug, list);
  }

  return Array.from(moduleMap.entries()).map(([slug, moduleRoles]) => {
    const catalog = MODULE_CATALOG[slug];
    return {
      moduleSlug: slug,
      moduleLabel: catalog?.label ?? slug,
      moduleIcon: catalog?.icon ?? 'Box',
      roles: moduleRoles,
    };
  });
}
