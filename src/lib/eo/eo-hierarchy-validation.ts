import { api } from '@/lib/api-client';

/**
 * Validate that an entity can be deactivated (is_active -> false).
 * Checks that no active descendants exist.
 * Returns an error message string if invalid, null if OK.
 */
export async function validateDeactivation(
  entityId: string,
  clientId: string,
): Promise<string | null> {
  // Fetch the entity to get its path
  const entity = await api.get<{ id: string; path: string }>(
    `/api/organizational-entities/${entityId}`
  ).catch(() => null);

  if (!entity) return null; // Can't validate, allow

  // Fetch all entities for this client to check descendants
  const allEntities = await api.get<Array<{ id: string; path: string; is_active: boolean }>>(
    `/api/organizational-entities?client_id=${clientId}`
  ).catch(() => []);

  const prefix = `${entity.path}.`;
  const activeDescendantCount = allEntities.filter(
    e => e.id !== entityId && e.is_active && e.path.startsWith(prefix)
  ).length;

  if (activeDescendantCount > 0) {
    return `Impossible de fermer cette entité : ${activeDescendantCount} descendant(s) actif(s). Fermez d'abord les entités enfants.`;
  }

  return null;
}

/**
 * Validate that an entity can be activated (is_active -> true) or created.
 * Checks that the parent (if any) is active.
 * Returns an error message string if invalid, null if OK.
 */
export async function validateActivation(
  parentId: string | null,
): Promise<string | null> {
  if (!parentId) return null; // No parent = root, always OK

  const parent = await api.get<{ is_active: boolean; name: string }>(
    `/api/organizational-entities/${parentId}`
  ).catch(() => null);

  if (!parent) return null;

  if (!parent.is_active) {
    return `Impossible de réactiver : le parent « ${parent.name} » est inactif. Réactivez d'abord le parent.`;
  }

  return null;
}

/**
 * For import: detect hierarchy anomalies where active children have inactive parents.
 * Works on in-memory data (MappedEntity-like objects).
 */
export interface ImportEntity {
  code: string;
  name: string;
  is_active: boolean;
  parent_code: string | null;
  parent_name: string | null;
}

export function detectHierarchyAnomalies(
  entities: ImportEntity[],
  existingEntities: { code: string | null; name: string; is_active: boolean }[],
): string[] {
  const anomalies: string[] = [];

  // Build lookup maps
  const norm = (s: string) => s.trim().toLowerCase().normalize('NFC');

  const importByCode = new Map<string, ImportEntity>();
  const importByName = new Map<string, ImportEntity>();
  entities.forEach(e => {
    importByCode.set(e.code, e);
    importByName.set(norm(e.name), e);
  });

  const existingByCode = new Map<string, { is_active: boolean; name: string }>();
  const existingByName = new Map<string, { is_active: boolean; name: string }>();
  existingEntities.forEach(e => {
    if (e.code) existingByCode.set(e.code, e);
    existingByName.set(norm(e.name), e);
  });

  for (const entity of entities) {
    if (!entity.is_active) continue; // Only check active entities

    const parentRef = entity.parent_code || entity.parent_name;
    if (!parentRef) continue;

    const normalizedRef = norm(parentRef);

    // Find parent status
    let parentActive: boolean | null = null;
    let parentName = parentRef;

    // Check in import first
    const importParent = importByCode.get(parentRef) || importByName.get(normalizedRef);
    if (importParent) {
      parentActive = importParent.is_active;
      parentName = importParent.name;
    } else {
      // Check in existing DB entities
      const existingParent = existingByCode.get(parentRef) || existingByName.get(normalizedRef);
      if (existingParent) {
        parentActive = existingParent.is_active;
        parentName = existingParent.name;
      }
    }

    if (parentActive === false) {
      anomalies.push(
        `${entity.code} (${entity.name}) : entité active sous le parent inactif « ${parentName} »`
      );
    }
  }

  return anomalies;
}
