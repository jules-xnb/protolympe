import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api-client';

export interface BoDocument {
  id: string;
  business_object_id: string;
  field_definition_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  display_order: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  [key: string]: unknown;
}

export function useBoDocuments(businessObjectId: string | undefined, fieldDefinitionId: string | undefined) {
  return useQuery<BoDocument[]>({
    queryKey: queryKeys.boDocuments.byObjectAndField(businessObjectId!, fieldDefinitionId!),
    queryFn: async () => {
      if (!businessObjectId || !fieldDefinitionId) return [];
      const data = await api.get<BoDocument[]>(
        `/api/business-objects/${businessObjectId}/documents?field_definition_id=${fieldDefinitionId}`
      );
      return data || [];
    },
    enabled: !!businessObjectId && !!fieldDefinitionId,
  });
}

export function useUploadBoDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return async ({
    businessObjectId,
    fieldDefinitionId,
    file,
  }: {
    businessObjectId: string;
    fieldDefinitionId: string;
    file: File;
  }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('field_definition_id', fieldDefinitionId);
    if (user?.id) formData.append('uploaded_by', user.id);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const token = localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/business-objects/${businessObjectId}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Erreur ${res.status}`);
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.boDocuments.byObjectAndField(businessObjectId, fieldDefinitionId) });
  };
}

export function useDeleteBoDocument() {
  const queryClient = useQueryClient();

  return async (doc: BoDocument) => {
    await api.delete(`/api/business-objects/documents/${doc.id}`);
    queryClient.invalidateQueries({ queryKey: queryKeys.boDocuments.byObjectAndField(doc.business_object_id, doc.field_definition_id) });
  };
}

export function useGetBoDocumentUrl() {
  return (filePath: string) => {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${API_BASE}/api/business-objects/documents/file/${encodeURIComponent(filePath)}`;
  };
}

export async function downloadBoDocument(filePath: string, fileName: string) {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/business-objects/documents/file/${encodeURIComponent(filePath)}`, { headers });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
