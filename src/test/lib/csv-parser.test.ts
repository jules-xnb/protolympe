import { describe, it, expect } from 'vitest';
import { parseCSV, generateSlug, parseBoolean } from '@/lib/csv-parser';

// ── parseCSV ────────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('should parse semicolon-separated CSV correctly', () => {
    const csv = 'name;age;city\nAlice;30;Paris\nBob;25;Lyon';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['name', 'age', 'city']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30', city: 'Paris' });
    expect(result.rows[1]).toEqual({ name: 'Bob', age: '25', city: 'Lyon' });
  });

  it('should parse comma-separated CSV correctly', () => {
    const csv = 'name,age,city\nAlice,30,Paris\nBob,25,Lyon';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['name', 'age', 'city']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30', city: 'Paris' });
  });

  it('should auto-detect separator (more semicolons = use semicolons)', () => {
    // Header has 2 semicolons and 0 commas → semicolon wins
    const csv = 'a;b;c\n1;2;3';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['a', 'b', 'c']);
    expect(result.rows[0]).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('should fall back to comma when semicolons are fewer or equal', () => {
    // Header has 1 semicolon, 2 commas → comma wins
    const csv = 'a,b;c,d\n1,2;3,4';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['a', 'b;c', 'd']);
  });

  it('should return empty arrays for files with fewer than 2 lines', () => {
    expect(parseCSV('')).toEqual({ headers: [], rows: [] });
    expect(parseCSV('header_only')).toEqual({ headers: [], rows: [] });
  });

  it('should strip BOM characters from headers', () => {
    const csv = '\uFEFFname;age\nAlice;30';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30' });
  });

  it('should handle quoted fields (strips surrounding quotes)', () => {
    const csv = '"name";"age"\n"Alice";"30"';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30' });
  });

  it('should skip empty lines', () => {
    const csv = 'name;age\nAlice;30\n\n\nBob;25\n';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30' });
    expect(result.rows[1]).toEqual({ name: 'Bob', age: '25' });
  });
});

// ── generateSlug ────────────────────────────────────────────────────────────

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('Hello World')).toBe('hello_world');
  });

  it('should replace French accented characters', () => {
    expect(generateSlug('éèêà')).toBe('eeea');
    expect(generateSlug('çùô')).toBe('cuo');
  });

  it('should replace non-alphanumeric sequences with underscores', () => {
    expect(generateSlug('hello world!')).toBe('hello_world');
    expect(generateSlug('a---b***c')).toBe('a_b_c');
  });

  it('should strip leading and trailing underscores', () => {
    expect(generateSlug('  hello  ')).toBe('hello');
    expect(generateSlug('---test---')).toBe('test');
  });

  it('should handle a realistic French label', () => {
    expect(generateSlug('Référence Employé')).toBe('reference_employe');
  });
});

// ── parseBoolean ────────────────────────────────────────────────────────────

describe('parseBoolean', () => {
  it('should return true for oui, yes, true, 1, vrai', () => {
    expect(parseBoolean('oui')).toBe(true);
    expect(parseBoolean('yes')).toBe(true);
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('vrai')).toBe(true);
  });

  it('should return false for non, no, false, 0, and anything else', () => {
    expect(parseBoolean('non')).toBe(false);
    expect(parseBoolean('no')).toBe(false);
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('0')).toBe(false);
    expect(parseBoolean('random')).toBe(false);
    expect(parseBoolean('')).toBe(false);
  });

  it('should be case-insensitive', () => {
    expect(parseBoolean('OUI')).toBe(true);
    expect(parseBoolean('Vrai')).toBe(true);
    expect(parseBoolean('YES')).toBe(true);
    expect(parseBoolean('True')).toBe(true);
  });

  it('should trim whitespace', () => {
    expect(parseBoolean('  oui  ')).toBe(true);
    expect(parseBoolean('  non  ')).toBe(false);
    expect(parseBoolean(' 1 ')).toBe(true);
  });
});
