// Shared EO import types used by both src/lib/ and src/components/
// Extracted from src/components/admin/entities/eo-import/types.ts to fix architecture inversion.
// Also consolidates the MappedEntity interface from src/lib/eo/eo-hierarchy-builder.ts.

export interface ParsedRow {
  [key: string]: string;
}

export interface MappedEntity {
  code: string;
  name: string;
  parent_code: string | null;
  parent_name: string | null;
  description?: string;
  is_active: boolean;
  // Custom field values: fieldDefinitionId -> value
  customFieldValues: Record<string, string>;
  // Computed fields
  level: number;
  children: MappedEntity[];
  hasError: boolean;
  errorMessage?: string;
  // Existing entity tracking (for update vs create)
  existingEntityId?: string;
  /** Used in eo-import components (legacy name) */
  isUpdate?: boolean;
  /** Used in eo-hierarchy-builder (legacy name) */
  isExistingUpdate?: boolean;
  // Resolved parent info for display
  resolvedParent?: {
    name: string;
    code?: string;
    refType: 'code' | 'name';
    source: 'import' | 'existing';
  };
}

// Database fields that can be mapped
export const DB_FIELDS = [
  { id: 'code', label: 'Code', required: true },
  { id: 'name', label: 'Nom', required: true },
  { id: 'parent_code', label: 'Code parent', required: false, isParentField: true },
  { id: 'parent_name', label: 'Nom parent', required: false, isParentField: true },
  { id: 'description', label: 'Description', required: false },
  { id: 'is_active', label: 'Actif', required: false },
] as const;

export interface FieldOption {
  id: string;
  label: string;
  required: boolean;
  isCustom: boolean;
  fieldType: string;
  fieldDefinitionId?: string;
  options?: Array<string | { value?: string; label?: string }>;
  referentialId?: string;
}
