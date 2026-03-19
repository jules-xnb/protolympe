import { api } from '@/lib/api-client';

/**
 * Resolves a list of profile EOs into the full set of visible EO IDs,
 * expanding descendants only for EOs with include_descendants = true.
 *
 * Uses targeted path-prefix queries via the API.
 */
export async function resolveEoIdsWithDescendants(
  rawEos: Array<{ eo_id: string; include_descendants: boolean }>
): Promise<string[]> {
  if (rawEos.length === 0) return [];

  const directIds = rawEos.map(e => e.eo_id);
  const idsWithDescendants = rawEos.filter(e => e.include_descendants).map(e => e.eo_id);

  // No descendants needed — return direct IDs only
  if (idsWithDescendants.length === 0) return directIds;

  // Fetch the parent EOs to get their paths
  const parentEos = await Promise.all(
    idsWithDescendants.map(id =>
      api.get<{ id: string; path: string }>(`/api/organizational-entities/${id}`)
    )
  );

  if (!parentEos || parentEos.length === 0) return directIds;

  // For each parent, we need to find descendants. We can fetch all entities
  // for the same client and filter by path prefix client-side.
  // First get client_id from one of the parent entities
  const firstParent = await api.get<{ id: string; path: string; client_id: string }>(
    `/api/organizational-entities/${idsWithDescendants[0]}`
  );

  if (!firstParent?.client_id) return directIds;

  const allEntities = await api.get<Array<{ id: string; path: string }>>(
    `/api/organizational-entities?client_id=${firstParent.client_id}`
  );

  const descendantIds: string[] = [];
  for (const parent of parentEos) {
    const prefix = `${parent.path}.`;
    for (const entity of allEntities) {
      if (entity.path.startsWith(prefix)) {
        descendantIds.push(entity.id);
      }
    }
  }

  return [...new Set([...directIds, ...descendantIds])];
}
