import { api } from '@/lib/api-client';
import { getAutoGenerateConfig, generateAutoValue, getMaxCounterValue } from '@/lib/eo/eo-auto-generate';

/**
 * Backfill missing eo_field_values for all active EOs of a client
 * when a required field is created/updated with a default value or auto-generate config.
 * Returns the number of EOs that were backfilled.
 */
export async function backfillFieldValues(
  clientId: string,
  fieldId: string,
  defaultValue: unknown,
  settings: Record<string, unknown>,
): Promise<number> {
  // 1. Get all active EO ids for the client
  const allEos = await api.get<Array<{ id: string }>>(
    `/api/organizational-entities?client_id=${clientId}`
  );

  if (!allEos || allEos.length === 0) return 0;

  // 2. Get existing field values for each entity to find which ones are missing
  const existingEoIds = new Set<string>();
  for (const eo of allEos) {
    const values = await api.get<Array<{ field_definition_id: string; eo_id: string }>>(
      `/api/organizational-entities/${eo.id}/values`
    ).catch(() => []);
    if (values.some(v => v.field_definition_id === fieldId)) {
      existingEoIds.add(eo.id);
    }
  }

  // 3. Find EOs missing a value
  const missingEoIds = allEos.filter((eo) => !existingEoIds.has(eo.id)).map((eo) => eo.id);
  if (missingEoIds.length === 0) return 0;

  // 4. Generate values
  const agConfig = getAutoGenerateConfig(settings);
  const isCounterMode = agConfig && (agConfig.mode === 'counter' || agConfig.mode === 'prefix_counter');

  if (isCounterMode) {
    // For counter modes: fetch max once, then increment locally
    let currentMax = await getMaxCounterValue(fieldId);
    for (const eoId of missingEoIds) {
      currentMax++;
      await api.post('/api/organizational-entities/values', {
        eo_id: eoId,
        field_definition_id: fieldId,
        value: String(currentMax),
      });
    }
  } else {
    for (const eoId of missingEoIds) {
      let value: unknown;
      if (agConfig) {
        value = await generateAutoValue(fieldId, agConfig);
      } else {
        value = defaultValue;
      }
      await api.post('/api/organizational-entities/values', {
        eo_id: eoId,
        field_definition_id: fieldId,
        value,
      });
    }
  }

  return missingEoIds.length;
}
