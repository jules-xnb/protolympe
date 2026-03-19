import { api } from '@/lib/api-client';

/**
 * Check if a value already exists for a given unique field definition.
 * Returns true if a duplicate exists (i.e. value is NOT unique).
 * Optionally excludes a specific eo_id (for updates).
 */
export async function checkEoFieldDuplicate(
  fieldDefinitionId: string,
  value: unknown,
  excludeEoId?: string,
): Promise<boolean> {
  if (value === null || value === undefined || String(value).trim() === '') return false;

  // TODO: Ideally add a dedicated uniqueness-check endpoint on the backend.
  // For now, we fetch all values for the field across all EOs and check client-side.
  // We need to get all entities that have this field definition.

  // Get the field definition to find the client_id
  const allFields = await api.get<Array<{ id: string; client_id: string }>>(
    '/api/organizational-entities/fields?client_id=*'
  ).catch(() => []);

  const field = allFields.find(f => f.id === fieldDefinitionId);
  if (!field) return false;

  const entities = await api.get<Array<{ id: string }>>(
    `/api/organizational-entities?client_id=${field.client_id}`
  ).catch(() => []);

  for (const entity of entities) {
    if (excludeEoId && entity.id === excludeEoId) continue;

    const values = await api.get<Array<{ field_definition_id: string; value: unknown }>>(
      `/api/organizational-entities/${entity.id}/values`
    ).catch(() => []);

    const match = values.find(
      v => v.field_definition_id === fieldDefinitionId && v.value === value
    );
    if (match) return true;
  }

  return false;
}

/**
 * Check if an entity name already exists for a given client.
 * Used for the system "name" field uniqueness check.
 * Returns true if a duplicate exists.
 */
export async function checkEoNameDuplicate(
  clientId: string,
  name: string,
  excludeEoId?: string,
): Promise<boolean> {
  if (!name || !name.trim()) return false;

  const entities = await api.get<Array<{ id: string; name: string }>>(
    `/api/organizational-entities?client_id=${clientId}`
  ).catch(() => []);

  return entities.some(
    e => e.name.trim() === name.trim() && (!excludeEoId || e.id !== excludeEoId)
  );
}
