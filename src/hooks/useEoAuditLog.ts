import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { queryKeys } from '@/lib/query-keys';

/** Shape of a changed field entry in the audit log */
interface ChangedFieldEntry {
  old: unknown;
  new: unknown;
  field_name?: string;
}

export interface EoAuditLogEntry {
  id: string;
  entity_id: string;
  action: string;
  changed_fields: Record<string, ChangedFieldEntry>;
  snapshot: Record<string, unknown>;
  changed_by: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
}

export function useEoAuditLog(entityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.eoAuditLog.byEntity(entityId!),
    enabled: !!entityId,
    queryFn: async () => {
      return await api.get<EoAuditLogEntry[]>(
        `/api/organizational-entities/${entityId!}/audit`
      );
    },
  });
}

export function useRestoreEoSnapshot() {
  return useMutationWithToast({
    mutationFn: async ({ entityId, snapshot }: { entityId: string; snapshot: Record<string, unknown> }) => {
      // Only restore safe fields (exclude id, client_id, path, created_at, created_by)
      const { id: _id, client_id: _client_id, path: _path, created_at: _created_at, created_by: _created_by, ...restorableFields } = snapshot;

      await api.patch(
        `/api/organizational-entities/${entityId}`,
        restorableFields
      );
    },
    invalidateKeys: [queryKeys.organizationalEntities.hyphenated(), queryKeys.eoAuditLog.byEntity(""), queryKeys.eoAuditLog.all("")],
    successMessage: 'Entité restaurée avec succès',
  });
}

/** Revert a single field to its previous value */
export function useRevertEoField() {
  return useMutationWithToast({
    mutationFn: async ({ entityId, field, value }: { entityId: string; field: string; value: unknown }) => {
      await api.patch(
        `/api/organizational-entities/${entityId}`,
        { [field]: value }
      );
    },
    invalidateKeys: [queryKeys.organizationalEntities.hyphenated(), queryKeys.eoAuditLog.byEntity(""), queryKeys.eoAuditLog.all("")],
    successMessage: 'Modification annulée',
  });
}

/** Fetch export history for a client */
export function useEoExportHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.eoAuditLog.exportHistory(clientId!),
    enabled: !!clientId,
    queryFn: async () => {
      // TODO: Add a dedicated export history endpoint if needed
      return await api.get<EoAuditLogEntry[]>(
        `/api/organizational-entities/audit?client_id=${clientId!}&type=export`
      );
    },
  });
}

/** Fetch all audit logs for a client (all entities) */
export function useAllEoAuditLogs(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.eoAuditLog.all(clientId!),
    enabled: !!clientId,
    queryFn: async () => {
      return await api.get<EoAuditLogEntry[]>(
        `/api/organizational-entities/audit?client_id=${clientId!}`
      );
    },
  });
}

/** Log an export event */
export function useLogEoExport() {
  return useMutationWithToast({
    mutationFn: async ({ clientId, rowCount, filters, exportType }: {
      clientId: string;
      rowCount: number;
      filters?: Record<string, unknown>;
      exportType: string;
    }) => {
      await api.post('/api/organizational-entities/audit', {
        client_id: clientId,
        row_count: rowCount,
        filters: filters || {},
        export_type: exportType,
      });
    },
    invalidateKeys: [queryKeys.eoAuditLog.exportHistory("")],
  });
}
