import { useMemo } from 'react';
import { EoMappingStep } from './EoMappingStep';
import { computeValidationResults, computeTotalValidationErrors } from '@/lib/eo/eo-import-logic';
import type { ParsedRow, FieldOption } from './types';

interface EoImportValidationProps {
  clientId: string;
  csvHeaders: string[];
  csvData: ParsedRow[];
  mapping: Record<string, string>;
  allFields: FieldOption[];
  usedDbFields: Set<string>;
  showFieldForm: boolean;
  onShowFieldFormChange: (show: boolean) => void;
  onMappingChange: (csvColumn: string, dbField: string) => void;
}

export function EoImportValidation({
  clientId,
  csvHeaders,
  csvData,
  mapping,
  allFields,
  usedDbFields,
  showFieldForm,
  onShowFieldFormChange,
  onMappingChange,
}: EoImportValidationProps) {
  const validationResults = useMemo(
    () => computeValidationResults(mapping, csvData, allFields),
    [mapping, csvData, allFields],
  );

  const totalValidationErrors = useMemo(
    () => computeTotalValidationErrors(validationResults),
    [validationResults],
  );

  return (
    <EoMappingStep
      clientId={clientId}
      csvHeaders={csvHeaders}
      csvData={csvData}
      mapping={mapping}
      allFields={allFields}
      usedDbFields={usedDbFields}
      validationResults={validationResults}
      totalValidationErrors={totalValidationErrors}
      showFieldForm={showFieldForm}
      onShowFieldFormChange={onShowFieldFormChange}
      onMappingChange={onMappingChange}
    />
  );
}
