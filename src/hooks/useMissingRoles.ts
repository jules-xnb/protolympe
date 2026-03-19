import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

interface WorkflowNode {
  id: string;
  node_type: string;
}

interface NodeRolePermission {
  role_id: string;
  can_edit: boolean;
}

interface RoleRow {
  id: string;
  name: string;
}

interface EoRow {
  id: string;
}

interface EoAssignment {
  user_id: string;
  eo_id: string;
}

interface RoleAssignment {
  user_id: string;
  role_id: string;
}

export function useMissingRoles(workflowId: string | undefined, clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.missingRoles.byWorkflow(workflowId!, clientId!),
    queryFn: async (): Promise<Map<string, string[]>> => {
      if (!workflowId || !clientId) return new Map();

      // 1. Get workflow with nodes
      const workflow = await api.get<{ nodes: WorkflowNode[] }>(`/api/workflows/${workflowId}`);
      const nodes = workflow.nodes || [];

      const formNode = nodes.find(n => n.node_type === 'form');
      if (!formNode) return new Map();

      // 2. Get required roles from node_role_permissions (can_edit on form node = respondent)
      const perms = await api.get<NodeRolePermission[]>(
        `/api/workflows/nodes/${formNode.id}/role-permissions`
      );

      const requiredRoleIds = [...new Set(
        (perms || []).filter(p => p.can_edit).map(p => p.role_id)
      )];
      if (requiredRoleIds.length === 0) return new Map();

      // 3. Get role names
      const roles = await api.get<RoleRow[]>(`/api/roles?client_id=${clientId}`);
      const roleNameMap = new Map(
        (roles || [])
          .filter(r => requiredRoleIds.includes(r.id))
          .map(r => [r.id, r.name])
      );

      // 4. Get all EOs for the client
      const eos = await api.get<EoRow[]>(
        `/api/organizational-entities?client_id=${clientId}&is_active=true`
      );

      const eoIds = (eos || []).map(e => e.id);
      if (eoIds.length === 0) return new Map();

      // 5. Get all user_eo_assignments for these EOs
      const eoAssignments = await api.get<EoAssignment[]>(
        `/api/client-users/eo-assignments?eo_ids=${eoIds.join(',')}&is_active=true`
      );

      // 6. Get all user_role_assignments for the required roles
      const userIds = [...new Set((eoAssignments || []).map(a => a.user_id))];

      let roleAssignments: RoleAssignment[] = [];
      if (userIds.length > 0) {
        roleAssignments = await api.post<RoleAssignment[]>('/api/roles/assignments/bulk-query', {
          user_ids: userIds,
          role_ids: requiredRoleIds,
          is_active: true,
        });
      }

      // 7. Build user->roles lookup
      const userRoles = new Map<string, Set<string>>();
      for (const ra of roleAssignments) {
        if (!userRoles.has(ra.user_id)) userRoles.set(ra.user_id, new Set());
        userRoles.get(ra.user_id)!.add(ra.role_id);
      }

      // 8. For each EO, find which required roles have no user covering them
      const eoUsers = new Map<string, string[]>();
      for (const ea of (eoAssignments || [])) {
        if (!eoUsers.has(ea.eo_id)) eoUsers.set(ea.eo_id, []);
        eoUsers.get(ea.eo_id)!.push(ea.user_id);
      }

      const missingByEo = new Map<string, string[]>();
      for (const eoId of eoIds) {
        const usersInEo = eoUsers.get(eoId) || [];
        const coveredRoles = new Set<string>();
        for (const userId of usersInEo) {
          const roles = userRoles.get(userId);
          if (roles) {
            for (const roleId of roles) coveredRoles.add(roleId);
          }
        }
        const missing = requiredRoleIds
          .filter(rid => !coveredRoles.has(rid))
          .map(rid => roleNameMap.get(rid) || rid);
        if (missing.length > 0) {
          missingByEo.set(eoId, missing);
        }
      }

      return missingByEo;
    },
    enabled: !!workflowId && !!clientId,
  });
}
