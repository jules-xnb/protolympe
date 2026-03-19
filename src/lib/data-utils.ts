/**
 * Builds a Map keyed by a string extracted from each item.
 * Defaults to using `item.id` as the key.
 */
export function buildLookupMap<T extends { id: string }>(
  data: T[],
  keyFn: (item: T) => string = (item) => item.id
): Map<string, T> {
  return new Map(data.map(item => [keyFn(item), item]));
}
