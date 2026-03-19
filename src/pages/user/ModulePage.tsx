import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useClientModule } from '@/hooks/useModules';
import { useModuleDisplayConfigs } from '@/hooks/useModuleDisplayConfigs';
import { useModulePermissions } from '@/hooks/useModulePermissions';
import { useModuleRoles } from '@/hooks/useModuleRoles';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { getModuleCatalog } from '@/lib/module-catalog';
import {
  mergeWithDefaults,
  type DisplayConfigData,
} from '@/lib/module-display-fields';
import { UsersBlockView } from '@/components/user/views/UsersBlockView';
import { ProfilesBlockView } from '@/components/user/views/ProfilesBlockView';
import { SurveyCreatorView } from '@/components/user/views/SurveyCreatorView';
import { SurveyResponsesView } from '@/components/user/views/SurveyResponsesView';
import { Loader2 } from 'lucide-react';
import type { UsersBlockConfig } from '@/types/builder-types';
import type { PageBlock } from '@/components/builder/page-builder/types';

/**
 * Front Office module page.
 * Resolves module permissions + display config, then renders
 * the appropriate block view component.
 */
export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { data: clientModule, isLoading: moduleLoading } = useClientModule(moduleId);
  const { data: displayConfigs, isLoading: displayLoading } = useModuleDisplayConfigs(moduleId);
  const { data: permData, isLoading: permLoading } = useModulePermissions(moduleId);
  const { data: moduleRoles } = useModuleRoles(moduleId);
  const { data: permContext } = useUserPermissions();

  const moduleSlug = clientModule?.module_slug;
  const catalog = moduleSlug ? getModuleCatalog(moduleSlug) : undefined;

  // Resolve which display config applies to this user based on their roles
  const displayConfig = useMemo<DisplayConfigData>(() => {
    if (!displayConfigs?.length || !moduleSlug) return {};

    // Find display config matching user's module roles
    const userModuleRoleIds = resolveUserModuleRoleIds(permContext, moduleRoles);

    // Find a config that matches at least one user role
    const matching = displayConfigs.find((dc) => {
      if (!dc.role_ids?.length) return true; // no role restriction = applies to all
      return dc.role_ids.some((rid) => userModuleRoleIds.has(rid));
    });

    // Fallback to first config if none matches
    const config = matching ?? displayConfigs[0];
    if (!config) return {};

    return mergeWithDefaults(config.config, moduleSlug);
  }, [displayConfigs, moduleSlug, permContext, moduleRoles]);

  // Resolve effective permissions (OR across user's module roles)
  const effectivePermissions = useMemo(() => {
    if (!permData?.grants || !permContext || !moduleRoles) return new Set<string>();

    const userModuleRoleIds = resolveUserModuleRoleIds(permContext, moduleRoles);
    const granted = new Set<string>();

    for (const [permSlug, roleGrants] of Object.entries(permData.grants)) {
      for (const [roleId, isGranted] of Object.entries(roleGrants)) {
        if (isGranted && userModuleRoleIds.has(roleId)) {
          granted.add(permSlug);
          break;
        }
      }
    }

    return granted;
  }, [permData, permContext, moduleRoles]);

  const hasPermission = (slug: string) => effectivePermissions.has(slug);

  const isLoading = moduleLoading || displayLoading || permLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clientModule || !catalog) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Module introuvable.</p>
      </div>
    );
  }

  // ---- Render per module slug ----

  if (moduleSlug === 'user') {
    const config: UsersBlockConfig = {
      enable_create: hasPermission('create_user'),
      enable_edit: hasPermission('edit_user'),
      enable_edit_profile: hasPermission('edit_user_profile'),
      enable_activate_deactivate: hasPermission('activate_deactivate'),
      enable_archive: hasPermission('archive_user'),
      enable_import: hasPermission('import'),
      enable_export: hasPermission('export'),
      enable_history: hasPermission('view_history'),
      enable_filters: (displayConfig.filters?.length ?? 0) > 0,
      anonymization: displayConfig.anonymization?.map((a) => ({
        field: a.field,
        hidden_for_profiles: [],
      })),
    };
    const block = { id: 'module-user', type: 'users', config, position: { colSpan: 12 }, isActive: true } as unknown as PageBlock;
    return <UsersBlockView block={block} />;
  }

  if (moduleSlug === 'profils') {
    const config = {
      enable_create: hasPermission('create_profile'),
      enable_edit: hasPermission('edit_profile'),
      enable_duplicate: hasPermission('duplicate_profile'),
      enable_delete: hasPermission('archive_profile'),
      enable_import: hasPermission('import'),
      enable_export: hasPermission('export'),
      columns: displayConfig.list_columns
        ?.filter((c) => c.visible)
        .map((c) => ({ field_id: c.field_id, field_name: c.field_name })),
    };
    const block = { id: 'module-profils', type: 'profiles', config, position: { colSpan: 12 }, isActive: true } as unknown as PageBlock;
    return <ProfilesBlockView block={block} />;
  }

  if (moduleSlug === 'collecte_valeur') {
    const isGestionnaire = hasPermission('create_campaign') || hasPermission('edit_campaign') || hasPermission('view_responses');
    const isRepondant = hasPermission('respond');

    return (
      <div className="space-y-6">
        {isGestionnaire && (
          <SurveyCreatorView
            block={{
              id: 'module-collecte-creator',
              type: 'survey_creator',
              config: {
                allow_form_edit: hasPermission('edit_form'),
                allow_import: hasPermission('import'),
                allow_export: hasPermission('export'),
                show_all_surveys: displayConfig.gestionnaire?.show_all_surveys ?? true,
                show_my_surveys: displayConfig.gestionnaire?.show_my_surveys ?? true,
                group_by_status: displayConfig.gestionnaire?.group_by_status ?? false,
                columns_visible: displayConfig.gestionnaire?.columns_visible,
                enable_validation_workflow: displayConfig.gestionnaire?.enable_validation_workflow ?? false,
                full_page: displayConfig.gestionnaire?.full_page ?? false,
              },
              position: { colSpan: 12 },
              isActive: true,
            } as unknown as PageBlock}
          />
        )}
        {isRepondant && (
          <SurveyResponsesView
            block={{
              id: 'module-collecte-responses',
              type: 'survey_responses',
              config: {
                enable_import: hasPermission('import'),
                enable_export: hasPermission('export'),
                show_pending: displayConfig.repondant?.show_pending ?? true,
                show_submitted: displayConfig.repondant?.show_submitted ?? false,
                show_validated: displayConfig.repondant?.show_validated ?? false,
                show_rejected: displayConfig.repondant?.show_rejected ?? true,
                group_by_campaign: displayConfig.repondant?.group_by_campaign ?? false,
                show_deadline: displayConfig.repondant?.show_deadline ?? true,
                show_progress: displayConfig.repondant?.show_progress ?? true,
                allow_draft: displayConfig.repondant?.allow_draft ?? true,
                show_validation_queue: displayConfig.repondant?.show_validation_queue ?? false,
                enable_history: displayConfig.repondant?.enable_history ?? false,
                full_page: displayConfig.repondant?.full_page ?? false,
              },
              position: { colSpan: 12 },
              isActive: true,
            } as unknown as PageBlock}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-muted-foreground">Module "{catalog.label}" — pas encore implémenté.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve which module_role IDs the current user has.
 * This is a simplified mapping: we match user's global role names
 * to module role names (case-insensitive).
 */
function resolveUserModuleRoleIds(
  permContext: { roleIds: string[]; roles: { role_id: string; role_name?: string; category_id?: string }[] } | undefined,
  moduleRoles: { id: string; name: string }[] | undefined,
): Set<string> {
  if (!permContext || !moduleRoles) return new Set();

  // For now, match by role name (module roles are manually assigned)
  // In a full implementation, there would be a user_module_role_assignments table
  const userRoleNames = new Set(permContext.roles.map((r) => (r.role_name ?? '').toLowerCase()));
  const matched = new Set<string>();

  for (const mr of moduleRoles) {
    if (userRoleNames.has(mr.name.toLowerCase())) {
      matched.add(mr.id);
    }
  }

  return matched;
}
