import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  UserCog,
  Users,
  Building2,
  Shield,
  Play,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { resolveEoIdsWithDescendants } from '@/lib/eo/eo-resolution';
import { useViewMode } from '@/contexts/ViewModeContext';
import {
  useProfileTemplates,
} from '@/hooks/useProfileTemplates';
import { useT } from '@/hooks/useT';

export default function ProfileManagementPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const cp = useClientPath();
  const {
    selectedClient,
    setActiveProfile,
    switchToUserFinalMode,
  } = useViewMode();

  const { data: allTemplates = [], isLoading } = useProfileTemplates(selectedClient?.id);
  const templates = allTemplates.filter(t => t.is_active);

  const handleActivate = async (template: (typeof templates)[0]) => {
    // Collect direct EOs
    const directEos = template.eos.map(e => ({ eo_id: e.eo_id, include_descendants: e.include_descendants }));

    // Collect EOs from groups
    const groupIds = (template.groups || []).map(g => g.group_id);
    let groupEos: Array<{ eo_id: string; include_descendants: boolean }> = [];
    if (groupIds.length > 0) {
      const members = await api.post<Array<{ eo_id: string; include_descendants: boolean }>>('/api/organizational-entities/group-members', { group_ids: groupIds });
      groupEos = (members || []).map(m => ({
        eo_id: m.eo_id,
        include_descendants: m.include_descendants ?? false,
      }));
    }

    // Combine and resolve descendants
    const allRawEos = [...directEos, ...groupEos];
    const resolvedEoIds = await resolveEoIdsWithDescendants(allRawEos);

    const activeProfileData = {
      id: template.id,
      name: template.name,
      eoIds: resolvedEoIds,
      roleIds: template.roles.map(r => r.role_id),
    };
    setActiveProfile(activeProfileData);
    switchToUserFinalMode();
    navigate(cp(CLIENT_ROUTES.USER_HOME));
  };

  if (!selectedClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('views.select_client')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('labels.my_profiles')}
        backAction={{ onClick: () => navigate(-1) }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('buttons.loading')}</p>
        </div>
      ) : templates.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={t('empty.no_profiles')}
            description={t('empty.no_profiles_description')}
            action={
              <Button variant="outline" size="sm" onClick={() => navigate(cp(CLIENT_ROUTES.PROFILES))}>
                {t('views.create_profiles')} <UserCog className="h-4 w-4" />
              </Button>
            }
          />
      ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="relative transition-all hover:shadow-md rounded-none"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {template.eos.length} {t('views.entities')} · {template.roles.length} {t('views.roles')}{template.groups && template.groups.length > 0 ? ` · ${template.groups.length} ${t('views.groups')}` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* EOs */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {t('views.entities')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.eos.slice(0, 3).map((eo) => (
                        <Chip key={eo.eo_id} variant="outline" className="text-xs gap-1">
                          {eo.eo_name}
                          {eo.include_descendants && (
                            <span className="text-xs text-primary font-medium">↓</span>
                          )}
                        </Chip>
                      ))}
                      {template.eos.length > 3 && (
                        <Chip variant="outline" className="text-xs">
                          +{template.eos.length - 3}
                        </Chip>
                      )}
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      {t('views.roles')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.roles.slice(0, 3).map((role) => (
                        <Chip
                          key={role.role_id}
                          variant="outline"
                          className="text-xs gap-1"
                          style={{
                            borderColor: role.role_color || undefined,
                            backgroundColor: role.role_color ? `${role.role_color}10` : undefined,
                          }}
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: role.role_color || '#6b7280' }}
                          />
                          {role.role_category_name ? `${role.role_category_name}: ` : ''}{role.role_name}
                        </Chip>
                      ))}
                      {template.roles.length > 3 && (
                        <Chip variant="outline" className="text-xs">
                          +{template.roles.length - 3}
                        </Chip>
                      )}
                    </div>
                  </div>

                  {/* Groups */}
                  {template.groups && template.groups.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {t('views.groups')}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.groups.slice(0, 3).map((group) => (
                          <Chip
                            key={group.group_id}
                            variant="outline"
                            className="text-xs gap-1"
                          >
                            {group.group_name}
                          </Chip>
                        ))}
                        {template.groups.length > 3 && (
                          <Chip variant="outline" className="text-xs">
                            +{template.groups.length - 3}
                          </Chip>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Activate button */}
                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleActivate(template)}
                    >
                      {t('views.activate')}
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
      )}
    </div>
  );
}
