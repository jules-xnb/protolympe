/** Generic JSON type (replaces Supabase Json) */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Generic table row type helper.
 * Usage: Tables<'clients'> — but since we no longer have generated types,
 * use explicit interfaces instead. This is kept for backward compatibility
 * during migration.
 */
export type Tables<T extends string> = Record<string, unknown> & { id: string };

/** Generic insert type */
export type TablesInsert<T extends string> = Record<string, unknown>;

/** Generic update type */
export type TablesUpdate<T extends string> = Record<string, unknown>;

/** Database type (legacy, unused at runtime) */
export type Database = Record<string, unknown>;
