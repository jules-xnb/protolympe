import type { ParsedRow, FieldOption } from '@/types/eo-import-types';
import type { OrganizationalEntityWithClient } from '@/hooks/useOrganizationalEntities';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';
import { DB_FIELDS } from '@/types/eo-import-types';

// ── Parent reference type detection ─────────────────────────────────────

export function detectParentReferenceType(
  _rows: ParsedRow[],
  parentColumnValues: string[],
  codeColumnValues: string[],
  nameColumnValues: string[],
  existingEntities: OrganizationalEntityWithClient[],
): 'code' | 'name' | 'unknown' {
  // Get unique non-empty parent values
  const parentValues = [...new Set(parentColumnValues.filter(v => v.trim() !== ''))];
  if (parentValues.length === 0) return 'unknown';

  // Build sets for comparison
  const codeSet = new Set(
    codeColumnValues.filter(v => v.trim() !== '').map(v => v.trim().toLowerCase()),
  );
  const nameSet = new Set(
    nameColumnValues.filter(v => v.trim() !== '').map(v => v.trim().toLowerCase()),
  );

  // Also include existing entities
  const existingCodes = new Set(
    existingEntities.map(e => e.code?.toLowerCase()).filter(Boolean),
  );
  const existingNames = new Set(existingEntities.map(e => e.name.toLowerCase()));

  let codeMatches = 0;
  let nameMatches = 0;

  parentValues.forEach(parentVal => {
    const normalizedVal = parentVal.trim().toLowerCase();

    if (codeSet.has(normalizedVal) || existingCodes.has(normalizedVal)) {
      codeMatches++;
    }
    if (nameSet.has(normalizedVal) || existingNames.has(normalizedVal)) {
      nameMatches++;
    }
  });

  const codeRatio = codeMatches / parentValues.length;
  const nameRatio = nameMatches / parentValues.length;

  if (codeRatio >= 0.6 && codeRatio > nameRatio) {
    return 'code';
  }
  if (nameRatio >= 0.6 && nameRatio > codeRatio) {
    return 'name';
  }

  // If both have similar matches, check value patterns
  const avgLength = parentValues.reduce((sum, v) => sum + v.length, 0) / parentValues.length;
  const hasSpaces = parentValues.some(v => v.includes(' '));

  if (!hasSpaces && avgLength <= 10) {
    return 'code';
  }
  if (hasSpaces || avgLength > 15) {
    return 'name';
  }

  return 'unknown';
}

// ── Auto-suggest mapping ────────────────────────────────────────────────

export function autoSuggestMapping(
  headers: string[],
  rows: ParsedRow[],
  existingEntities: OrganizationalEntityWithClient[],
): Record<string, string> {
  const autoMapping: Record<string, string> = {};
  let potentialParentColumn: string | null = null;
  let codeColumn: string | null = null;
  let nameColumn: string | null = null;

  headers.forEach(header => {
    const normalized = header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalized.includes('parent')) {
      potentialParentColumn = header;
    } else if (normalized.includes('code') && !normalized.includes('postal')) {
      autoMapping[header] = 'code';
      codeColumn = header;
    } else if (normalized.includes('nom') || normalized.includes('name')) {
      autoMapping[header] = 'name';
      nameColumn = header;
    } else if (normalized.includes('actif') || normalized.includes('active')) {
      autoMapping[header] = 'is_active';
    } else if (normalized.includes('description')) {
      autoMapping[header] = 'description';
    }
  });

  // Auto-detect parent reference type if we have a parent column
  if (potentialParentColumn && codeColumn && nameColumn) {
    const parentValues = rows.map(row => row[potentialParentColumn!] || '');
    const codeValues = rows.map(row => row[codeColumn!] || '');
    const nameValues = rows.map(row => row[nameColumn!] || '');

    const detectedType = detectParentReferenceType(
      rows,
      parentValues,
      codeValues,
      nameValues,
      existingEntities,
    );

    if (detectedType === 'code') {
      autoMapping[potentialParentColumn] = 'parent_code';
    } else if (detectedType === 'name') {
      autoMapping[potentialParentColumn] = 'parent_name';
    } else {
      autoMapping[potentialParentColumn] = 'parent_code';
    }
  } else if (potentialParentColumn) {
    autoMapping[potentialParentColumn] = 'parent_code';
  }

  return autoMapping;
}

// ── Mapping change handler (pure) ───────────────────────────────────────

export function applyMappingChange(
  prevMapping: Record<string, string>,
  csvColumn: string,
  dbField: string,
): Record<string, string> {
  const newMapping = { ...prevMapping };
  // Remove previous mapping from this csvColumn
  delete newMapping[csvColumn];
  // Remove previous mapping to this dbField if exists (except __none__)
  if (dbField !== '__none__') {
    Object.keys(newMapping).forEach(key => {
      if (newMapping[key] === dbField) {
        delete newMapping[key];
      }
    });
    newMapping[csvColumn] = dbField;
  }
  return newMapping;
}

// ── Build fields list ───────────────────────────────────────────────────

export function buildAllFields(customFields: EoFieldDefinition[]): FieldOption[] {
  const baseFields = DB_FIELDS.map(f => ({
    id: f.id,
    label: f.label,
    required: f.required,
    isCustom: false,
    fieldType: 'text' as string,
  }));

  const customFieldsList = customFields
    .filter(f => f.is_active)
    .map(f => ({
      id: `custom_${f.id}`,
      label: f.name,
      required: f.is_required,
      isCustom: true,
      fieldDefinitionId: f.id,
      fieldType: f.field_type,
      options: f.options,
      referentialId: (f.settings as Record<string, unknown> | null)?.referential_id as string | undefined,
    }));

  return [...baseFields, ...customFieldsList];
}
