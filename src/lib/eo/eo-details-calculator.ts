import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import type { EoFieldKey } from '@/types/builder-types';

export interface EntitySummary {
  id: string;
  name: string;
  path: string;
  parent_id: string | null;
  is_active?: boolean;
}

/**
 * Computes the chain of ancestor entities for a given entity.
 * Returns ancestors in order from root to the immediate parent.
 */
export function computeAncestors(
  entity: { id: string; parent_id?: string | null },
  allEntities: EntitySummary[],
): EntitySummary[] {
  const chain: EntitySummary[] = [];
  let current: { id: string; parent_id?: string | null } = entity;
  while (current.parent_id) {
    const parent = allEntities.find(e => e.id === current.parent_id);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

/**
 * Computes valid parent candidates for an entity (excludes self and descendants to prevent cycles).
 */
export function computeParentCandidates(
  entity: { id: string },
  allEntities: EntitySummary[],
): EntitySummary[] {
  const entityPath = allEntities.find(e => e.id === entity.id)?.path || '';
  return allEntities.filter(e => {
    if (e.id === entity.id) return false;
    if (entityPath && e.path?.startsWith(entityPath + '.')) return false;
    return true;
  });
}

export interface FieldValueRow {
  field_definition_id: string;
  value: unknown;
}

/**
 * Parses raw field value data into a record keyed by field_definition_id.
 */
export function parseCustomFieldValues(
  fieldValuesData: FieldValueRow[] | null | undefined,
): Record<string, unknown> {
  if (!fieldValuesData) return {};
  const values: Record<string, unknown> = {};
  for (const fv of fieldValuesData) {
    const raw = fv.value;
    values[fv.field_definition_id] = typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : raw ?? '';
  }
  return values;
}

/**
 * Filters custom field definitions to only those that are visible and active.
 */
export function getVisibleCustomFields(
  definitions: EoFieldDefinition[],
  isFieldVisible: (field: EoFieldKey) => boolean,
): EoFieldDefinition[] {
  return definitions.filter(field => {
    if (!field.is_active) return false;
    return isFieldVisible(field.id);
  });
}
