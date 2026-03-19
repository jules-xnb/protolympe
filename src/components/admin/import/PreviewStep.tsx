import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import type { PreviewRow, ImportProgress } from './types';

interface PreviewStepProps {
  rows: PreviewRow[];
  isImporting: boolean;
  importProgress: ImportProgress;
  onImport: () => void;
  onBack: () => void;
  renderPreview: (rows: PreviewRow[], errors: string[], onCancel?: () => void) => React.ReactNode;
  hideDefaultStats?: boolean;
}

export function PreviewStep({
  rows,
  isImporting,
  importProgress,
  onImport,
  onBack,
  renderPreview,
  hideDefaultStats = false,
}: PreviewStepProps) {
  const stats = useMemo(() => {
    const total = rows.length;
    const errors = rows.filter(r => r.hasError).length;
    const valid = total - errors;
    return { total, errors, valid };
  }, [rows]);

  const previewErrors = useMemo(() => {
    return rows
      .filter(r => r.hasError && r.errorMessage)
      .map(r => r.errorMessage!);
  }, [rows]);

  const hasErrors = stats.errors > 0;
  const progressPercent = importProgress.total > 0
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">

      {/* Stats cards */}
      {!hideDefaultStats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Valides
            </div>
            <div className="text-2xl font-bold text-success">{stats.valid}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              Erreurs
            </div>
            <div className="text-2xl font-bold text-destructive">{stats.errors}</div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {hasErrors && !isImporting && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreurs détectées</AlertTitle>
          <AlertDescription>
            {stats.errors} ligne(s) contiennent des erreurs et seront ignorées lors de l'import.
          </AlertDescription>
        </Alert>
      )}

      {/* Import progress */}
      {isImporting && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              Import en cours... {importProgress.current}/{importProgress.total}
            </span>
          </div>
          <Progress value={progressPercent} />
        </div>
      )}

      {/* Custom preview content */}
      {renderPreview(rows, previewErrors, isImporting ? undefined : onBack)}

      {/* Import button */}
      {!isImporting && (
        <div className="flex justify-end">
          <Button
            onClick={onImport}
            disabled={stats.valid === 0 || hasErrors}
          >
            Importer {stats.valid} élément(s)
          </Button>
        </div>
      )}
    </div>
  );
}
