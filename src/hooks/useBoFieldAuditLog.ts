import { useQuery } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface BoFieldAuditLogEntry {
  id: string;
  business_object_id: string;
  field_definition_id: string;
  action: 'field_create' | 'field_update' | 'field_delete';
  old_value: unknown;
  new_value: unknown;
  field_name: string | null;
  changed_by: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string } | null;
}

/**
 * Fetch audit logs for a specific business object instance.
 */
export function useBoFieldAuditLog(businessObjectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.boFieldAuditLog.byObject(businessObjectId!),
    enabled: !!businessObjectId,
    queryFn: async () => {
      const data = await api.get<BoFieldAuditLogEntry[]>(
        `/api/business-objects/${businessObjectId!}/audit`
      );
      return data || [];
    },
  });
}

export type BoAuditLogWithRef = BoFieldAuditLogEntry & { reference_number: string; instance_name?: string };

export interface PaginatedBoAuditLogs {
  data: BoAuditLogWithRef[];
  totalCount: number;
}

/**
 * Fetch paginated audit logs for all instances of a business object definition.
 */
export function useBoDefinitionAuditLogs(
  definitionId: string | undefined,
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  return useQuery({
    queryKey: queryKeys.boFieldAuditLog.all(definitionId!, page, pageSize),
    enabled: !!definitionId,
    queryFn: async (): Promise<PaginatedBoAuditLogs> => {
      const result = await api.get<PaginatedBoAuditLogs>(
        `/api/business-objects/definitions/${definitionId!}/audit?page=${page}&page_size=${pageSize}`
      );
      return result || { data: [], totalCount: 0 };
    },
  });
}
