import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Eye,
  Plus,
  PenLine,
  Trash2,
  User,
  Check,
  X,
  AlertTriangle,
  EyeOff,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { useComputedViewPermissions } from '@/hooks/useViewPermissions';
import type { ViewConfig } from '@/hooks/useViewConfigs';
import { queryKeys } from '@/lib/query-keys';

interface UserSimulationPanelProps {
  viewConfig: ViewConfig;
}

type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
};

export function UserSimulationPanel({ viewConfig }: UserSimulationPanelProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch users for the current client
  const { data: users = [], isLoading: _isLoadingUsers } = useQuery<UserProfile[]>({
    queryKey: queryKeys.usersForSimulation.byClient(viewConfig.client_id),
    queryFn: async () => {
      if (!viewConfig.client_id) return [];

      const data = await api.get<UserProfile[]>(
        `/api/clients/${viewConfig.client_id}/users`
      );

      return data ?? [];
    },
    enabled: !!viewConfig.client_id,
  });

  // Fetch computed permissions for selected user
  const {
    data: permissions,
    isLoading: isLoadingPermissions,
    refetch: refetchPermissions,
  } = useComputedViewPermissions(viewConfig.id, selectedUserId || undefined);

  // Fetch user's roles
  const { data: userRoles = [] } = useQuery({
    queryKey: queryKeys.usersForSimulation.roles(selectedUserId!),
    queryFn: async () => {
      if (!selectedUserId) return [];

      const data = await api.get<{
        role_id: string;
        eo_id: string | null;
        roles: { id: string; name: string; color: string | null; category_id: string | null } | null;
        organizational_entities: { id: string; name: string; code: string } | null;
      }[]>(
        `/api/users/${selectedUserId}/role-assignments`
      );

      return data || [];
    },
    enabled: !!selectedUserId,
  });

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const PermissionIndicator = ({ allowed, label }: { allowed: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {allowed ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <X className="h-4 w-4 text-destructive" />
      )}
      <span className={allowed ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  const fieldOverridesCount = Object.keys(permissions?.field_overrides || {}).length;
  const hiddenFields = Object.entries(permissions?.field_overrides || {}).filter(
    ([_, v]) => v.hidden
  ).length;
  const readonlyFields = Object.entries(permissions?.field_overrides || {}).filter(
    ([_, v]) => v.readonly && !v.hidden
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Simulation utilisateur
        </CardTitle>
        <CardDescription>
          Prévisualisez les permissions effectives pour un utilisateur spécifique
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Selection */}
        <div className="flex items-center gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sélectionner un utilisateur..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex flex-col">
                    <span>{user.full_name || user.email}</span>
                    {user.full_name && (
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUserId && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchPermissions()}
              disabled={isLoadingPermissions}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingPermissions ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {!selectedUserId ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez un utilisateur pour voir ses permissions</p>
          </div>
        ) : isLoadingPermissions ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
            <p>Calcul des permissions...</p>
          </div>
        ) : (
          <>
            {/* User Info */}
            {selectedUser && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{selectedUser.full_name || selectedUser.email}</p>
                {selectedUser.full_name && (
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                )}
              </div>
            )}

            {/* User Roles */}
            {userRoles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Rôles assignés :</p>
                <div className="flex flex-wrap gap-2">
                  {userRoles.map((assignment, index) => (
                    <Chip
                      key={index}
                      variant="outline"
                      style={{
                        borderColor: assignment.roles?.color || undefined,
                        color: assignment.roles?.color || undefined,
                      }}
                    >
                      {assignment.roles?.name || 'Rôle inconnu'}
                      {assignment.organizational_entities && (
                        <span className="ml-1 text-muted-foreground">
                          @ {assignment.organizational_entities.code}
                        </span>
                      )}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Computed Permissions */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Permissions calculées :</p>

              {!permissions?.can_view ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Accès refusé</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Cet utilisateur n'a pas accès à cette vue.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <PermissionIndicator allowed={permissions.can_view} label="Voir" />
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <PermissionIndicator allowed={permissions.can_create} label="Créer" />
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <PenLine className="h-5 w-5 text-muted-foreground" />
                    <PermissionIndicator allowed={permissions.can_edit} label="Éditer" />
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Trash2 className="h-5 w-5 text-muted-foreground" />
                    <PermissionIndicator allowed={permissions.can_delete} label="Supprimer" />
                  </div>
                </div>
              )}
            </div>

            {/* Field Overrides Summary */}
            {fieldOverridesCount > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Restrictions sur les champs :</p>
                  <div className="flex gap-4">
                    {hiddenFields > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                        <span>{hiddenFields} champ(s) masqué(s)</span>
                      </div>
                    )}
                    {readonlyFields > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span>{readonlyFields} champ(s) en lecture seule</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
