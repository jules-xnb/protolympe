import type { Database } from '@/types/database';

export type FieldType = Database['public']['Enums']['field_type'];

export type Step = 'upload' | 'mapping' | 'preview';

export interface ParsedRow {
  [key: string]: string;
}

export interface MappedField {
  name: string;
  slug: string;
  field_type: FieldType;
  description: string | null;
  is_required: boolean;
  is_readonly: boolean;
  placeholder: string | null;
  display_order: number;
  hasError: boolean;
  errorMessage?: string;
}

// Types importables par CSV — les types nécessitant une configuration
// supplémentaire (select, multiselect, object_reference, calculated, aggregation)
// ne sont pas importables et doivent être créés via le formulaire.
export const VALID_FIELD_TYPES: FieldType[] = [
  'text', 'textarea', 'number', 'decimal', 'date', 'datetime', 'time',
  'checkbox', 'email', 'phone', 'url',
  'user_reference', 'eo_reference', 'document',
];

export const CSV_FIELD_COLUMNS = {
  field_name: { label: 'Nom du champ', required: true },
  field_type: { label: 'Type de champ', required: true },
  field_description: { label: 'Description', required: false },
  field_required: { label: 'Obligatoire', required: false },
  field_readonly: { label: 'Lecture seule', required: false },
  field_placeholder: { label: 'Placeholder', required: false },
} as const;

// Re-exported from centralised registry
export { getFieldTypeLabel } from '@/lib/field-type-registry';

// ── Helpers ──────────────────────────────────────────────

// Re-exported from canonical source @/lib/csv-parser
export { parseCSV, generateSlug, parseBoolean } from '@/lib/csv-parser';

export function validateFieldType(type: string): FieldType | null {
  const normalized = type.toLowerCase().trim();
  if (VALID_FIELD_TYPES.includes(normalized as FieldType)) {
    return normalized as FieldType;
  }
  return null;
}
