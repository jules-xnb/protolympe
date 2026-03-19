import React from 'react';

/**
 * Format a date string for display in fr-FR locale.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr || '';
  }
}

/**
 * Consolidated field-value formatter.
 *
 * Handles checkbox, date, datetime, number/decimal/currency, select,
 * multiselect, url (clickable link) and falls back to String().
 *
 * @param value          The raw field value (may be wrapped in a JSONB `{ value }` envelope).
 * @param fieldType      The field type string (e.g. 'text', 'checkbox', 'url', ...).
 * @param refLabelMap    Optional map of referential value id/code -> display label (for select/multiselect).
 */
export function formatFieldValue(
  value: unknown,
  fieldType: string,
  refLabelMap?: Map<string, string>,
): React.ReactNode {
  if (value === null || value === undefined) return '\u2014';

  // Unwrap JSONB { value } wrapper produced by some DB queries
  const actualValue =
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).value !== undefined
      ? (value as Record<string, unknown>).value
      : value;

  if (actualValue === null || actualValue === undefined || actualValue === '') return '\u2014';

  switch (fieldType) {
    case 'checkbox':
    case 'boolean':
      return (
        actualValue === true ||
        actualValue === 'true' ||
        actualValue === 'oui' ||
        actualValue === '1'
      )
        ? 'Oui'
        : 'Non';

    case 'date':
      try {
        return new Date(actualValue as string).toLocaleDateString('fr-FR');
      } catch {
        return String(actualValue);
      }

    case 'datetime':
      try {
        return new Date(actualValue as string).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return String(actualValue);
      }

    case 'number':
    case 'decimal':
    case 'currency':
      return typeof actualValue === 'number'
        ? actualValue.toLocaleString('fr-FR')
        : String(actualValue);

    case 'select':
      if (refLabelMap) {
        return refLabelMap.get(String(actualValue)) || String(actualValue);
      }
      return String(actualValue);

    case 'multiselect':
      if (Array.isArray(actualValue)) {
        if (refLabelMap) {
          return actualValue
            .map((v) => refLabelMap.get(String(v)) || String(v))
            .join(', ');
        }
        return actualValue.join(', ');
      }
      return String(actualValue);

    case 'url':
      return React.createElement(
        'a',
        {
          href: String(actualValue),
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'text-primary underline hover:no-underline break-all',
        },
        String(actualValue),
      );

    default:
      if (Array.isArray(actualValue)) return actualValue.join(', ');
      if (typeof actualValue === 'object') return JSON.stringify(actualValue);
      return String(actualValue);
  }
}

/**
 * Generate an uppercase code from a label (for referential values, etc.).
 * Removes accents, replaces non-alphanumeric with underscores, strips leading/trailing underscores.
 */
export function generateCode(label: string): string {
  return label
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}
