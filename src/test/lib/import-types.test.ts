import { describe, it, expect } from 'vitest';
import { reverseMapping } from '@/components/admin/import/types';

describe('reverseMapping', () => {
  it('should invert a simple mapping', () => {
    const mapping = { 'CSV Name': 'name', 'CSV Age': 'age' };
    const result = reverseMapping(mapping);
    expect(result).toEqual({ name: 'CSV Name', age: 'CSV Age' });
  });

  it('should return empty object for empty mapping', () => {
    expect(reverseMapping({})).toEqual({});
  });

  it('should handle multiple mappings', () => {
    const mapping = {
      'Nom': 'last_name',
      'Prénom': 'first_name',
      'Email': 'email',
      'Téléphone': 'phone',
    };
    const result = reverseMapping(mapping);
    expect(result).toEqual({
      last_name: 'Nom',
      first_name: 'Prénom',
      email: 'Email',
      phone: 'Téléphone',
    });
  });

  it('should let last value win if two CSV columns map to same field', () => {
    // Object.entries iterates in insertion order, so 'Col B' overwrites 'Col A'
    const mapping = { 'Col A': 'name', 'Col B': 'name' };
    const result = reverseMapping(mapping);
    expect(result).toEqual({ name: 'Col B' });
  });
});
