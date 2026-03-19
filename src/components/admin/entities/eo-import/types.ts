// Re-export shared types from canonical location for backward compatibility
export {
  type ParsedRow,
  type MappedEntity,
  type FieldOption,
  DB_FIELDS,
} from '@/types/eo-import-types';

export type Step = 'upload' | 'mapping' | 'preview' | 'importing';
