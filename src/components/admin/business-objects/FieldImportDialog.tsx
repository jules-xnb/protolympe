import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowRight } from 'lucide-react';
import { useFieldImportWizard } from './field-import/useFieldImportWizard';
import { FieldUploadStep } from './field-import/FieldUploadStep';
import { FieldMappingStep } from './field-import/FieldMappingStep';
import { FieldPreviewStep } from './field-import/FieldPreviewStep';
import type { Step } from './field-import/types';

// ── Main Dialog ──────────────────────────────────────────

interface FieldImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectDefinitionId: string;
  objectName?: string;
  existingFieldCount: number;
  existingFieldNames: string[];
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Fichier' },
  { key: 'mapping', label: 'Mapping' },
  { key: 'preview', label: 'Import' },
];

export function FieldImportDialog({
  open,
  onOpenChange,
  objectDefinitionId,
  objectName,
  existingFieldCount,
  existingFieldNames,
}: FieldImportDialogProps) {
  const wizard = useFieldImportWizard({
    objectDefinitionId,
    objectName,
    existingFieldCount,
    existingFieldNames,
    onClose: () => handleClose(false),
  });

  const handleClose = (open: boolean) => {
    if (!open) wizard.resetState();
    onOpenChange(open);
  };

  const stepIndex = STEPS.findIndex(s => s.key === wizard.step);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[var(--modal-width-lg)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importer des champs</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                  i === stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : i < stepIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              <span className="ml-1.5 text-sm">{s.label}</span>
              {i < STEPS.length - 1 && <ArrowRight className="mx-3 h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {wizard.step === 'upload' && (
            <FieldUploadStep
              onFileSelect={wizard.processFile}
              onDownloadTemplate={wizard.downloadTemplate}
              onDownloadDocPdf={wizard.downloadDocPdf}
            />
          )}

          {wizard.step === 'mapping' && (
            <FieldMappingStep
              csvHeaders={wizard.csvHeaders}
              csvData={wizard.csvData}
              mapping={wizard.mapping}
              allFields={wizard.allFields}
              usedDbFields={wizard.usedDbFields}
              canProceedToPreview={wizard.canProceedToPreview}
              onMappingChange={wizard.handleMappingChange}
              onBack={wizard.resetState}
              onNext={() => wizard.setStep('preview')}
            />
          )}

          {wizard.step === 'preview' && (
            <FieldPreviewStep
              previewFields={wizard.previewFields}
              previewErrors={wizard.previewErrors}
              hasErrors={wizard.hasErrors}
              isImporting={wizard.isImporting}
              importProgress={wizard.importProgress}
              onBack={() => wizard.setStep('mapping')}
              onImport={wizard.handleImport}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
