import { useCallback, useMemo } from 'react';
import { useAllListeValues } from './useListeValues';
import type { EoFieldDefinition } from './useEoFieldDefinitions';

/**
 * Resolves options for EO select/multiselect fields.
 * If a field has settings.referential_id, uses referential values.
 * Otherwise falls back to inline field.options.
 */
export function useResolvedEoOptions(fields: EoFieldDefinition[]) {
  // Extract fields that have a referential_id in their settings
  const fieldsWithRef = useMemo(
    () =>
      fields
        .filter(f => ['select', 'multiselect'].includes(f.field_type))
        .map(f => ({ referential_id: (f.settings as Record<string, unknown> | null)?.referential_id as string | null })),
    [fields],
  );

  const { data: refValuesMap } = useAllListeValues(fieldsWithRef);

  const getOptions = useCallback(
    (field: EoFieldDefinition): { value: string; label: string }[] => {
      const refId = (field.settings as Record<string, unknown> | null)?.referential_id as string | undefined;
      if (refId && refValuesMap) {
        const values = refValuesMap.get(refId);
        if (values) {
          return values.map(rv => ({ value: rv.label, label: rv.label }));
        }
      }
      // Fallback to inline options
      const opts = field.options as Array<string | { value?: string; label?: string }> | null;
      if (!opts) return [];
      return opts.map(o =>
        typeof o === 'string' ? { value: o, label: o } : { value: o.value || o.label, label: o.label || o.value },
      );
    },
    [refValuesMap],
  );

  return { getOptions };
}
