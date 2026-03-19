import { Loader2 } from 'lucide-react';

interface EoImportProgressProps {
  importProgress: { current: number; total: number };
}

export function EoImportProgress({ importProgress }: EoImportProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h3 className="text-lg font-medium mb-2">Import en cours...</h3>
      <p className="text-sm text-muted-foreground">
        {importProgress.current} / {importProgress.total} entités traitées
      </p>
      <div className="w-64 h-2 bg-muted rounded-full mt-4 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
