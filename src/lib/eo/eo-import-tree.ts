import type { ParsedRow, MappedEntity } from '@/types/eo-import-types';
import type { OrganizationalEntityWithClient } from '@/hooks/useOrganizationalEntities';
import type { EoFieldDefinition } from '@/hooks/useEoFieldDefinitions';

// ── Build entity tree ───────────────────────────────────────────────────

export function buildEntityTree(
  csvData: ParsedRow[],
  mapping: Record<string, string>,
  existingEntities: OrganizationalEntityWithClient[],
  customFields: EoFieldDefinition[],
): { tree: MappedEntity[]; errors: string[] } {
  const errors: string[] = [];
  const entities: MappedEntity[] = [];

  // Reverse mapping: dbField -> csvColumn
  const reverseMapping: Record<string, string> = {};
  Object.entries(mapping).forEach(([csv, db]) => {
    reverseMapping[db] = csv;
  });

  // Parse rows into entities
  csvData.forEach((row, index) => {
    const codeCol = reverseMapping['code'];
    const nameCol = reverseMapping['name'];
    const parentCodeCol = reverseMapping['parent_code'];
    const parentNameCol = reverseMapping['parent_name'];
    const isActiveCol = reverseMapping['is_active'];

    const code = row[codeCol]?.trim();
    const name = row[nameCol]?.trim();

    if (!code || !name) {
      errors.push(`Ligne ${index + 2}: Code ou nom manquant`);
      return;
    }

    const parentCode = parentCodeCol ? row[parentCodeCol]?.trim() || null : null;
    const parentName = parentNameCol ? row[parentNameCol]?.trim() || null : null;

    // Parse is_active
    let isActive = true;
    if (isActiveCol) {
      const activeValue = row[isActiveCol]?.toLowerCase().trim();
      isActive = !['non', 'no', 'false', '0', 'inactif'].includes(activeValue);
    }

    const entity: MappedEntity = {
      code,
      name,
      parent_code: parentCode,
      parent_name: parentName,
      is_active: isActive,
      customFieldValues: {},
      level: 0,
      children: [],
      hasError: false,
    };

    // Map optional fields
    if (reverseMapping['description']) entity.description = row[reverseMapping['description']]?.trim();

    // Map custom fields
    Object.entries(reverseMapping).forEach(([fieldId, csvColumn]) => {
      if (fieldId.startsWith('custom_')) {
        const fieldDefId = fieldId.replace('custom_', '');
        const value = row[csvColumn]?.trim();
        if (value) {
          entity.customFieldValues[fieldDefId] = value;
        }
      }
    });

    entities.push(entity);
  });

  // Mark entities that already exist in DB (for update instead of create)
  const existingByCode = new Map<string, OrganizationalEntityWithClient>();
  existingEntities.forEach(e => {
    if (e.code) existingByCode.set(e.code, e);
  });
  entities.forEach(e => {
    const existing = existingByCode.get(e.code);
    if (existing) {
      e.existingEntityId = existing.id;
      e.isUpdate = true;
    }
  });

  // Normalize helper for accent-safe comparison
  const norm = (s: string) => s.trim().toLowerCase().normalize('NFC');

  // Build code-to-entity map and name-to-entity map (including existing entities)
  const codeMap = new Map<string, MappedEntity>();
  const nameMap = new Map<string, MappedEntity>();
  entities.forEach(e => {
    codeMap.set(e.code, e);
    nameMap.set(norm(e.name), e);
  });

  // Validate uniqueness for custom fields marked as unique
  const uniqueFields = customFields.filter(f => f.is_active && f.is_unique);
  uniqueFields.forEach(field => {
    const fieldId = field.id;
    const valueOccurrences = new Map<string, MappedEntity[]>();
    entities.forEach(e => {
      const val = e.customFieldValues[fieldId];
      if (val && val.trim() !== '') {
        const normalizedVal = val.trim().toLowerCase();
        if (!valueOccurrences.has(normalizedVal)) {
          valueOccurrences.set(normalizedVal, []);
        }
        valueOccurrences.get(normalizedVal)!.push(e);
      }
    });
    valueOccurrences.forEach((dupes, val) => {
      if (dupes.length > 1) {
        dupes.forEach(e => {
          e.hasError = true;
          e.errorMessage = `Valeur dupliquée pour le champ unique "${field.name}": ${val}`;
          errors.push(`${e.code}: Valeur "${val}" dupliquée pour "${field.name}" (champ unique)`);
        });
      }
    });
  });

  // Also check existing entities for parent references (with name lookup)
  const existingCodeMap = new Map<string, { code: string; name: string }>();
  const existingNameMap = new Map<string, { code: string; name: string }>();
  existingEntities.forEach(e => {
    if (e.code) existingCodeMap.set(e.code, { code: e.code, name: e.name });
    existingNameMap.set(norm(e.name), { code: e.code || '', name: e.name });
  });

  // Helper to find parent entity with fallback: code -> name regardless of mapping
  const findParent = (
    entity: MappedEntity,
  ): {
    parent: MappedEntity | null;
    existsInDb: boolean;
    ref: string | null;
    resolvedInfo?: MappedEntity['resolvedParent'];
  } => {
    const ref = entity.parent_code || entity.parent_name;
    if (!ref) return { parent: null, existsInDb: false, ref: null };

    const normalizedRef = norm(ref);

    // 1. Search by code in import
    const byCodeImport = codeMap.get(ref);
    if (byCodeImport) {
      return {
        parent: byCodeImport,
        existsInDb: false,
        ref,
        resolvedInfo: {
          name: byCodeImport.name,
          code: byCodeImport.code,
          refType: 'code',
          source: 'import',
        },
      };
    }

    // 2. Search by name in import
    const byNameImport = nameMap.get(normalizedRef);
    if (byNameImport) {
      return {
        parent: byNameImport,
        existsInDb: false,
        ref,
        resolvedInfo: {
          name: byNameImport.name,
          code: byNameImport.code,
          refType: 'name',
          source: 'import',
        },
      };
    }

    // 3. Search by code in existing DB entities
    const byCodeExisting = existingCodeMap.get(ref);
    if (byCodeExisting) {
      return {
        parent: null,
        existsInDb: true,
        ref,
        resolvedInfo: {
          name: byCodeExisting.name,
          code: byCodeExisting.code,
          refType: 'code',
          source: 'existing',
        },
      };
    }

    // 4. Search by name in existing DB entities
    const byNameExisting = existingNameMap.get(normalizedRef);
    if (byNameExisting) {
      return {
        parent: null,
        existsInDb: true,
        ref,
        resolvedInfo: {
          name: byNameExisting.name,
          code: byNameExisting.code,
          refType: 'name',
          source: 'existing',
        },
      };
    }

    // Not found
    return { parent: null, existsInDb: false, ref };
  };

  // Validate parents and build tree
  const rootEntities: MappedEntity[] = [];

  entities.forEach(entity => {
    const { parent, existsInDb, ref, resolvedInfo } = findParent(entity);

    // Store resolved parent info
    if (resolvedInfo) {
      entity.resolvedParent = resolvedInfo;
    }

    if (!ref) {
      // No parent reference - root entity
      entity.level = 0;
      rootEntities.push(entity);
    } else if (parent) {
      // Parent found in import data
      parent.children.push(entity);
    } else if (existsInDb) {
      // Parent exists in DB, treat as root for display purposes
      rootEntities.push(entity);
    } else {
      entity.hasError = true;
      entity.errorMessage = `Parent "${ref}" introuvable`;
      errors.push(
        `${entity.code}: Le parent "${ref}" n'existe pas dans l'import ni dans la base`,
      );
      rootEntities.push(entity); // Still show it but with error
    }
  });

  // Calculate levels recursively
  const setLevels = (entities: MappedEntity[], level: number) => {
    entities.forEach(e => {
      e.level = level;
      if (e.children.length > 0) {
        setLevels(e.children, level + 1);
      }
    });
  };
  setLevels(rootEntities, 0);

  return { tree: rootEntities, errors };
}

// ── Flatten tree helpers ────────────────────────────────────────────────

export function flattenEntityTree(entities: MappedEntity[]): MappedEntity[] {
  const result: MappedEntity[] = [];
  const flatten = (items: MappedEntity[]) => {
    items.forEach(e => {
      result.push(e);
      flatten(e.children);
    });
  };
  flatten(entities);
  return result;
}

export function countAllEntities(entities: MappedEntity[]): number {
  return entities.reduce((sum, e) => sum + 1 + countAllEntities(e.children), 0);
}

// ── Collapse helpers ────────────────────────────────────────────────────

export function collectAllParentCodes(entities: MappedEntity[]): Set<string> {
  const allCodes = new Set<string>();
  const collectCodes = (items: MappedEntity[]) => {
    items.forEach(e => {
      if (e.children.length > 0) {
        allCodes.add(e.code);
        collectCodes(e.children);
      }
    });
  };
  collectCodes(entities);
  return allCodes;
}
