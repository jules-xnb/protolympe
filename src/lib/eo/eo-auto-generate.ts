import { format } from 'date-fns';
import { generateId } from '@/lib/utils';
import { api } from '@/lib/api-client';

export interface AutoGenerateConfig {
  enabled: boolean;
  mode: 'counter' | 'prefix_counter' | 'uuid' | 'date' | 'fixed_value';
  config: {
    prefix?: string;
    padding?: number;
    date_format?: string;
    fixed_value?: string;
  };
}

export function getAutoGenerateConfig(settings: unknown): AutoGenerateConfig | null {
  const ag = (settings as Record<string, unknown> | null)?.auto_generate as Record<string, unknown> | undefined;
  if (!ag?.enabled) return null;
  return ag as AutoGenerateConfig;
}

/** Parse a raw JSONB value to a plain string, handling double-quoted strings */
function parseRawValue(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'string') {
    // Handle JSONB strings that may be wrapped in quotes: "\"1\"" -> "1"
    const trimmed = raw.replace(/^"|"$/g, '');
    return trimmed;
  }
  return String(raw);
}

/**
 * Get the current max counter value for a field definition from the DB.
 * Exported so backfill can call it once and then increment locally.
 */
export async function getMaxCounterValue(fieldDefinitionId: string): Promise<number> {
  // TODO: Ideally the backend would expose a dedicated endpoint for this.
  // For now we fetch all field values and compute the max client-side.
  // We need to find the EO that has this field, but we don't know the eo_id.
  // Use the fields endpoint to get the client_id, then get all entities and their values.

  // Alternative: use the values endpoint which returns all values for a field
  // The API doesn't have a direct "get values by field_definition_id" endpoint.
  // We'll need to work with what we have.

  // Fetch the field definition to get client_id
  const fields = await api.get<Array<{ id: string; client_id: string }>>(
    `/api/organizational-entities/fields?client_id=*`
  ).catch(() => []);

  const field = fields.find(f => f.id === fieldDefinitionId);
  if (!field) return 0;

  // Fetch all entities for this client
  const entities = await api.get<Array<{ id: string }>>(
    `/api/organizational-entities?client_id=${field.client_id}`
  ).catch(() => []);

  let maxNum = 0;
  // Fetch values for each entity and check the specific field
  for (const entity of entities) {
    const values = await api.get<Array<{ field_definition_id: string; value: unknown }>>(
      `/api/organizational-entities/${entity.id}/values`
    ).catch(() => []);

    for (const row of values) {
      if (row.field_definition_id === fieldDefinitionId) {
        const val = parseRawValue(row.value);
        const match = val.match(/(\d+)\s*$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }
  }

  return maxNum;
}

export async function generateAutoValue(
  fieldDefinitionId: string,
  agConfig: AutoGenerateConfig,
): Promise<string> {
  switch (agConfig.mode) {
    case 'uuid':
      return generateId();

    case 'date': {
      return format(new Date(), 'yyyy-MM-dd');
    }

    case 'fixed_value':
      return agConfig.config.fixed_value || '';

    case 'counter':
    case 'prefix_counter': {
      const maxNum = await getMaxCounterValue(fieldDefinitionId);
      return String(maxNum + 1);
    }

    default:
      return '';
  }
}
