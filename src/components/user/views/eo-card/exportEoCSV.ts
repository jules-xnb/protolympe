import { api } from '@/lib/api-client';
import type { OrganizationalEntity } from './EoCardFields';

interface FieldDef {
  id: string;
  slug: string;
  is_active: boolean;
  display_order: number;
}

export async function exportEoCSV(
  allVisibleEntities: OrganizationalEntity[],
  fieldDefinitions: FieldDef[],
  clientSlug?: string,
): Promise<void> {
  if (allVisibleEntities.length === 0) return;

  const activeCustomFields = fieldDefinitions
    .filter(f => f.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  const allEoIds = allVisibleEntities.map(e => e.id);
  const allFieldIds = activeCustomFields.map(f => f.id);
  const valuesMap: Record<string, Record<string, string>> = {};

  if (allFieldIds.length > 0 && allEoIds.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < allEoIds.length; i += batchSize) {
      const batch = allEoIds.slice(i, i + batchSize);
      const data = await api.post<Array<{ eo_id: string; field_definition_id: string; value: unknown }>>('/api/organizational-entities/field-values/batch', {
        eo_ids: batch,
        field_definition_ids: allFieldIds,
      });
      for (const row of (data || [])) {
        if (!valuesMap[row.eo_id]) valuesMap[row.eo_id] = {};
        let val = row.value;
        if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
          val = (val as string).slice(1, -1);
        }
        valuesMap[row.eo_id][row.field_definition_id] = val === null || val === undefined ? '' : String(val);
      }
    }
  }

  const getParentCode = (parentId: string | null): string => {
    if (!parentId) return '';
    const parent = allVisibleEntities.find(e => e.id === parentId);
    return parent?.code || '';
  };

  const headers = ['code', 'nom', 'code_parent', 'actif', ...activeCustomFields.map(f => f.slug)];
  const rows = allVisibleEntities.map(entity => [
    entity.code || '',
    entity.name,
    getParentCode(entity.parent_id),
    entity.is_active ? 'oui' : 'non',
    ...activeCustomFields.map(f => valuesMap[entity.id]?.[f.id] || ''),
  ]);

  const escapeCSV = (value: string): string => {
    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(escapeCSV).join(';')),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `entites_${clientSlug || 'export'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
