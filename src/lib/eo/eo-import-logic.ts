// Barrel file — re-exports all eo-import sub-modules for backward compatibility.

export { validateFieldValue, computeValidationResults, computeTotalValidationErrors } from './eo-import-validation';
export type { ValidationResultEntry } from './eo-import-validation';

export { detectParentReferenceType, autoSuggestMapping, applyMappingChange, buildAllFields } from './eo-import-mapping';

export { buildEntityTree, flattenEntityTree, countAllEntities, collectAllParentCodes } from './eo-import-tree';

// parseCSV and generateSlug are re-exported from @/lib/csv-parser
export { parseCSV, generateSlug } from '@/lib/csv-parser';
