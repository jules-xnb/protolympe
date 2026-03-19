/**
 * Field formatting utilities for EO field definitions.
 * Format config is stored in settings.format as:
 * { type: 'zero_pad', length: 5 }
 */

export interface FieldFormatConfig {
  type: 'zero_pad';
  length: number;
}

/**
 * Extract format config from field settings
 */
function isFieldFormatConfig(val: unknown): val is FieldFormatConfig {
  return (
    val != null &&
    typeof val === 'object' &&
    'type' in val &&
    (val as Record<string, unknown>).type === 'zero_pad' &&
    'length' in val &&
    typeof (val as Record<string, unknown>).length === 'number'
  );
}

export function getFieldFormat(settings: Record<string, unknown> | null | undefined): FieldFormatConfig | null {
  const format = settings?.format;
  if (!isFieldFormatConfig(format)) return null;
  return format;
}

/**
 * Apply formatting to a display value (does NOT modify the stored value)
 */
export function applyFieldFormat(value: string | number | null | undefined, format: FieldFormatConfig | null): string {
  if (value == null || value === '') return '';
  const str = String(value);
  if (!format) return str;

  switch (format.type) {
    case 'zero_pad': {
      const len = format.length || 5;
      // Only pad numeric values
      const numeric = str.replace(/\D/g, '');
      if (numeric === '') return str;
      return numeric.padStart(len, '0');
    }
    default:
      return str;
  }
}

/**
 * Generate a preview of the format
 */
export function formatPreview(format: FieldFormatConfig): string {
  switch (format.type) {
    case 'zero_pad':
      return '0'.repeat(Math.max(0, (format.length || 5) - 2)) + '42';
    default:
      return '';
  }
}
