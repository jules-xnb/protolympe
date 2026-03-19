import { reverseMapping, type FieldMapping, type ParsedRow, type PreviewRow } from '@/types/import-types';
import type { MappedEntity } from '@/types/eo-import-types';
import { generateId } from '@/lib/utils';

export type { MappedEntity };

export interface ReparentChange {
  code: string;
  name: string;
  entityId: string;
  oldParentName: string | null;
  newParentName: string | null;
  newParentCode: string | null;
  newParentId: string | null;
  isExisting: true;
}

export interface EoImportResult {
  code: string;
  name: string;
  parentCode: string | null;
  level: number;
  status: 'Créé' | 'Déplacé' | 'Erreur' | 'Ignoré (erreur pré-import)';
  anomaly: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function slugFromCode(code: string): string {
  return code
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

// ---------------------------------------------------------------------------
// buildHierarchy
// ---------------------------------------------------------------------------

/**
 * Build a hierarchical tree from flat CSV rows + existing DB entities.
 * Returns tree roots, parse errors, and reparent change list.
 */
export function buildHierarchy(
  csvData: ParsedRow[],
  mapping: FieldMapping,
  existingEntities: Array<{ id: string; code: string | null; name: string; slug?: string | null; parent_id: string | null }>,
  customFields: Array<{ id: string; name: string; slug: string; is_active: boolean; is_unique: boolean; field_type: string; options?: Array<string | { value?: string; label?: string }> }>,
  activeLabels?: { trueLabel: string; falseLabel: string },
): { tree: MappedEntity[]; errors: string[]; reparentChanges: ReparentChange[] } {
  const errors: string[] = [];
  const entities: MappedEntity[] = [];
  const reparentChanges: ReparentChange[] = [];
  const r = reverseMapping(mapping);
  const generatedIds = new Set<string>();

  // --- Parse CSV rows into MappedEntity[] ---
  csvData.forEach((row, index) => {
    const codeCol = r['code'];
    const nameCol = r['name'];
    const parentCodeCol = r['parent_code'];
    const parentNameCol = r['parent_name'];
    const isActiveCol = r['is_active'];

    const rawCode = codeCol ? row[codeCol]?.trim() : '';
    let code = rawCode;
    const name = row[nameCol]?.trim();

    if (!name) { errors.push(`Ligne ${index + 2}: Nom manquant`); return; }

    const codeColumnMapped = !!codeCol;
    const codeIsEmpty = !rawCode;

    if (!code) {
      let newId = generateId();
      while (generatedIds.has(newId)) newId = generateId();
      code = newId;
      generatedIds.add(code);
    }

    const parentCode = parentCodeCol ? row[parentCodeCol]?.trim() || null : null;
    const parentName = parentNameCol ? row[parentNameCol]?.trim() || null : null;

    let isActive = true;
    if (isActiveCol) {
      const v = row[isActiveCol]?.toLowerCase().trim();
      const falseValues = ['non', 'no', 'false', '0', 'inactif'];
      if (activeLabels?.falseLabel) {
        falseValues.push(activeLabels.falseLabel.toLowerCase().trim());
      }
      isActive = !falseValues.includes(v);
    }

    const entity: MappedEntity = {
      code, name,
      parent_code: parentCode, parent_name: parentName,
      is_active: isActive, customFieldValues: {},
      level: 0, children: [],
      hasError: codeColumnMapped && codeIsEmpty,
      errorMessage: codeColumnMapped && codeIsEmpty ? 'Code vide: la colonne code est mappée mais la valeur est vide' : undefined,
    };

    if (codeColumnMapped && codeIsEmpty) {
      errors.push(`${name}: Code vide (colonne "${codeCol}" mappée mais valeur absente)`);
    }

    // Map custom fields
    Object.entries(r).forEach(([fieldId, csvColumn]) => {
      if (fieldId.startsWith('custom_')) {
        const value = row[csvColumn]?.trim();
        if (value) entity.customFieldValues[fieldId.replace('custom_', '')] = value;
      }
    });

    entities.push(entity);
  });

  // --- Build lookup maps ---
  const codeMap = new Map<string, MappedEntity>();
  const nameMap = new Map<string, MappedEntity>();
  entities.forEach(e => { codeMap.set(e.code, e); nameMap.set(e.name.toLowerCase(), e); });

  // Duplicate codes
  const codeOccurrences = new Map<string, MappedEntity[]>();
  entities.forEach(e => { if (!codeOccurrences.has(e.code)) codeOccurrences.set(e.code, []); codeOccurrences.get(e.code)!.push(e); });
  codeOccurrences.forEach((dupes, code) => {
    if (dupes.length > 1) dupes.forEach(e => {
      e.hasError = true; e.errorMessage = `Code dupliqué dans le CSV: ${code}`;
      errors.push(`${e.name}: Code "${code}" utilisé ${dupes.length} fois`);
    });
  });

  // Unique custom fields
  customFields.filter(f => f.is_active && f.is_unique).forEach(field => {
    const vals = new Map<string, MappedEntity[]>();
    entities.forEach(e => {
      const v = e.customFieldValues[field.id]?.trim().toLowerCase();
      if (v) { if (!vals.has(v)) vals.set(v, []); vals.get(v)!.push(e); }
    });
    vals.forEach((dupes, val) => {
      if (dupes.length > 1) dupes.forEach(e => {
        e.hasError = true;
        e.errorMessage = `Valeur dupliquée pour le champ unique "${field.name}": ${val}`;
        errors.push(`${e.name}: Valeur "${val}" dupliquée pour "${field.name}" (champ unique)`);
      });
    });
  });

  // --- Existing entity lookup ---
  const existingCodeMap = new Map<string, { id: string; code: string; name: string; slug: string; parent_id: string | null }>();
  const existingNameMap = new Map<string, { id: string; code: string; name: string; parent_id: string | null }>();
  const existingSlugSet = new Set<string>();
  const existingIdToName = new Map<string, string>();

  existingEntities.forEach(e => {
    if (e.code) existingCodeMap.set(e.code, { id: e.id, code: e.code, name: e.name, slug: e.slug || '', parent_id: e.parent_id });
    existingNameMap.set(e.name.toLowerCase(), { id: e.id, code: e.code || '', name: e.name, parent_id: e.parent_id });
    if (e.slug) existingSlugSet.add(e.slug);
    existingIdToName.set(e.id, e.name);
  });

  // Match against existing entities
  entities.forEach(e => {
    if (e.hasError) return;
    const existingByCode = e.code ? existingCodeMap.get(e.code) : undefined;
    if (existingByCode) { e.isExistingUpdate = true; e.existingEntityId = existingByCode.id; return; }
    const existingByName = existingNameMap.get(e.name.toLowerCase());
    if (existingByName) {
      e.isExistingUpdate = true; e.existingEntityId = existingByName.id;
      if (!e.code || generatedIds.has(e.code)) e.code = existingByName.code || e.code;
      return;
    }
    const slug = slugFromCode(e.code);
    if (existingSlugSet.has(slug)) {
      e.hasError = true; e.errorMessage = `Slug déjà existant en base: ${slug}`;
      errors.push(`${e.name}: Slug "${slug}" existe déjà`);
    }
  });

  // --- Parent resolution ---
  const findParent = (entity: MappedEntity): {
    parent: MappedEntity | null; existsInDb: boolean;
    existingParentId?: string; ref: string | null;
    resolvedInfo?: MappedEntity['resolvedParent'];
  } => {
    if (entity.parent_code) {
      const p = codeMap.get(entity.parent_code);
      if (p) return { parent: p, existsInDb: false, ref: entity.parent_code, resolvedInfo: { name: p.name, code: p.code, refType: 'code', source: 'import' } };
      const ep = existingCodeMap.get(entity.parent_code);
      if (ep) return { parent: null, existsInDb: true, existingParentId: ep.id, ref: entity.parent_code, resolvedInfo: { name: ep.name, code: ep.code, refType: 'code', source: 'existing' } };
      return { parent: null, existsInDb: false, ref: entity.parent_code };
    }
    if (entity.parent_name) {
      const norm = entity.parent_name.toLowerCase();
      const p = nameMap.get(norm);
      if (p) return { parent: p, existsInDb: false, ref: entity.parent_name, resolvedInfo: { name: p.name, code: p.code, refType: 'name', source: 'import' } };
      const ep = existingNameMap.get(norm);
      if (ep) return { parent: null, existsInDb: true, existingParentId: ep.id, ref: entity.parent_name, resolvedInfo: { name: ep.name, code: ep.code, refType: 'name', source: 'existing' } };
      return { parent: null, existsInDb: false, ref: entity.parent_name };
    }
    return { parent: null, existsInDb: false, ref: null };
  };

  entities.forEach(entity => {
    const { parent, existsInDb, existingParentId, ref, resolvedInfo } = findParent(entity);
    entity.resolvedParent = resolvedInfo;
    if (ref && !parent && !existsInDb) {
      entity.hasError = true; entity.errorMessage = `Parent non trouvé: ${ref}`;
      errors.push(`${entity.name}: Parent "${ref}" introuvable`);
    }
    // Self-reference
    if (!entity.hasError) {
      if ((entity.parent_code && entity.parent_code === entity.code) ||
          (entity.parent_name && entity.parent_name.toLowerCase() === entity.name.toLowerCase())) {
        entity.hasError = true;
        entity.errorMessage = "Auto-référence: l'entité se référence elle-même comme parent";
        errors.push(`${entity.name}: Auto-référence détectée`);
      }
    }
    // Reparent detection
    if (entity.isExistingUpdate && !entity.hasError && entity.existingEntityId) {
      const existing = existingEntities.find(ex => ex.id === entity.existingEntityId);
      if (!existing) return;
      const oldParentId = existing.parent_id;
      const oldParentName = oldParentId ? (existingIdToName.get(oldParentId) || null) : null;
      let newParentId: string | null = null;
      let newParentName: string | null = null;
      let newParentCode: string | null = null;
      if (parent) {
        newParentName = parent.name; newParentCode = parent.code;
        if (parent.isExistingUpdate && parent.existingEntityId) newParentId = parent.existingEntityId;
      } else if (existsInDb && existingParentId) {
        newParentId = existingParentId; newParentName = existingIdToName.get(existingParentId) || null; newParentCode = entity.parent_code;
      }
      if (oldParentId !== newParentId) {
        reparentChanges.push({
          code: entity.code, name: entity.name, entityId: entity.existingEntityId,
          oldParentName, newParentName, newParentCode, newParentId, isExisting: true,
        });
      }
    }
  });

  // Circular cycle detection
  const detectCycle = (entity: MappedEntity, visited: Set<string>): boolean => {
    if (visited.has(entity.code)) return true;
    visited.add(entity.code);
    const parentEntity = entity.parent_code ? codeMap.get(entity.parent_code) : entity.parent_name ? nameMap.get(entity.parent_name.toLowerCase()) : undefined;
    if (!parentEntity) return false;
    return detectCycle(parentEntity, visited);
  };
  entities.forEach(entity => {
    if (entity.hasError) return;
    const visited = new Set<string>();
    if (detectCycle(entity, visited) && visited.size > 1 && !entity.hasError) {
      const cyclePath = Array.from(visited).join(' → ') + ' → ' + Array.from(visited)[0];
      entity.hasError = true; entity.errorMessage = `Cycle circulaire détecté: ${cyclePath}`;
      errors.push(`${entity.name}: Cycle circulaire (${cyclePath})`);
    }
  });

  // --- Build tree ---
  const rootEntities: MappedEntity[] = [];
  entities.forEach(entity => {
    if (!entity.hasError) {
      const { parent, existsInDb } = findParent(entity);
      if (parent) parent.children.push(entity);
      else if (existsInDb || (!entity.parent_code && !entity.parent_name)) rootEntities.push(entity);
    }
  });
  const setLevels = (e: MappedEntity, level: number) => { e.level = level; e.children.forEach(c => setLevels(c, level + 1)); };
  rootEntities.forEach(e => setLevels(e, 0));
  entities.filter(e => e.hasError).forEach(e => rootEntities.push(e));

  return { tree: rootEntities, errors, reparentChanges };
}

// ---------------------------------------------------------------------------
// treeToPreviewRows
// ---------------------------------------------------------------------------

export { flattenEntityTree } from './eo-import-tree';

/** Flatten a MappedEntity tree to PreviewRow[] for the wizard */
export function treeToPreviewRows(tree: MappedEntity[]): PreviewRow[] {
  const rows: PreviewRow[] = [];
  const walk = (entities: MappedEntity[], parentName: string | null = null) => {
    for (const e of entities) {
      rows.push({
        data: {
          code: e.code,
          name: e.name,
          parentName: parentName || '',
          level: String(e.level),
          isActive: e.is_active ? '1' : '0',
          isExisting: e.isExistingUpdate ? '1' : '',
        },
        hasError: e.hasError,
        errorMessage: e.errorMessage,
      });
      walk(e.children, e.name);
    }
  };
  walk(tree);
  return rows;
}
