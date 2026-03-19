import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DetailsDrawer } from '@/components/ui/details-drawer';
import {
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useProfileTemplate,
  useProfileTemplateUsers,
  type ProfileTemplate,
} from '@/hooks/useProfileTemplates';
import {
  Pencil,
  Copy,
  Building2,
  Shield,
  Users,
  GitBranch,
  X,
} from 'lucide-react';
import { MODULE_CATALOG } from '@/lib/module-catalog';
import { api } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface ProfileTemplateDetailsDrawerProps {
  templateId: string | null;
  onClose: () => void;
  onEdit: (template: ProfileTemplate) => void;
  onDuplicate: (template: ProfileTemplate) => void;
}

export function ProfileTemplateDetailsDrawer({
  templateId,
  onClose,
  onEdit,
  onDuplicate,
}: ProfileTemplateDetailsDrawerProps) {
  const { data: template, isLoading } = useProfileTemplate(templateId ?? undefined);
  const { data: assignments = [] } = useProfileTemplateUsers(templateId ?? undefined);

  // Fetch user details for assignments
  const userIds = assignments.map(a => a.user_id);
  const { data: users = [] } = useQuery({
    queryKey: queryKeys.profileTemplates.userDetails(templateId!, userIds),
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const data = await api.get<Array<{ user_id: string; email: string; full_name: string | null }>>(
        `/api/client-users/details?user_ids=${userIds.join(',')}`
      );
      return data;
    },
    enabled: userIds.length > 0,
  });

  const userMap = new Map(users.map(u => [u.user_id, u]));

  return (
    <DetailsDrawer
      open={!!templateId}
      onOpenChange={(open) => { if (!open) onClose(); }}
      contentClassName="flex flex-col [&>button:last-child]:hidden"
      isLoading={isLoading || !template}
      customHeader={
        template ? (
          <SheetHeader>
            <div className="flex items-center justify-between gap-4">
              <SheetTitle className="text-lg">{template.name}</SheetTitle>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
                  Modifier
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDuplicate(template)}>
                  Dupliquer
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <SheetClose asChild>
                  <Button variant="ghost" size="sm" className="px-2">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground">{template.description}</p>
            )}
          </SheetHeader>
        ) : undefined
      }
    >
            {template && (
            <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
              <div className="space-y-5 pb-6">
                {/* EOs */}
                <section>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Entités Organisationnelles ({template.eos.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {template.eos.map(eo => (
                      <Chip key={eo.id} variant="outline" className="gap-1 text-xs">
                        {eo.eo_name}
                        {eo.include_descendants && (
                          <GitBranch className="h-3 w-3 text-primary" />
                        )}
                      </Chip>
                    ))}
                    {template.eos.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucune EO</p>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Rôles */}
                <section>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Rôles ({template.roles.length})
                  </h3>
                  {template.roles.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Aucun rôle</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(
                        template.roles.reduce<Record<string, typeof template.roles>>((acc, r) => {
                          const moduleLabel = MODULE_CATALOG[r.module_slug]?.label || r.module_slug;
                          (acc[moduleLabel] ??= []).push(r);
                          return acc;
                        }, {})
                      ).map(([moduleName, roles]) => (
                        <div key={moduleName}>
                          <p className="text-xs text-muted-foreground mb-1">{moduleName}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {roles.map(role => (
                              <Chip
                                key={role.id}
                                variant="outline"
                                className="gap-1 text-xs"
                                style={{
                                  backgroundColor: role.role_color ? `${role.role_color}15` : undefined,
                                  borderColor: role.role_color || undefined,
                                }}
                              >
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: role.role_color || '#6b7280' }}
                                />
                                {role.role_name}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />

                {/* Regroupements */}
                <section>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Regroupements ({template.groups.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {template.groups.map(group => (
                      <Chip key={group.group_id} variant="outline" className="text-xs">
                        {group.group_name}
                      </Chip>
                    ))}
                    {template.groups.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Aucun regroupement</p>
                    )}
                  </div>
                </section>

                <Separator />

                {/* Users assignés */}
                <section>
                  <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Utilisateurs assignés ({assignments.length})
                  </h3>
                  {assignments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Aucun utilisateur assigné à ce profil
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {assignments.map(assignment => {
                        const u = userMap.get(assignment.user_id);
                        return (
                          <div key={assignment.id} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{u?.full_name || '—'}</p>
                              <p className="text-xs text-muted-foreground truncate">{u?.email || assignment.user_id}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>
            )}
    </DetailsDrawer>
  );
}
