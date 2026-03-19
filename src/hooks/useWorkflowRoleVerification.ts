import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface NodeRoleRequirement {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  requiredRoleIds: string[];
}

export interface EoVerificationResult {
  eoId: string;
  eoName: string;
  eoCode: string | null;
  missingByNode: {
    nodeName: string;
    nodeType: string;
    missingRoles: string[];
  }[];
  isValid: boolean;
}

/**
 * Verify that each EO in `eoIds` has at least one user covering every
 * actionable workflow node.  `eoIds` should already be expanded
 * (i.e. descendants included when the target says so).
 */
export function useWorkflowRoleVerification(
  workflowId: string | undefined,
  clientId: string | undefined,
  eoIds: string[],
  enabled: boolean,
) {
  const sortedIds = [...eoIds].sort();

  return useQuery({
    queryKey: ['workflow_role_verification', workflowId, clientId, sortedIds],
    queryFn: async (): Promise<EoVerificationResult[]> => {
      if (!workflowId || !clientId || eoIds.length === 0) return [];

      const results = await api.post<EoVerificationResult[]>(
        `/api/workflows/${workflowId}/role-verification`,
        { client_id: clientId, eo_ids: eoIds }
      );

      return results || [];
    },
    enabled: enabled && !!workflowId && !!clientId && eoIds.length > 0,
  });
}
