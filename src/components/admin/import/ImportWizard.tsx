import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ChevronLeft, RotateCcw, Download } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { UploadStep } from './UploadStep';
import { MappingStep } from './MappingStep';
import { PreviewStep } from './PreviewStep';
import type {
  ImportStep,
  ImportWizardConfig,
  FieldMapping,
  ParsedRow,
  PreviewRow,
  ImportProgress,
  ImportResult,
  ParsedCSV,
} from './types';

function generateReportCsvUrl(result: ImportResult): string {
  if (!result.details?.length) return '#';
  const BOM = '\uFEFF';
  const header = 'Élément;Statut;Erreur';
  const rows = result.details.map(d =>
    `${d.label.replace(/;/g, ',')};${d.status === 'success' ? 'OK' : 'ERREUR'};${(d.error || '').replace(/;/g, ',')}`
  );
  const content = BOM + [header, ...rows].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  return URL.createObjectURL(blob);
}

interface ImportWizardProps {
  config: ImportWizardConfig;
}

export function ImportWizard({ config }: ImportWizardProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileLoaded = useCallback((parsed: ParsedCSV) => {
    setCsvHeaders(parsed.headers);
    setCsvData(parsed.rows);

    // Auto-map if provided
    const autoMapping = config.autoMap?.(parsed.headers) || {};
    setMapping(autoMapping);
    setStep('mapping');
  }, [config]);

  const canProceed = useMemo(() => {
    if (config.canProceed) {
      return config.canProceed(mapping, config.fields);
    }
    // Default: all required fields must be mapped
    const mappedFields = new Set(Object.values(mapping));
    return config.fields
      .filter(f => f.required)
      .every(f => mappedFields.has(f.id));
  }, [mapping, config]);

  const handleGoToPreview = useCallback(() => {
    const rows = config.buildPreview(csvData, mapping);
    setPreviewRows(rows);
    setStep('preview');
  }, [csvData, mapping, config]);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setStep('importing');
    setImportProgress({ current: 0, total: 0 });

    try {
      const result = await config.onImport(csvData, mapping, setImportProgress);
      setImportResult(result);
      setStep('done');
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({ successCount: 0, errorCount: -1 });
      setStep('done');
    } finally {
      setIsImporting(false);
    }
  }, [csvData, mapping, config]);

  const handleReset = useCallback(() => {
    setCsvData([]);
    setCsvHeaders([]);
    setMapping({});
    setPreviewRows([]);
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
    setImportResult(null);
    setStep('upload');
  }, []);

  const templateContent = config.templateContent;
  const templateFileName = config.templateFileName;

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        backAction={{ onClick: () => navigate(config.backPath) }}
      />
      <Separator />

      {step === 'upload' && (
        <UploadStep
          onFileLoaded={handleFileLoaded}
          templateContent={templateContent}
          templateFileName={templateFileName}
          renderExtra={config.renderUploadExtra}
        />
      )}

      {step === 'mapping' && (
        <MappingStep
          csvHeaders={csvHeaders}
          csvData={csvData}
          fields={config.fields}
          mapping={mapping}
          onMappingChange={setMapping}
          onBack={handleReset}
          onNext={handleGoToPreview}
          canProceed={canProceed}
        />
      )}

      {(step === 'preview' || step === 'importing') && (
        <PreviewStep
          rows={previewRows}
          isImporting={isImporting}
          importProgress={importProgress}
          onImport={handleImport}
          onBack={() => setStep('mapping')}
          renderPreview={config.renderPreview}
          hideDefaultStats={config.hideDefaultStats}
        />
      )}

      {step === 'done' && importResult && (
        <div className="space-y-4">
          <Alert variant="empty" className="flex flex-col items-center justify-center text-center gap-4 py-12">
            {importResult.errorCount === -1 ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            ) : importResult.errorCount > 0 ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-500/10">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            )}

            <div className="space-y-2">
              <AlertTitle className="text-xl font-semibold">
                {importResult.errorCount === -1 ? "Erreur lors de l'import" : 'Import terminé'}
              </AlertTitle>
              <AlertDescription>
                {importResult.errorCount === -1 ? (
                  <span className="text-muted-foreground">Une erreur inattendue s'est produite.</span>
                ) : (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium">{importResult.successCount} élément{importResult.successCount > 1 ? 's' : ''}</span> importé{importResult.successCount > 1 ? 's' : ''} avec succès !
                    </p>
                    {importResult.errorCount > 0 && (
                      <p className="text-warning font-medium">{importResult.errorCount} erreur(s)</p>
                    )}
                    <p>Vous pouvez maintenant télécharger le rapport d'import, importer à nouveau une liste ou revenir à la page liste.</p>
                  </div>
                )}
              </AlertDescription>
            </div>

            {importResult.details && importResult.details.length > 0 && (
              <a
                href={generateReportCsvUrl(importResult)}
                download={`rapport_import_${new Date().toISOString().slice(0, 10)}.csv`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Télécharger le rapport <Download className="h-4 w-4" />
              </a>
            )}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate(config.backPath)}>
                <ChevronLeft className="h-4 w-4" /> {config.backLabel ?? 'Retour'}
              </Button>
              <Button variant="default" size="default" onClick={handleReset}>
                Nouvel import <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </Alert>

          {/* Error details */}
          {importResult.details && importResult.details.some(d => d.status === 'error') && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-2">
                <span className="font-semibold text-destructive">Détail des erreurs</span>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1">
                    {importResult.details.filter(d => d.status === 'error').map((d, idx) => (
                      <p key={idx} className="text-sm text-destructive">
                        <span className="font-medium">{d.label}</span>
                        {d.error && <span className="text-muted-foreground"> — {d.error}</span>}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
