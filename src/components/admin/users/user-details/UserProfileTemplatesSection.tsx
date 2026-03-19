import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { type ProfileTemplate } from '@/hooks/useProfileTemplates';
import {
  UserCog,
  Building2,
  Shield,
  Layers,
  Plus,
  X,
  GitBranch,
} from 'lucide-react';

interface UserProfileTemplatesSectionProps {
  assignedTemplates: ProfileTemplate[];
  onAssignClick: () => void;
  onUnassignClick: (template: ProfileTemplate) => void;
}

export function UserProfileTemplatesSection({
  assignedTemplates,
  onAssignClick,
  onUnassignClick,
}: UserProfileTemplatesSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Profils assignés</h4>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAssignClick}
        >
          Assigner
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {assignedTemplates.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
          <UserCog className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucun profil assigné</p>
          <p className="text-xs mt-1">Assignez un profil pour définir les accès</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignedTemplates.map(template => (
            <div
              key={template.id}
              className="p-3 rounded-lg border bg-card space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm truncate">
                    {template.name}
                  </span>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {template.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onUnassignClick(template)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* EOs */}
              <div className="flex items-start gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {template.eos.slice(0, 2).map(eo => (
                    <Chip key={eo.eo_id} variant="outline" className="text-xs gap-1">
                      {eo.eo_name}
                      {eo.include_descendants && (
                        <GitBranch className="h-3 w-3 text-primary" />
                      )}
                    </Chip>
                  ))}
                  {template.eos.length > 2 && (
                    <Chip variant="outline" className="text-xs">
                      +{template.eos.length - 2}
                    </Chip>
                  )}
                </div>
              </div>

              {/* Roles */}
              <div className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {template.roles.slice(0, 2).map(role => (
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
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: role.role_color || '#6b7280' }}
                      />
                      {role.role_name}
                    </Chip>
                  ))}
                  {template.roles.length > 2 && (
                    <Chip variant="outline" className="text-xs">
                      +{template.roles.length - 2}
                    </Chip>
                  )}
                </div>
              </div>

              {/* Groups */}
              {template.groups.length > 0 && (
                <div className="flex items-start gap-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {template.groups.slice(0, 2).map(group => (
                      <Chip key={group.group_id} variant="outline" className="text-xs">
                        {group.group_name}
                      </Chip>
                    ))}
                    {template.groups.length > 2 && (
                      <Chip variant="outline" className="text-xs">
                        +{template.groups.length - 2}
                      </Chip>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Chaque profil définit un contexte d'accès (entités + rôles) que l'utilisateur peut activer.
      </p>
    </div>
  );
}
