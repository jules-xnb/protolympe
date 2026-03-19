import { api } from '@/lib/api-client';
import type { Json } from '@/types/database';

/** Extract a string from a Json value that may be a plain string or { value: string } */
export function extractStringValue(v: Json | undefined): string | undefined {
  if (typeof v === 'string') return v;
  if (v != null && typeof v === 'object' && !Array.isArray(v)) {
    const obj = v as Record<string, Json>;
    return typeof obj.value === 'string' ? obj.value : undefined;
  }
  return undefined;
}

interface AggregationFieldDef {
  id: string;
  field_type: string;
  settings: Record<string, unknown> | null;
}

interface ObjectWithEoId {
  id: string;
  eo_id: string | null;
}

interface EoFieldValueRow {
  eo_id: string;
  value: Json;
}

interface UserFieldValueRow {
  user_id: string;
  value: Json;
}

interface ObjectFieldValueRow {
  business_object_id: string;
  value: Json;
}

/**
 * Resolves aggregation field values for a set of business objects.
 *
 * Aggregation fields pull values from related entities (EO, user, or other BO)
 * by following a source field reference and fetching a target field value.
 *
 * @returns Map<fieldId, Map<objectId, value>>
 */
export async function resolveAggregationValues(
  fieldDefs: AggregationFieldDef[],
  objects: ObjectWithEoId[],
  valuesMap: Map<string, Record<string, Json>>,
): Promise<Map<string, Map<string, Json>>> {
  const aggregationFields = fieldDefs.filter(f => f.field_type === 'aggregation');
  const aggregationValues = new Map<string, Map<string, Json>>();

  if (aggregationFields.length === 0) return aggregationValues;

  for (const aggField of aggregationFields) {
    const settings = (aggField.settings || {}) as Record<string, unknown>;
    const sourceField = settings.aggregation_source_field as string | undefined;
    const sourceType = settings.aggregation_source_type as string | undefined;
    const targetFieldId = settings.aggregation_target_field_id as string | undefined;

    if (!sourceField || !targetFieldId || !sourceType) continue;

    // Treat eo_reference system fields the same as __system_eo_id
    const isSystemEoRef = sourceField === '__system_eo_id' || (() => {
      if (sourceType !== 'eo') return false;
      const hasAnyValue = objects.some(o => {
        const v = valuesMap.get(o.id)?.[sourceField];
        return v !== undefined && v !== null;
      });
      return !hasAnyValue && objects.some(o => o.eo_id);
    })();

    const fieldValueMap = new Map<string, Json>();

    if (sourceType === 'eo') {
      const eoIds = isSystemEoRef
        ? objects.map(o => o.eo_id).filter(Boolean) as string[]
        : objects.map(o => {
            const vals = valuesMap.get(o.id);
            const v = vals?.[sourceField];
            return extractStringValue(v);
          }).filter(Boolean) as string[];

      if (eoIds.length > 0) {
        const uniqueEoIds = [...new Set(eoIds)];
        const eoValues = await api.post<EoFieldValueRow[]>(
          '/api/organizational-entities/field-values/bulk',
          { field_definition_id: targetFieldId, eo_ids: uniqueEoIds }
        );

        const eoValueMap = new Map<string, Json>();
        eoValues?.forEach(ev => eoValueMap.set(ev.eo_id, ev.value));

        objects.forEach(obj => {
          const eoId = isSystemEoRef
            ? obj.eo_id
            : extractStringValue(valuesMap.get(obj.id)?.[sourceField]);
          if (eoId && eoValueMap.has(eoId)) {
            fieldValueMap.set(obj.id, eoValueMap.get(eoId)!);
          }
        });
      }
    } else if (sourceType === 'user') {
      const userIds = objects.map(o => {
        const v = valuesMap.get(o.id)?.[sourceField];
        return extractStringValue(v);
      }).filter(Boolean) as string[];

      if (userIds.length > 0) {
        const uniqueUserIds = [...new Set(userIds)];
        const userValues = await api.post<UserFieldValueRow[]>(
          '/api/client-users/field-values/bulk',
          { field_definition_id: targetFieldId, user_ids: uniqueUserIds }
        );

        const userValueMap = new Map<string, Json>();
        userValues?.forEach(uv => userValueMap.set(uv.user_id, uv.value));

        objects.forEach(obj => {
          const v = valuesMap.get(obj.id)?.[sourceField];
          const userId = extractStringValue(v);
          if (userId && userValueMap.has(userId)) {
            fieldValueMap.set(obj.id, userValueMap.get(userId)!);
          }
        });
      }
    } else if (sourceType === 'object') {
      const refObjIds = objects.map(o => {
        const v = valuesMap.get(o.id)?.[sourceField];
        return extractStringValue(v);
      }).filter(Boolean) as string[];

      if (refObjIds.length > 0) {
        const uniqueRefIds = [...new Set(refObjIds)];
        const objValues = await api.post<ObjectFieldValueRow[]>(
          '/api/business-objects/field-values/bulk',
          { field_definition_id: targetFieldId, business_object_ids: uniqueRefIds }
        );

        const objValueMap = new Map<string, Json>();
        objValues?.forEach(ov => objValueMap.set(ov.business_object_id, ov.value));

        objects.forEach(obj => {
          const v = valuesMap.get(obj.id)?.[sourceField];
          const refId = extractStringValue(v);
          if (refId && objValueMap.has(refId)) {
            fieldValueMap.set(obj.id, objValueMap.get(refId)!);
          }
        });
      }
    }

    aggregationValues.set(aggField.id, fieldValueMap);
  }

  return aggregationValues;
}
