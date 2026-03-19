import * as XLSX from 'xlsx';
import type { ParsedCSV } from '@/types/import-types';

/**
 * Parse an XLSX/XLS file from an ArrayBuffer into the same ParsedCSV format.
 */
export function parseXLSX(data: ArrayBuffer): ParsedCSV {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });
  if (json.length < 2) return { headers: [], rows: [] };
  const headers = json[0].map(h => String(h).trim());
  const rows = json.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = String(row[i] ?? '').trim(); });
      return obj;
    });
  return { headers, rows };
}

/**
 * Parse CSV text with auto-detection of separator (`;` or `,`).
 * Handles basic quoted fields. Lines are split by newline.
 */
export function parseCSV(text: string): ParsedCSV {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };

  // Detect separator: use the one that appears more in the header line
  const semicolonCount = (lines[0].match(/;/g) || []).length;
  const commaCount = (lines[0].match(/,/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';

  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Generate a CSV template string from field definitions.
 */
export function generateTemplate(
  fields: { id: string; label: string }[],
  separator = ';',
): string {
  return fields.map(f => f.label).join(separator) + '\n';
}

/**
 * Generate a slug from a name (French-friendly).
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/**
 * Generate a unique slug by appending a random 4-char lowercase suffix.
 * Useful for field definitions where slugs must be unique.
 */
export function generateUniqueFieldSlug(name: string): string {
  const base = generateSlug(name);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  return `${base}_${suffix}`;
}

/**
 * Parse a boolean value from French/English strings.
 */
export function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return ['oui', 'yes', 'true', '1', 'vrai'].includes(normalized);
}
