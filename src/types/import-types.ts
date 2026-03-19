// Shared import types used by both src/lib/ and src/components/
// Extracted from src/components/admin/import/types.ts to fix architecture inversion.

export interface FieldMapping {
  [csvColumn: string]: string; // csvColumn → fieldId
}

export interface ParsedRow {
  [key: string]: string;
}

export interface ParsedCSV {
  headers: string[];
  rows: ParsedRow[];
}

export interface PreviewRow {
  data: Record<string, string>;
  hasError: boolean;
  errorMessage?: string;
  groupKey?: string;
}

export interface ImportProgress {
  current: number;
  total: number;
}

export interface ImportResultRow {
  label: string;
  status: 'success' | 'error';
  error?: string;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  /** Optional detail rows for the post-import report */
  details?: ImportResultRow[];
}

/** Invert a FieldMapping: fieldId → csvColumn */
export function reverseMapping(mapping: FieldMapping): Record<string, string> {
  const r: Record<string, string> = {};
  for (const [csv, field] of Object.entries(mapping)) r[field] = csv;
  return r;
}
