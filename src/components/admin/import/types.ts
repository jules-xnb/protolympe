import type { ReactNode } from 'react';

// Re-export shared types from canonical location for backward compatibility
export {
  type FieldMapping,
  type ParsedRow,
  type ParsedCSV,
  type PreviewRow,
  type ImportProgress,
  type ImportResult,
  reverseMapping,
} from '@/types/import-types';

// Import types needed for local interfaces
import type { FieldMapping, ParsedRow, PreviewRow, ImportProgress, ImportResult } from '@/types/import-types';

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'done';

export interface ImportFieldDefinition {
  id: string;
  label: string;
  required: boolean;
}

export interface ImportWizardConfig {
  /** Page title displayed in the header */
  title: string;
  /** Back navigation path */
  backPath: string;
  /** Field definitions for the mapping step */
  fields: ImportFieldDefinition[];
  /** Generate template CSV content for download */
  templateContent?: () => string;
  /** Template file name for the download */
  templateFileName?: string;
  /** Auto-mapping: attempt to match CSV headers to field IDs */
  autoMap?: (headers: string[]) => FieldMapping;
  /** Check if all required fields are mapped */
  canProceed?: (mapping: FieldMapping, fields: ImportFieldDefinition[]) => boolean;
  /** Transform parsed+mapped rows into preview rows */
  buildPreview: (rows: ParsedRow[], mapping: FieldMapping) => PreviewRow[];
  /** Execute the import */
  onImport: (
    rows: ParsedRow[],
    mapping: FieldMapping,
    onProgress: (progress: ImportProgress) => void,
  ) => Promise<ImportResult>;
  /** Render custom preview content */
  renderPreview: (rows: PreviewRow[], previewErrors: string[], onCancel?: () => void) => ReactNode;
  /** Optional: render extra content below the upload drop zone */
  renderUploadExtra?: () => ReactNode;
  /** Optional: hide the default stats grid in the preview step */
  hideDefaultStats?: boolean;
  /** Optional: callback after successful import */
  onImportComplete?: (result: ImportResult) => void;
  /** Label for the back button on the done step (default: 'Retour') */
  backLabel?: string;
}
