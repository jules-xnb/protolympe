import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useModulePermissions, useUpdateModulePermissions } from '@/hooks/useModulePermissions';
import { useClientModule } from '@/hooks/useModules';
import { PermissionsMatrix } from '@/components/admin/modules/PermissionsMatrix';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useViewMode } from '@/contexts/ViewModeContext';
import { NODE_TYPES } from '@/lib/constants';

/** Fetch all validation nodes across all workflows for the current client */
function useValidationNodes(enabled: boolean) {
  const { selectedClient } = useViewMode();

  return useQuery({
    queryKey: ['validation_nodes', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];

      return api.get<Array<{ id: string; name: string; workflowName: string; workflowId: string }>>(
        `/api/workflows/validation-nodes?client_id=${selectedClient.id}`
      );
    },
    enabled: enabled && !!selectedClient?.id,
  });
}

export default function ModulePermissionsPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { data: clientModule } = useClientModule(moduleId);
  const { data, isLoading } = useModulePermissions(moduleId);
  const updatePermissions = useUpdateModulePermissions();
  const [localGrants, setLocalGrants] = useState<Record<string, Record<string, boolean>>>({});

  const isCollecte = clientModule?.module_slug === 'collecte_valeur';
  const { data: validationNodes = [], isLoading: nodesLoading } = useValidationNodes(isCollecte);

  // Build full permission list: catalog + dynamic per-node
  const allPermissions = useMemo(() => {
    const catalogPerms = data?.permissions || [];
    if (!isCollecte || validationNodes.length === 0) return catalogPerms;

    const dynamicPerms: { slug: string; label: string }[] = [];
    for (const node of validationNodes) {
      dynamicPerms.push({
        slug: `${node.id}_read`,
        label: `${node.name} — lecture`,
      });
      dynamicPerms.push({
        slug: `${node.id}_validate`,
        label: `${node.name} — validation`,
      });
    }

    return [...catalogPerms, ...dynamicPerms];
  }, [data?.permissions, isCollecte, validationNodes]);

  // Merge server grants with local overrides
  const mergedGrants = { ...data?.grants, ...localGrants };

  const handleToggle = useCallback((permSlug: string, roleId: string, granted: boolean) => {
    setLocalGrants(prev => ({
      ...prev,
      [permSlug]: { ...prev[permSlug], ...data?.grants?.[permSlug], [roleId]: granted },
    }));

    if (!moduleId) return;
    const newGrants = { ...data?.grants };
    if (!newGrants[permSlug]) newGrants[permSlug] = {};
    newGrants[permSlug][roleId] = granted;

    for (const [pSlug, roleMap] of Object.entries(localGrants)) {
      if (!newGrants[pSlug]) newGrants[pSlug] = {};
      Object.assign(newGrants[pSlug], roleMap);
    }
    newGrants[permSlug][roleId] = granted;

    updatePermissions.mutate(
      { module_id: moduleId, grants: newGrants },
      { onSuccess: () => setLocalGrants({}) }
    );
  }, [moduleId, data?.grants, localGrants, updatePermissions]);

  if (isLoading || nodesLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // Split permissions into groups for collecte_valeur
  if (isCollecte) {
    const catalogPerms = data?.permissions || [];
    const actionPerms = catalogPerms.filter(p =>
      ['create_campaign', 'edit_campaign', 'delete_campaign', 'export', 'import', 'edit_form'].includes(p.slug)
    );
    const workflowStaticPerms = catalogPerms.filter(p =>
      ['respond', 'read_respondent', 'read_validated'].includes(p.slug)
    );
    const dynamicPerms = allPermissions.filter(p =>
      p.slug.endsWith('_read') || p.slug.endsWith('_validate')
    ).filter(p => !catalogPerms.some(cp => cp.slug === p.slug));

    return (
      <div className="py-6 space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Actions</Label>
          <PermissionsMatrix
            permissions={actionPerms}
            roles={data?.roles || []}
            grants={mergedGrants}
            onToggle={handleToggle}
            disabled={updatePermissions.isPending}
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase">Workflow</Label>
          <PermissionsMatrix
            permissions={workflowStaticPerms}
            roles={data?.roles || []}
            grants={mergedGrants}
            onToggle={handleToggle}
            disabled={updatePermissions.isPending}
          />
        </div>

        {dynamicPerms.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase">
                Étapes de validation
              </Label>
              <p className="text-xs text-muted-foreground">
                Permissions générées automatiquement à partir des nœuds de validation des workflows.
              </p>
              <PermissionsMatrix
                permissions={dynamicPerms}
                roles={data?.roles || []}
                grants={mergedGrants}
                onToggle={handleToggle}
                disabled={updatePermissions.isPending}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  // Default: single matrix for other modules
  return (
    <div className="py-6 space-y-6">
      <PermissionsMatrix
        permissions={allPermissions}
        roles={data?.roles || []}
        grants={mergedGrants}
        onToggle={handleToggle}
        disabled={updatePermissions.isPending}
      />
    </div>
  );
}
