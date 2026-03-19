/**
 * Utility functions for generating unique slugs
 */

/**
 * Generates a base slug from a given text
 */
export function generateBaseSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates a unique slug by appending a short random suffix
 * This ensures uniqueness even when items have the same name
 */
export function generateUniqueSlug(text: string): string {
  const baseSlug = generateBaseSlug(text);
  const suffix = generateShortId();
  return `${baseSlug}-${suffix}`;
}

/**
 * Generates a short random ID (6 characters)
 */
export function generateShortId(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a unique code for organizational entities
 * Format: EO-XXXXXX (uppercase letters and numbers)
 */
export function generateEntityCode(): string {
  return `EO-${generateShortId(6)}`;
}