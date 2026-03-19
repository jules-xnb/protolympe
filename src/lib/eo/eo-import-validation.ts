import type { ParsedRow, FieldOption } from '@/types/eo-import-types';

// ── Field value validation ──────────────────────────────────────────────

export function validateFieldValue(
  value: string,
  fieldType: string,
  options?: Array<string | { value?: string; label?: string }>,
): { valid: boolean; message?: string } {
  if (!value || value.trim() === '') return { valid: true };

  const trimmedValue = value.trim();

  switch (fieldType) {
    case 'number':
      if (!/^-?\d+$/.test(trimmedValue)) {
        return { valid: false, message: 'Nombre entier attendu' };
      }
      break;
    case 'decimal':
      if (!/^-?\d+([.,]\d+)?$/.test(trimmedValue)) {
        return { valid: false, message: 'Nombre décimal attendu' };
      }
      break;
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
        return { valid: false, message: 'Email invalide' };
      }
      break;
    case 'date':
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) &&
        !/^\d{2}\/\d{2}\/\d{4}$/.test(trimmedValue) &&
        !/^\d{2}-\d{2}-\d{4}$/.test(trimmedValue)
      ) {
        return { valid: false, message: 'Date invalide (ex: 2024-01-15)' };
      }
      break;
    case 'datetime':
      if (!/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(trimmedValue)) {
        return { valid: false, message: 'Date/heure invalide' };
      }
      break;
    case 'checkbox': {
      const validBooleans = ['oui', 'non', 'true', 'false', '1', '0', 'yes', 'no', 'vrai', 'faux'];
      if (!validBooleans.includes(trimmedValue.toLowerCase())) {
        return { valid: false, message: 'Valeur booléenne attendue (oui/non)' };
      }
      break;
    }
    case 'select':
      if (options && options.length > 0) {
        const validOptions = options.map(o =>
          typeof o === 'string' ? o.toLowerCase() : String(o.value || o.label || o).toLowerCase(),
        );
        if (!validOptions.includes(trimmedValue.toLowerCase())) {
          return { valid: false, message: 'Valeur non autorisée' };
        }
      }
      break;
    case 'url':
      try {
        new URL(trimmedValue.startsWith('http') ? trimmedValue : `https://${trimmedValue}`);
      } catch {
        return { valid: false, message: 'URL invalide' };
      }
      break;
    case 'phone':
      if (!/^[+]?[\d\s.-]{6,20}$/.test(trimmedValue)) {
        return { valid: false, message: 'Téléphone invalide' };
      }
      break;
  }
  return { valid: true };
}

// ── Validation results computation ──────────────────────────────────────

export interface ValidationResultEntry {
  errors: number;
  total: number;
  samples: string[];
}

export function computeValidationResults(
  mapping: Record<string, string>,
  csvData: ParsedRow[],
  allFields: FieldOption[],
): Record<string, ValidationResultEntry> {
  const results: Record<string, ValidationResultEntry> = {};

  Object.entries(mapping).forEach(([csvColumn, fieldId]) => {
    if (fieldId === '__none__') return;

    const field = allFields.find(f => f.id === fieldId);
    if (!field) return;

    const fieldType = field.fieldType || 'text';
    // Skip option validation for referential-backed fields (values are validated server-side)
    const options = ('referentialId' in field && field.referentialId)
      ? undefined
      : ('options' in field ? field.options : undefined);

    let errorCount = 0;
    const errorSamples: string[] = [];

    csvData.forEach(row => {
      const value = row[csvColumn] || '';
      const validation = validateFieldValue(value, fieldType, options);
      if (!validation.valid && value.trim() !== '') {
        errorCount++;
        if (errorSamples.length < 3) {
          errorSamples.push(`"${value.substring(0, 20)}${value.length > 20 ? '...' : ''}"`);
        }
      }
    });

    if (errorCount > 0) {
      results[csvColumn] = {
        errors: errorCount,
        total: csvData.length,
        samples: errorSamples,
      };
    }
  });

  return results;
}

export function computeTotalValidationErrors(
  validationResults: Record<string, ValidationResultEntry>,
): number {
  return Object.values(validationResults).reduce((sum, r) => sum + r.errors, 0);
}
